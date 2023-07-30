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
        fields = ['max_champions','date_lancement']
        widgets = {'date_lancement': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
}

class ChoiceChampions(forms.Form):
    champ = forms.ModelChoiceField(queryset=None)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user')
        self.id = kwargs.pop('id')
        super(ChoiceChampions, self).__init__(*args, **kwargs)
        tournoi = models.Tournoi.objects.get(id_tournoi=self.id)
        inscrits = models.Inscrit.objects.filter(tournoi=tournoi)
        champions_select = inscrits.select_related("champion")
        champions_non_select = models.Champion.objects.filter(Q(uploader=self.user) | ~Q(nom__in=champions_select.all()))
        self.fields["champ"].queryset = champions_non_select