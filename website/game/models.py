from typing import Iterable
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, FileExtensionValidator
from django_q.tasks import async_task, Task, Schedule, schedule
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Q
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
import datetime

from authentication.models import User

def task_link_view(t: Task):
    if t is None:
        return "-"
    return format_link(f"/admin/django_q/{'success' if t.success else 'failure'}/{t.id}/change/", t)

def format_link(link, content):
    return format_html(f'<a href="{link}">{content}</a>')

def even(v):
    if v % 2 == 1:
        raise ValidationError("Un entier pair est attendu !")


class Champion(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = 'EA'
        EN_COURS = 'EC'
        FINI = 'FI'
        ERREUR = 'ER'
    code = models.FileField(validators = [FileExtensionValidator(allowed_extensions=["zip","tgz","tar.gz"])])
    nom = models.CharField(max_length=128, blank=False,unique=True, validators=[RegexValidator("^[a-zA-Z-_0-9]*$", "Les seuls caractères valides sont les lettres, les chiffres, - et _.")])
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    date = models.DateTimeField(auto_now_add=True, editable = False)
    compilation_status = models.CharField(choices=Status.choices, max_length=2, editable=False, default=Status.EN_ATTENTE)
    compile_task = models.ForeignKey(Task, null=True, editable=False, on_delete=models.SET_NULL)
    supprimer =  models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["-date"]),
            models.Index(fields=["uploader","-date"])
        ]

    def __str__(self):
        return f'{self.nom}@{self.uploader}'

    def save(self, force_insert: bool = False, force_update: bool = False, using = None, update_fields = None, compile=True) -> None:
        super().save(force_insert, force_update, using, update_fields)
        if compile:
            async_task('game.tasks.compile_champion', self, hook='game.tasks.on_end_compilation', group="compile")

    @admin.display(description="Compile task")
    def task_link(self):
        return task_link_view(self.compile_task)

    @admin.display(description="Code")
    def code_link(self):
        return format_link(f"/champions/code/{self.nom}", self.nom)

    def nb_matchs(self):
        return Match.objects.filter(Q(champion1=self)|Q(champion2=self)).count()



class Tournoi(models.Model):

    class Status(models.TextChoices):
        EN_ATTENTE = 'EA'
        EN_COURS = 'EC'
        FINI = 'FI'
        ERREUR = 'ER'
        LANCEMENT_PROGRAMMÉ = 'LP'

    def valide_date(date):
        if date.timestamp() < datetime.datetime.now().timestamp():
                raise ValidationError("Vous ne pouvez pas lancer le tournoi avant qu'il soit créé !")

    id_tournoi = models.AutoField(primary_key=True, unique=True)
    status = models.CharField(choices=Status.choices,max_length=2, default=Status.EN_ATTENTE,)
    max_champions = models.IntegerField(default=3)
    nb_matchs = models.IntegerField(default=10, validators=[even])
    date_lancement = models.DateTimeField(validators=[valide_date], null=True, blank=True)
    schedule = models.ForeignKey(Schedule, blank=True, null=True, default=None, on_delete=models.SET_NULL)

    class Meta:
        indexes = [
            models.Index(fields=["date_lancement"])
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.status == self.Status.LANCEMENT_PROGRAMMÉ:
            if self.schedule is not None:
                self.schedule.next_run = self.date_lancement
                self.schedule.save()
            else:
                self.schedule = schedule(
                    'game.tasks.launch_tournoi',
                    str(self.id_tournoi),
                    schedule_type=Schedule.ONCE,
                    name=f"launch-tournoi-{self.id_tournoi}",
                    next_run=self.date_lancement,
                )
                super().save(*args, **kwargs)

        elif self.status == self.Status.EN_ATTENTE:
            if self.schedule is not None:
                self.schedule.delete()
                self.schedule = None


    def nb_champions(self):
        return Inscrit.objects.filter(tournoi=self).count()

    def nb_champions_user(self, user):
        return Inscrit.objects.filter(tournoi=self, champion__uploader=user).count()

    def __str__(self) -> str:
        return f"Tournoi #{self.id_tournoi} {self.date_lancement}" #{self.date_lancement:%d/%m/%y %H:%M}"

class Inscrit(models.Model):
    tournoi = models.ForeignKey(Tournoi,on_delete=models.CASCADE)
    champion = models.ForeignKey(Champion,on_delete=models.CASCADE)
    classement = models.IntegerField(null=True, blank=True)
    nb_points = models.IntegerField(null=True, blank=True)
    victoires = models.IntegerField(null=True, blank=True)
    egalites = models.IntegerField(null=True, blank=True)
    defaites = models.IntegerField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True, editable=False)

    def victoires_score(self):
        return 3 * self.victoires + self.egalites
    

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['tournoi', 'champion'], name='champion unique dans un tournoi')
        ]
        indexes = [
            models.Index(fields=["tournoi","champion"]),
            models.Index(fields=["tournoi","classement"])
        ]

    def __str__(self) -> str:
        return f"Inscrit {self.champion} #{self.tournoi.id_tournoi}"




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
    champion1 = models.ForeignKey(Champion, on_delete=models.CASCADE, related_name='champion1')
    champion2 = models.ForeignKey(Champion, on_delete=models.CASCADE, related_name='champion2')
    gagnant = models.IntegerField(choices=Gagnant.choices, editable=False, default=Gagnant.NON_FINI)
    status = models.CharField(choices=Status.choices,max_length=2, editable=False, default=Status.EN_ATTENTE,)
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
    date = models.DateTimeField(auto_now_add=True, editable = False)
    match_task = models.ForeignKey(Task, null=True, editable=False, on_delete=models.SET_NULL)
    tournoi = models.ForeignKey(Tournoi, null=True,on_delete=models.CASCADE, blank=True)
    lanceur = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["-date"]),
            models.Index(fields=["champion1","-date"]),
            models.Index(fields=["champion2","-date"]),
            models.Index(fields=["tournoi","champion1","-date"]),
            models.Index(fields=["tournoi","champion2","-date"]),
            models.Index(fields=["tournoi","-date"])
        ]

    def save(self, *args, run=True, **kwargs) -> None:
        if not self.is_correct():
            print("Un des deux champions n'a pas réussie / terminé la compilation.")
            return

        super().save(*args, **kwargs)
        if run:
            self.launch_match()

    def launch_match(self):
        async_task('game.tasks.run_match', self, hook='game.tasks.on_end_match', group="match")

    @admin.display(description="Match task")
    def task_link(self):
        return task_link_view(self.match_task)

    @admin.display(description="Map link")
    def map_link(self):
        return format_link(f"/media/match/{self.id_match}/map.txt", "map")

    @admin.display(description="Champion 1 out")
    def champion_1_out(self):
        return format_link(f"/matchs/{self.id_match}/out/1", "champion 1 out")

    @admin.display(description="Champion 2 out")
    def champion_2_out(self):
        return format_link(f"/matchs/{self.id_match}/out/2", "champion 2 out")

    def is_correct(self):
        return self.champion1.compilation_status == Champion.Status.FINI and self.champion2.compilation_status == Champion.Status.FINI


    def __str__(self) -> str:
        return f"Match #{self.id_match} {self.champion1} vs {self.champion2}"


