from django.contrib import admin
from game.models import Champion, Match

@admin.register(Champion)
class ChampionAdmin(admin.ModelAdmin):
    readonly_fields = ('compilation_status',)

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    readonly_fields = ('status', 'score1', 'score2', 'gagnant')