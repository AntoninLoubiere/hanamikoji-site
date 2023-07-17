from typing import Iterable, Optional
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, FileExtensionValidator
from django_q.tasks import async_task, Task
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Q

def task_link_view(t: Task):
    if t is None:
        return "-"
    return format_link(f"/admin/django_q/{'success' if t.success else 'failure'}/{t.id}/change/", t)

def format_link(link, content):
    return format_html(f'<a href="{link}">{content}</a>')


class Champion(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = 'EA'
        EN_COURS = 'EC'
        FINI = 'FI'
        ERREUR = 'ER'
    code = models.FileField(validators = [FileExtensionValidator(allowed_extensions=["py","c","ml","cpp","cc","zip","tgz","tar.gz"])])
    nom = models.CharField(max_length=128, blank=False,unique=True)
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    date = models.DateTimeField(auto_now_add=True)
    compilation_status = models.CharField(choices=Status.choices, max_length=2, editable=False, default=Status.EN_ATTENTE)
    compile_task = models.ForeignKey(Task, null=True, editable=False, on_delete=models.PROTECT)

    def __str__(self):
        return f'{self.nom}@{self.uploader}'

    def save(self, force_insert: bool = False, force_update: bool = False, using: str | None = None, update_fields: Iterable[str] | None = None, compile=True) -> None:
        super().save(force_insert, force_update, using, update_fields)
        if compile:
            async_task('game.tasks.compile_champion', self, hook='game.tasks.on_end_compilation', group="compile")

    @admin.display(description="Compile task")
    def task_link(self):
        return task_link_view(self.compile_task)

    def nb_matchs(self):
        return Match.objects.filter(Q(champion1=self)|Q(champion2=self)).count()

    def win_rate(self):
        nb = self.nb_matchs()
        if nb <= 0:
            return 0
        else:
            return Match.objects.filter(Q(champion1=self, gagnant=Match.Gagnant.CHAMPION_1)|Q(champion2=self, gagnant=Match.Gagnant.CHAMPION_2)).count() / nb * 100



class Match(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = 'EA'
        EN_COURS = 'EC'
        FINI = 'FI'
        ERREUR = 'ER'

    class Gagnant(models.IntegerChoices):
        CHAMPION_1 = 1
        CHAMPION_2 = 2
        NON_FINI =  -1
        EGALITE = 0

    id_match = models.AutoField(primary_key=True, unique=True)
    champion1 = models.ForeignKey(Champion, on_delete=models.PROTECT, related_name='champion1')
    champion2 = models.ForeignKey(Champion, on_delete=models.PROTECT, related_name='champion2')
    gagnant = models.IntegerField(choices=Gagnant.choices, editable=False, default=Gagnant.NON_FINI)
    status = models.CharField(choices=Status.choices,max_length=5, editable=False, default=Status.EN_ATTENTE,)
    score1 = models.IntegerField(
        null=True,
        blank=True,
        editable=False,
        validators=[MinValueValidator(0), MaxValueValidator(21)]
    )
    score2 = models.IntegerField(
        null=True,
        blank=True,
        editable=False,
        validators=[MinValueValidator(0), MaxValueValidator(21)]
    )
    #dump = models.FileField(null=True,blank=True,validators=[FileExtensionValidator(allowed_extensions=["json"])])
    date = models.DateTimeField(auto_now_add=True)
    match_task = models.ForeignKey(Task, null=True, editable=False, on_delete=models.PROTECT)

    def save(self, *args, run=True, **kwargs) -> None:
        if not self.is_correct():
            print("Un des deux champions n'a pas réussie / terminé la compilation.")
            return

        super().save(*args, **kwargs)
        if run:
            async_task('game.tasks.run_match', self, hook='game.tasks.on_end_match', group="match")

    @admin.display(description="Match task")
    def task_link(self):
        return task_link_view(self.match_task)

    @admin.display(description="Map link")
    def map_link(self):
        return format_link(f"/codes/match/{self.id_match}/map.txt", "map")

    @admin.display(description="Champion 1 out")
    def champion_1_out(self):
        return format_link(f"/codes/match/{self.id_match}/champion1.out.txt", "champion 1 out")

    @admin.display(description="Champion 2 out")
    def champion_2_out(self):
        return format_link(f"/codes/match/{self.id_match}/champion2.out.txt", "champion 2 out")

    def is_correct(self):
        return self.champion1.compilation_status == Champion.Status.FINI and self.champion2.compilation_status == Champion.Status.FINI


    def __str__(self) -> str:
        return f"Match #{self.id_match} {self.champion1} vs {self.champion2}"