# Generated by Django 4.2.3 on 2023-07-29 13:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_user_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='create_tournament',
            field=models.BooleanField(default=False),
        ),
    ]