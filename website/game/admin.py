from django.contrib import admin
from game.models import Champion, Match

@admin.register(Champion)
class ChampionAdmin(admin.ModelAdmin):
    readonly_fields = ('compilation_status',)

# admin.site.register(Champion)
admin.site.register(Match)