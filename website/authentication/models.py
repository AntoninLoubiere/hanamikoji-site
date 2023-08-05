from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    first_name = None
    last_name = None
    create_tournament = models.BooleanField(default=False)
    
    def __str__(self):
        return f'{self.username}'
