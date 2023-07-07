from django import forms

from . import models

class ChampionsForm(forms.ModelForm):
    class Meta:
        model = models.Champions
        fields = ['code', 'nom']