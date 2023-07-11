# Generated by Django 4.2.3 on 2023-07-10 16:40

import django.core.validators
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0002_alter_match_id_match'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='date',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='match',
            name='dump',
            field=models.FileField(default='', upload_to='', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['json'])]),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='match',
            name='score1',
            field=models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(21)]),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='match',
            name='score2',
            field=models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(21)]),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='match',
            name='status',
            field=models.CharField(choices=[('EA', 'En Attente'), ('EC', 'En Cours'), ('FI', 'Fini'), ('ER', 'Erreur')], default='EA', max_length=5),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='champion',
            name='code',
            field=models.FileField(upload_to='', verbose_name=django.core.validators.FileExtensionValidator(allowed_extensions=['py', 'c', 'ml'])),
        ),
        migrations.AlterField(
            model_name='match',
            name='gagnant',
            field=models.IntegerField(choices=[(1, 'Champion 1'), (2, 'Champion 2'), (-1, 'Non Fini'), (0, 'Egalite')], default=-1),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='match',
            name='id_match',
            field=models.AutoField(primary_key=True, serialize=False, unique=True),
        ),
    ]