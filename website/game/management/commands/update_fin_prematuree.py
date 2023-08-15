from pathlib import Path
from django.core.management.base import BaseCommand

from game.tasks import RE_FIN_PREMATUREE
from game.models import Match


class Command(BaseCommand):
    help = "Vérifie si certains matchs ont été terminé prématurément"

    def handle(self, *args, **options):
        matchs = Match.objects.filter(match_task__isnull=False)
        to_update_match = []
        for m in matchs:
            if RE_FIN_PREMATUREE.search(m.match_task.result):
                to_update_match.append(m)
                m.fin_prematuree = True

        Match.objects.bulk_update(to_update_match, ('fin_prematuree',))
