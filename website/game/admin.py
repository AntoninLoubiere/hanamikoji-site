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
    list_display = ('__str__', 'status', 'score1', 'score2', 'gagnant', 'task_link')
    list_filter = ('status', 'gagnant', 'champion1', 'champion2')

admin.site.register(Tournoi)
admin.site.register(Inscrit)