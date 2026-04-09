from pathlib import Path
import shutil
from django.core.management.base import BaseCommand

from game.tasks import MATCH_OUT_DIR, PATH_BUILD_DIR, get_build_dir
from game.models import Champion, Match
from website.settings import MEDIA_ROOT
from django_q.tasks import Task

def get_used_build_top_levels():
    top_levels = set()
    for champion in Champion.objects.all():
        try:
            rel = get_build_dir(champion).relative_to(PATH_BUILD_DIR)
        except ValueError:
            # Defensive fallback in case a custom storage returns an unexpected path
            continue
        if len(rel.parts) > 0:
            top_levels.add(rel.parts[0])
    return top_levels

def get_files(actual_dirs, used):
    ad_idx = 0
    uc_idx = 0
    to_delete = []
    while ad_idx < len(actual_dirs) and uc_idx < len(used):
        c = used[uc_idx]
        d = actual_dirs[ad_idx]
        if d.name == c.name:
            ad_idx += 1
            uc_idx += 1
        elif d.name < c.name:
            to_delete.append(d)
            ad_idx += 1
        elif c.name < d.name:
            uc_idx += 1
    to_delete.extend(actual_dirs[ad_idx:])
    return to_delete

def get_files_int(actual_dirs, used):
    ad_idx = 0
    uc_idx = 0
    to_delete = []
    while ad_idx < len(actual_dirs) and uc_idx < len(used):
        c = used[uc_idx]
        d = actual_dirs[ad_idx]
        if d == c:
            ad_idx += 1
            uc_idx += 1
        elif d < c:
            to_delete.append(d)
            ad_idx += 1
        elif c < d:
            uc_idx += 1
    to_delete.extend(actual_dirs[ad_idx:])
    return to_delete

def get_files_task(actual_dirs, used):
    ad_idx = 0
    uc_idx = 0
    to_delete = []
    while ad_idx < len(actual_dirs) and uc_idx < len(used):
        c = used[uc_idx]
        d = actual_dirs[ad_idx]
        if d.pk == c:
            ad_idx += 1
            uc_idx += 1
        elif d.pk < c:
            to_delete.append(d)
            ad_idx += 1
        elif c < d.pk:
            uc_idx += 1
    to_delete.extend(actual_dirs[ad_idx:])
    return to_delete

class Command(BaseCommand):
    help = "Cleanup unused files"

    def add_arguments(self, parser):
        parser.add_argument("--dry", action="store_true", help="Make a dry run",)

    def handle(self, *args, **options):
        delete_files = not options['dry']

        print("# Delete build dir :")
        actual_dirs = sorted((d for d in PATH_BUILD_DIR.iterdir() if d.is_dir()), key=lambda d: d.name)
        used_top_levels = get_used_build_top_levels()
        to_delete_build = [d for d in actual_dirs if d.name not in used_top_levels]

        for d in to_delete_build:
            print("Delete build champion:", d.name)
            if delete_files:
                shutil.rmtree(d)

        print("# Delete media dir :")
        actual_dirs = sorted((d for d in Path(MEDIA_ROOT).iterdir() if d.is_file()), key=lambda d: d.name)
        used_champions = sorted(map(lambda c: Path(c.code.path), Champion.objects.all()))
        to_delete_media = get_files(actual_dirs, used_champions)

        f: Path
        for f in to_delete_media:
            print("Delete code champion:", f.name)
            if delete_files:
                f.unlink()

        print("# Delete unused matchs :")
        actual_dirs = sorted(int(d.name) for d in MATCH_OUT_DIR.iterdir() if d.is_dir() and d.name.isdigit())
        used_matchs = list(map(lambda m: m.id_match, Match.objects.order_by('id_match').all()))

        to_delete_matchs = get_files_int(actual_dirs, used_matchs)
        for f in to_delete_matchs:
            d = MATCH_OUT_DIR / str(f)
            print("Delete match:", f)
            if delete_files:
                shutil.rmtree(d)

        print("# Remove unused tasks :")
        used_tasks = list(Champion.objects
                            .filter(compile_task__isnull=False)
                            .order_by('compile_task__pk')
                            .values_list('compile_task', flat=True)
                            .union(
                          Match.objects
                            .filter(match_task__isnull=False)
                            .order_by('match_task__pk')
                            .values_list('match_task', flat=True)
                        ))

        req = Task.objects.exclude(success=False).exclude(func='game.tasks.launch_tournoi').exclude(pk__in=used_tasks)
        c = req.count()
        print(f"Delete {c} unused tasks: ", req)
        if delete_files:
            req.delete()

        print("\n# Summary")
        print("Build:", len(to_delete_build))
        print("Media:", len(to_delete_media))
        print("Match:", len(to_delete_matchs))
        print("Tasks:", c)
