from django import forms

from . import models
from  django.db.models import Q
class ChampionsForm(forms.ModelForm):
    class Meta:
        model = models.Champion
        fields = ['code', 'nom']


class TournoisForm(forms.ModelForm):
    class Meta:
        model = models.Tournoi
        fields = ['max_champions','date_lancement', 'nb_matchs']
        widgets = {'date_lancement': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
}

