from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from game.models import Champion, Match, Tournoi, Inscrit

@admin.register(Champion)
class ChampionAdmin(admin.ModelAdmin):
    readonly_fields = ('compilation_status', 'date', 'task_link', 'code_link')
    list_display = ('__str__', 'compilation_status', 'task_link')
    list_filter = ('compilation_status', 'uploader')


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    readonly_fields = ('status', 'date', 'score1', 'score2', 'gagnant', 'task_link', 'map_link', 'champion_1_out', 'champion_2_out')
    list_display = ('__str__', 'status', 'score1', 'score2', 'gagnant', 'fin_prematuree', 'tournoi', 'lanceur')
    list_filter = ('status', 'tournoi', 'gagnant', 'fin_prematuree', 'champion1', 'champion2')
    actions = ('relancer',)

    def relancer(modeladmin, _, queryset):
        queryset.update(status=Match.Status.EN_ATTENTE)
        for m in queryset:
            m.launch_match()


@admin.register(Tournoi)
class TournoiAdmin(admin.ModelAdmin):
    readonly_fields = ('inscrits', 'matchs')
    list_display = ('id_tournoi', 'status', 'max_champions', 'date_lancement', 'nb_champions', 'nb_matchs')
    list_filter = ('status', 'date_lancement')
    actions = ('recompter_points', )

    def nb_matchs(self, t):
        return Match.objects.filter(tournoi=t).count()

    def matchs(self, t):
        return format_html(f'<a href="/admin/game/match/?tournoi__id_tournoi__exact={t.id_tournoi}">{self.nb_matchs(t)} matchs</a>')

    def inscrits(self, t):
        return format_html(f'<a href="/admin/game/inscrit/?tournoi__id_tournoi__exact={t.id_tournoi}">{t.nb_champions()} inscrits</a>')

    def recompter_points(self, _, queryset):
        queryset.update(status=Tournoi.Status.EN_COURS)


@admin.register(Inscrit)
class InscritAdmin(admin.ModelAdmin):
    readonly_fields = ('classement', 'nb_points', 'victoires', 'egalites', 'defaites')
    list_display = ('champion', 'tournoi', 'classement', 'nb_points', 'victoires', 'egalites', 'defaites')
    list_filter = ('tournoi', 'champion', 'champion__uploader')