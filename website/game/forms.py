from django import forms
from django.utils import timezone

from . import models
from  django.db.models import Q
class ChampionsForm(forms.ModelForm):
    class Meta:
        model = models.Champion
        fields = ['code', 'nom']
        widgets={
            'code': forms.FileInput(attrs={'accept':'.tar,.tgz,.zip,application/gzip,application/x-tar,application/zip'})
        }

class UpdateChampionsForm(forms.ModelForm):
    class Meta:
        model = models.Champion
        fields = ['code']
        widgets={
            'code': forms.FileInput(attrs={'accept':'.tar,.tgz,.zip,application/gzip,application/x-tar,application/zip'})
        }


class TournoisForm(forms.ModelForm):
    class Meta:
        model = models.Tournoi
        fields = ['max_champions','date_lancement', 'nb_matchs']
        widgets = {'date_lancement': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
}

    def clean_date_lancement(self):
        date_lancement = self.cleaned_data.get('date_lancement')
        if date_lancement is None:
            return date_lancement

        if timezone.is_naive(date_lancement):
            date_lancement = timezone.make_aware(date_lancement, timezone.get_current_timezone())

        if date_lancement <= timezone.now():
            raise forms.ValidationError("La date de lancement doit être dans le futur.")

        return date_lancement

