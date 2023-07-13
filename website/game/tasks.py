import asyncio
from asyncio.subprocess import PIPE
import os
from pathlib import Path
from random import shuffle
import re
import subprocess
import shutil
import tempfile
from django_q.tasks import Task

from website.settings import MATCH_RULES, MATCH_SERVER_TIMEOUT, MATCH_TIMEOUT, MEDIA_ROOT, STECHEC_CLIENT, STECHEC_SERVER
from .models import Champion, Match

PATH_BUILD_DIR = Path('build').absolute()
PATH_BUILD_DIR.mkdir(exist_ok=True)
MAKEFILES = (Path('game') / 'makefiles').absolute()
INTERFACES = (Path('game') / 'interface').absolute()
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
RE_MATCH_GAGNANT = re.compile('gagnant: (.*)', re.NOFLAG)
RE_MATCH_SCORE = re.compile('score: (.*)', re.NOFLAG)

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
        subprocess.run(['unzip', '-f', champion.code.path, '-d', out_dir])
    elif champion.code.name.endswith('.tar.gz') or champion.code.name.endswith('.tgz'):
        subprocess.run(['tar', '-xf', champion.code.path, '-C', out_dir])
    else:
        # On copie le fichier
        shutil.copy((champion.code.path), out_dir)

    # On détecte maintenant la langue

    lang = None
    if (lang_file := out_dir / '_lang').exists():
        with open(lang_file, 'r') as fir:
            content = fir.read(50)
            if (c := content.strip()) in LANGS:
                lang = c

    if lang is None:
        for f in out_dir.iterdir():
            if f.name != 'interface' and f.suffix in FILE_EXT_MAPPERS:
                lang = FILE_EXT_MAPPERS[f.suffix]
                break

    print("Langage détecté :", lang)

    if lang not in LANGS:
        raise Exception(f'Impossible de détecter le langage utilisé ({lang}), veuillez ajouter un'
                         'fichier _lang avec le nom du language, seuls {LANGS} sont supportés.')

    # On copie l'interface.cc au besoin
    if not (out_dir / INTERFACE_FILE).exists():
        print("Copy interface")
        shutil.copy(INTERFACES / f'interface-{lang}.cc', out_dir / INTERFACE_FILE)

    # On compile

    subprocess.run(['make', f'--makefile={MAKEFILES / ("Makefile-" + lang)}', '-C', out_dir,
                    'STECHEC_SERVER=true', 'champion.so', 'clean'])

    return lang



def on_end_compilation(task: Task):
    c: Champion = task.args[0]
    c.compilation_status = Champion.Status.FINI if task.success else Champion.Status.ERREUR
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

    match.dump.name = f'match/{match.id_match}/dump.json'


async def run_match_async(match_dir, client1, client2):
    # On crée une map aléatoire
    match_dir.mkdir(exist_ok=True)

    client1_name, client1_dir = client1
    client2_name, client2_dir = client2

    with open(match_dir / 'map.txt', 'w') as fiw:
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
    client_1 = await run_client(match_dir, client1_name, client1_dir, s_reqrep, s_pubsub, 0)
    client_2 = await run_client(match_dir, client2_name, client2_dir, s_reqrep, s_pubsub, 1)

    server_out, _ = await server_task.communicate()
    await client_1.wait()
    await client_2.wait()
    return server_out



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
        stdout=PIPE
    )

async def run_client(match_dir, champion_name, champion_path: Path, req_addr, sub_addr, client_id):
    return await asyncio.create_subprocess_exec(
        STECHEC_CLIENT,
        '--name', f'{champion_name}-{client_id + 1}',
        '--rules', MATCH_RULES,
        '--time', str(MATCH_TIMEOUT),
        '--champion', str(champion_path / 'champion.so'),
        '--req_addr', req_addr,
        '--sub_addr', sub_addr,
        '--socket_timeout', '45000',
        '--verbose', '1',
        '--client-id', str(client_id),
        '--map', str(match_dir / 'map.txt'),
        cwd=champion_path
    )


def on_end_match(task: Task):
    m: Match = task.args[0]
    m.status = Match.Status.FINI if task.success else Match.Status.ERREUR
    m.save(run=False)