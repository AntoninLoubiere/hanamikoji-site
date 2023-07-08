# Site pour le tournoi de hanamikoji

Utilisation de django pour la création du site

## Utilisation pour tester le site localement

Dans un environnement virtuel (ou pas), dans un terminal, écrivez :

### Installation
```
pip install django
git clone https://github.com/AntoninLoubiere/hanamikoji-site
cd hanamikoji-site/website
```

### Configuration

Création de la base de données
```
python manage.py migrate
```

### Lancement

```
python manage.py runserver
```


Le site s’exécute à l'adresse <http://127.0.0.1:8000/>.
