# Generated by Django 4.2.3 on 2023-07-14 22:32

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0012_alter_champion_compile_task'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='match',
            name='dump',
        ),
    ]