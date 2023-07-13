import os
from pathlib import Path
import subprocess
import shutil
from django_q.tasks import Task

from website.settings import MEDIA_ROOT, MAX_ISOLATE
from .models import Champion, Match
from multiprocessing import current_process

PATH_BUILD_DIR = Path('build')
PATH_BUILD_DIR.mkdir(exist_ok=True)
MAKEFILES = (Path('game') / 'makefiles').absolute()
INTERFACES = (Path('game') / 'interface').absolute()
INTERFACE_FILE = 'interface.cc'

MATCH_OUT_DIR = MEDIA_ROOT / 'match'
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

def get_build_dir(champion: Champion):
    return (PATH_BUILD_DIR / champion.code.name).with_suffix('')


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

def run_server():
    pass

def on_end_match(match: Match):
    pass