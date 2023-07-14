from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from game.models import Champion, Match

@admin.register(Champion)
class ChampionAdmin(admin.ModelAdmin):
    readonly_fields = ('compilation_status', 'task_link')


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    readonly_fields = ('status', 'score1', 'score2', 'gagnant')