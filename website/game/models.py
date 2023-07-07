from django.db import models
from django.conf import settings

class Champions(models.Model):
    code = models.FileField()
    nom = models.CharField(max_length=128, blank=False)
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date= models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.nom}'

class Match(models.Model):
    champion1 = models.ForeignKey(Champions, on_delete=models.CASCADE,related_name='champion1')
    champion2 = models.ForeignKey(Champions, on_delete=models.CASCADE,related_name='champion2')
    id_match = models.IntegerField()
    gagnant = models.BooleanField(null=True)