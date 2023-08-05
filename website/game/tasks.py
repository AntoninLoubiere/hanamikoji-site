import asyncio
from asyncio.subprocess import PIPE, STDOUT
from multiprocessing import current_process
import os
from pathlib import Path
from random import shuffle
import re
import subprocess
import shutil
import tempfile
from django_q.tasks import Task, async_task

from website.settings import ISOLATE_TIMEOUT, MATCH_RULES, MATCH_SERVER_TIMEOUT, SERVER_TIMEOUT, MEDIA_ROOT, STECHEC_CLIENT, STECHEC_SERVER, MAX_ISOLATE, BASE_DIR
from .models import Champion, Inscrit, Match, Tournoi


PATH_BUILD_DIR = Path('/var/www/hanamikoji/build_champion')
PATH_BUILD_DIR.mkdir(exist_ok=True, parents=True)
MAKEFILES = (BASE_DIR / 'game' / 'makefiles').absolute()
INTERFACES = (BASE_DIR / 'game' / 'interface').absolute()
INTERFACE_FILE = 'interface.cc'

MATCH_OUT_DIR = (MEDIA_ROOT / 'match').absolute()
MATCH_OUT_DIR.mkdir(parents=True, exist_ok=True)

FILE_EXT_MAPPERS = {
    '.py': 'python',
    '.ml': 'caml',
    '.c': 'c',
    '.cc': 'cxx',
    '.cpp': 'cxx'
}

LANGS = set(['python', 'c', 'cxx', 'caml'])

IDS = set(range(1000))
RE_MATCH_GAGNANT = re.compile('gagnant: (.*)')
RE_MATCH_SCORE = re.compile('score: (.*)')
MAX_ISOLATE_HALF = MAX_ISOLATE // 2
MAX_ISOLATE_TRY = 10

def get_build_dir(champion: Champion):
    return (PATH_BUILD_DIR / champion.code.name).with_suffix('')

def get_match_dir(match: Match):
    return MATCH_OUT_DIR / str(match.id_match)


def compile_champion(champion: Champion):
    champion.compilation_status = champion.Status.EN_COURS
    champion.save(compile=False)

    out_dir = get_build_dir(champion)
    out_dir.mkdir(exist_ok=True)

    # On vérifie déjà si c'est une archive
    if champion.code.name.endswith('.zip'):
        subprocess.run(['unzip', '-j', '-o', champion.code.path, '-d', out_dir])
    elif champion.code.name.endswith('.tar.gz') or champion.code.name.endswith('.tgz'):
        subprocess.run(['tar', '-xf', champion.code.path, '-C', out_dir])
    else:
        # On copie le fichier
        shutil.copy((champion.code.path), out_dir)

    # On détecte maintenant la langue

    lang = None
    lang_file = out_dir / '_lang'
    if lang_file.exists():
        with open(lang_file, 'r') as fir:
            content = fir.read(50).strip()
            if content in LANGS:
                lang = content

    if lang is None:
        for f in out_dir.iterdir():
            if f.name != 'interface' and f.suffix in FILE_EXT_MAPPERS:
                lang = FILE_EXT_MAPPERS[f.suffix]
                break

    print("Langage détecté :", lang)

    if lang not in LANGS:
        raise Exception(f'Impossible de détecter le langage utilisé ({lang}), veuillez ajouter un'
                        f'fichier _lang avec le nom du language, seuls {LANGS} sont supportés.')

    # On copie l'interface.cc au besoin
    if not (out_dir / INTERFACE_FILE).exists():
        print("Copy interface")
        shutil.copy(INTERFACES / f'interface-{lang}.cc', out_dir / INTERFACE_FILE)

    # On compile

    r = subprocess.run(['make', f'--makefile={MAKEFILES / ("Makefile-" + lang)}', '-C', out_dir,
                    'STECHEC_SERVER=true', 'champion.so', 'clean'], stdout=PIPE, stderr=PIPE)

    return f"Langue détecté: {lang}\n\n# Stdout: \n{r.stdout.decode()}\n# Stderr: \n{r.stderr.decode()}"



def on_end_compilation(task: Task):
    c: Champion = task.args[0]
    c.compilation_status = Champion.Status.FINI if task.success else Champion.Status.ERREUR
    c.compile_task = task
    c.save(compile=False)

def run_match(match: Match):
    match.status = Match.Status.EN_COURS
    match.save(run=False)
    match_dir = get_match_dir(match)
    server_out = asyncio.run(run_match_async(
        match_dir,
        (match.champion1.nom, get_build_dir(match.champion1)),
        (match.champion2.nom, get_build_dir(match.champion2))
    ))
    server_out = server_out.decode()
    gagnant = RE_MATCH_GAGNANT.findall(server_out)
    if len(gagnant) == 1:
        if gagnant[0].lower() == "joueur1":
            match.gagnant = Match.Gagnant.CHAMPION_1
        elif gagnant[0].lower() == "joueur2":
            match.gagnant = Match.Gagnant.CHAMPION_2
        else:
            match.gagnant = Match.Gagnant.EGALITE
    else:
        print("Impossible de trouver le gagnant ?")

    score = RE_MATCH_SCORE.findall(server_out)
    if len(score) == 2:
        match.score1 = int(score[0])
        match.score2 = int(score[1])
    else:
        print("Impossible de trouver le score ?")

    return server_out


async def run_match_async(match_dir: Path, client1, client2):
    # On crée une map aléatoire
    match_dir.mkdir(exist_ok=True)

    client1_name, client1_dir = client1
    client2_name, client2_dir = client2

    map_file = match_dir / 'map.txt'
    if map_file.exists():
        print("Réutilisation de la map précédente")
    else:
        print("Génération de la map")
        with open(map_file, 'w') as fiw:
            cards = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6]
            for _ in range(3):
                shuffle(cards)
                fiw.write(" ".join(map(str, cards)) + "\n")

    # Lancement du match
    # Build the domain sockets
    socket_dir = tempfile.TemporaryDirectory(prefix='match-')
    os.chmod(socket_dir.name, 0o777)
    f_reqrep = socket_dir.name + '/' + 'reqrep'
    f_pubsub = socket_dir.name + '/' + 'pubsub'
    s_reqrep = 'ipc://' + f_reqrep
    s_pubsub = 'ipc://' + f_pubsub

    server_task = await run_server(match_dir, s_reqrep, s_pubsub)

    # On initialise les boite isolate
    box_id_0 = isolate_init(0)
    box_id_1 = isolate_init(1)

    client_1 = await run_client(match_dir, client1_name, client1_dir, s_reqrep, s_pubsub, 0, box_id_0)
    client_2 = await run_client(match_dir, client2_name, client2_dir, s_reqrep, s_pubsub, 1, box_id_1)

    server_out, _ = await server_task.communicate()
    client1_out, _ = await client_1.communicate()
    client2_out, _ = await client_2.communicate()
    try:
        with open(match_dir / 'champion1.out.txt', 'wb') as fiw:
            fiw.write(client1_out)
        with open(match_dir / 'champion2.out.txt', 'wb') as fiw:
            fiw.write(client2_out)
    finally:
        isolate_cleanup(box_id_0)
        isolate_cleanup(box_id_1)

    return server_out


def isolate_init(client_id):
    box_id = 2 * (current_process().pid % MAX_ISOLATE_HALF) + client_id
    tries = 0
    while True:
        r = subprocess.run(['isolate', '--init', '--box-id', str(box_id)], stderr=PIPE)
        if r.returncode == 2 and 'Box already exists' in r.stderr:
            tries += 1
            if tries >= MAX_ISOLATE_TRY:
                raise Exception("Impossible to find free box")
            box_id = (box_id + 2) % MAX_ISOLATE
        break
    return box_id

def isolate_cleanup(box_id):
    subprocess.run(['isolate', '--cleanup', '--box-id', str(box_id)])


async def run_server(match_dir, rep_addr, pub_addr):
    return await asyncio.create_subprocess_exec(
        STECHEC_SERVER,
        '--rules', MATCH_RULES,
        '--time', str(MATCH_SERVER_TIMEOUT),
        '--rep_addr', rep_addr,
        '--pub_addr', pub_addr,
        '--nb_clients', '2',
        '--socket_timeout', '45000',
        '--dump', str(match_dir / 'dump.json'),
        '--map', str(match_dir / 'map.txt'),
        '--verbose', '1',
        stdout=PIPE,
        stderr=STDOUT
    )

async def run_client(match_dir, champion_name, champion_path: Path, req_addr, sub_addr, client_id, box_id):
    return await asyncio.create_subprocess_exec(
        'isolate',
        '--time', str(ISOLATE_TIMEOUT),
        f'--dir=match={match_dir}',
        f'--dir=champion={champion_path}',
        '--dir=/tmp',
        '--box-id', str(box_id),
        '--stderr-to-stdout',
        '-p',
        '-c', '/champion/',
        '--run', '--', STECHEC_CLIENT,
        '--name', f'{champion_name}-{client_id + 1}',
        '--rules', MATCH_RULES,
        '--time', str(SERVER_TIMEOUT),
        '--champion', '/champion/champion.so',
        '--req_addr', req_addr,
        '--sub_addr', sub_addr,
        '--socket_timeout', '45000',
        '--verbose', '1',
        '--client-id', str(client_id),
        '--map', '/match/map.txt',
        stdout=PIPE
    )


def on_end_match(task: Task):
    m: Match = task.args[0]
    m.status = Match.Status.FINI if task.success else Match.Status.ERREUR
    m.match_task = task
    m.save(run=False)

def on_end_tournoi(t: Tournoi):
    print(f"Fin du tournoi {t}")
    matchs = Match.objects.filter(tournoi=t)
    inscrits = list(Inscrit.objects.filter(tournoi=t))

    for i in inscrits:
        i.nb_points = 0
        i.defaites = 0
        i.victoires = 0
        i.egalites = 0

    reverse_inscrits = {i.champion.pk: i for i in inscrits}
    for m in matchs:
        i1 = reverse_inscrits[m.champion1.pk]
        i2 = reverse_inscrits[m.champion2.pk]

        i1.nb_points += m.score1
        i2.nb_points += m.score2

        if m.gagnant == Match.Gagnant.CHAMPION_1:
            i1.victoires += 1
            i2.defaites += 1
        elif m.gagnant == Match.Gagnant.CHAMPION_2:
            i1.defaites += 1
            i2.victoires += 1
        else:
            i1.egalites += 1
            i2.egalites += 1

    classement = sorted(inscrits, key=lambda i: (i.victoires_score(), i.nb_points), reverse=True)
    last_classement = 1
    for (idx, i) in enumerate(classement):
        if idx == 0 or i.victoires_score() != classement[idx - 1].victoires_score() or i.nb_points != classement[idx - 1].nb_points:
            last_classement = idx + 1
        i.classement = last_classement

    Inscrit.objects.bulk_update(inscrits, ['classement', 'nb_points', 'victoires', 'defaites', 'egalites'])
    t.status = Tournoi.Status.FINI
    t.save()

def launch_tournoi(tournoi_id: str):
    tournoi = Tournoi.objects.get(id_tournoi=int(tournoi_id))
    inscrits = Inscrit.objects.filter(tournoi=tournoi)
    nb = inscrits.count()
    matchs = []
    for _ in range(tournoi.nb_matchs // 2):
        for i in range(nb):
            for j in range(i + 1, nb):
                ins1 = inscrits[i]
                ins2 = inscrits[j]
                matchs.append(Match(champion1=ins1.champion, champion2=ins2.champion, tournoi=tournoi))
                matchs.append(Match(champion1=ins2.champion, champion2=ins1.champion, tournoi=tournoi))


    tournoi.status = Tournoi.Status.EN_COURS
    tournoi.nb_matchs_done = 0
    tournoi.nb_matchs = len(matchs)
    tournoi.save()

    champions_update = []
    for i in inscrits:
        if i.champion.supprimer:
            i.champion.supprimer = False
            champions_update.append(i.champion)
    Champion.objects.bulk_update(champions_update, ['supprimer'])


    Match.objects.bulk_create(matchs)
    for m in matchs:
        async_task('game.tasks.run_match', m, hook='game.tasks.on_end_match', group=f"tournoi-{tournoi.id_tournoi}")
