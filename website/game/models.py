from typing import Iterable, Optional
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, FileExtensionValidator
from django_q.tasks import async_task

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

    def __str__(self):
        return f'{self.nom}@{self.uploader}'

    def save(self, force_insert: bool = False, force_update: bool = False, using: str | None = None, update_fields: Iterable[str] | None = None, compile=True) -> None:
        super().save(force_insert, force_update, using, update_fields)
        if compile:
            from .tasks import compile_champion, on_end_compilation
            async_task(compile_champion, self, hook=on_end_compilation)



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
    gagnant = models.IntegerField(choices=Gagnant.choices)
    status = models.CharField(choices=Status.choices,max_length=5, editable=False, default=Status.EN_ATTENTE)
    score1 = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(21)]
    )
    score2 = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(21)]
    )
    dump = models.FileField(null=True,blank=True,validators=[FileExtensionValidator(allowed_extensions=["json"])])
    date = models.DateTimeField(auto_now_add=True)
    

    def __str__(self) -> str:
        return f"Match #{self.id_match} {self.champion1} vs {self.champion2}"