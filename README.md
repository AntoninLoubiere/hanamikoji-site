# Site pour le tournoi de hanamikoji

Utilisation de django pour la création du site

## Utilisation pour tester le site localement

```sh
git clone https://github.com/AntoninLoubiere/hanamikoji-site
cd hanamikoji-site/
```

### Configuration

Créez votre fichier d'environnement à partir de l'exemple :

```sh
cp .env.example .env
```

Adaptez les variables sensibles dans `.env` (`DJANGO_SECRET_KEY`, `DJANGO_SUPERUSER_PASSWORD`, `DJANGO_ALLOWED_HOSTS`, etc.).

### Déploiement via Docker

Il est possible de déployer le site directement via Docker. Assurez-vous d'avoir Docker et Docker Compose installés, puis exécutez la commande suivante à la racine du projet :

```sh
docker compose up -d
```

### Activer HTTPS avec Certbot

1. Vérifiez que le domaine pointe bien vers le serveur (DNS A/AAAA).
2. Renseignez dans `.env` les variables `CERTBOT_DOMAIN` (votre domaine) et `CERTBOT_EMAIL` (votre adresse email).
3. Démarrez la stack en HTTP (fichier `deploy/nginx/default.conf`) :

```sh
docker compose up -d
```

4. Générez le certificat Let's Encrypt:

```sh
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  --email <votre adresse email> --agree-tos --no-eff-email -d <votre nom de domaine>
```

Le service `certbot` lancé par `docker compose up -d` peut démarrer sans certificat existant : il tente des renouvellements en boucle et n'empêche pas la stack de fonctionner avant la première émission.

5. Adaptez `server_name` et les chemins de certificat dans `deploy/nginx/default.https.conf`.

6. Activez la configuration HTTPS et rechargez Nginx:

```sh
cp deploy/nginx/default.https.conf deploy/nginx/default.conf
docker compose exec nginx nginx -s reload
```

### Déploiement manuellement

#### Dépendances

- Python 3.11
- pip
- [isolate](https://github.com/ioi/isolate)

#### Installation

```
cd hanamikoji-site/website
pip install "django<5" django_q daphne
pip install -U 'channels[daphne]'
```

#### Lancement

Lancer dans deux terminals :

```sh
python manage.py runserver
```

et dans le deuxième:

```sh
python manage.py qcluster
```

Le site s’exécute à l'adresse <http://127.0.0.1:8000/>.

#### Déploiement de la documentation

Déployer /static/documentation sur l'URL /documentation.

Quand lancé avec `python manage.py runserver`. La documentation se trouve sur /static/documentation.

Vous pouvez ensuite déployer le site avec Ngnix ou Apache avec un reverse proxy.
