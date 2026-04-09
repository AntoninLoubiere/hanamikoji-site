from django.db import models
from django.contrib.auth.models import AbstractUser
import datetime
from django.core.cache import cache
from django.conf import settings
import django.contrib.auth.validators

class User(AbstractUser):
    username = models.CharField(
        max_length=32,
        unique=True,
        help_text='Required. 32 characters or fewer. Letters, digits and @/./+/-/_ only.',
        validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
        error_messages={'unique': 'A user with that username already exists.'},
    )
    first_name = None
    last_name = None
    create_tournament = models.BooleanField(default=False)
    
    def nb_champions(self):
        from game.models import Champion
        return Champion.objects.filter(uploader=self).count()

    def last_seen(self):
        return cache.get(f'seen_{self.username}')

    def online(self):
        if self.last_seen():
            now = datetime.datetime.now()
            if now > self.last_seen() + datetime.timedelta(
                         seconds=settings.USER_ONLINE_TIMEOUT):
                return False
            else:
                return True
        else:
            return False

    def __str__(self):
        return f'{self.username}'
