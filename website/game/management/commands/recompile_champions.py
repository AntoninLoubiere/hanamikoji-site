from django.core.management.base import BaseCommand
from django_q.tasks import async_task

from game.models import Champion
from game.tasks import get_build_dir


class Command(BaseCommand):
    help = "Queue la recompilation des champions manquants ou de tous les champions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry",
            action="store_true",
            help="Affiche ce qui serait recompile sans rien planifier",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Recompile tous les champions (pas seulement ceux sans champion.so)",
        )

    def handle(self, *args, **options):
        dry = options["dry"]
        recompile_all = options["all"]

        champions = Champion.objects.order_by("id")
        selected = []

        for champion in champions:
            build_artifact = get_build_dir(champion) / "champion.so"
            if recompile_all or not build_artifact.exists():
                selected.append((champion, build_artifact))

        if not selected:
            self.stdout.write(self.style.SUCCESS("Aucun champion a recompiler."))
            return

        self.stdout.write(f"Champions cibles: {len(selected)}")

        queued = 0
        for champion, build_artifact in selected:
            self.stdout.write(f"- {champion.id}: {champion.nom} ({build_artifact})")
            if not dry:
                champion.compilation_status = Champion.Status.EN_ATTENTE
                champion.save(compile=False)
                async_task(
                    "game.tasks.compile_champion",
                    champion,
                    hook="game.tasks.on_end_compilation",
                    group="compile",
                )
                queued += 1

        if dry:
            self.stdout.write(self.style.WARNING("Mode dry-run: aucune recompilation planifiee."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Recompilations planifiees: {queued}"))
