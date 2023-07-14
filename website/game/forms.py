from django import forms

from . import models

class ChampionsForm(forms.ModelForm):
    class Meta:
        model = models.Champion
        fields = ['code', 'nom']

class Filter_Champion(forms.Form):
    nom_du_champion = forms.CharField(required=False)

class Filter_User(forms.Form):
    utilisateur = forms.CharField(required=False)