# Generated by Django 4.2.3 on 2023-08-07 18:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0034_tournoi_nb_matchs'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='champion',
            index=models.Index(fields=['-date'], name='game_champi_date_b0fac9_idx'),
        ),
        migrations.AddIndex(
            model_name='champion',
            index=models.Index(fields=['uploader', '-date'], name='game_champi_uploade_3784f6_idx'),
        ),
        migrations.AddIndex(
            model_name='inscrit',
            index=models.Index(fields=['tournoi', 'champion'], name='game_inscri_tournoi_3c2179_idx'),
        ),
        migrations.AddIndex(
            model_name='inscrit',
            index=models.Index(fields=['tournoi', 'classement'], name='game_inscri_tournoi_19c7d9_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['-date'], name='game_match_date_068b66_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['champion1', '-date'], name='game_match_champio_b163d7_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['champion2', '-date'], name='game_match_champio_d004fb_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['tournoi', 'champion1', '-date'], name='game_match_tournoi_6c9cc1_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['tournoi', 'champion2', '-date'], name='game_match_tournoi_d4154e_idx'),
        ),
        migrations.AddIndex(
            model_name='match',
            index=models.Index(fields=['tournoi', '-date'], name='game_match_tournoi_e4b3ab_idx'),
        ),
        migrations.AddIndex(
            model_name='tournoi',
            index=models.Index(fields=['date_lancement'], name='game_tourno_date_la_2ac1e7_idx'),
        ),
    ]