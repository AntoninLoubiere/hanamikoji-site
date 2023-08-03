====================
Utilisation en local
====================

L'installation en local peut être rude, vous pouvez aussi lancer les matchs sur le serveur.

Installation
============

Téléchargez
`stechec2 <https://gitlab.com/prologin/tech/tools/stechec2/>`__

::

   git clone https://gitlab.com/prologin/tech/tools/stechec2.git
   cd stechec2

Téléchargez le code d’Hanamikoji

::

   git clone https://github.com/AntoninLoubiere/Hanamikoji.git games/hanamikoji

Installez les paquets requis par stechec2: cf
https://gitlab.com/prologin/tech/tools/stechec2/-/blob/main/README.rst#requirements

Configurez le projet :

::

   ./waf.py configure --with-games=hanamikoji --prefix=/usr

(En cas d’erreur, ``python commande inconnue``, remplacer ./waf.py par
python3 waf.py)

Construisez et installez :

::

   ./waf.py build install

(Un accès administrateur ``sudo`` sera peut être nécessaire).

Génération du patron de code
============================

Pour générer les patrons de code pour les champions :

::

   stechec2-generator player hanamikoji <dossier>

(remplacez ``<dossier>`` par ``players`` par exemple).

Lancement d’un match
====================

Compilez le code (même pour python !), en exécutant dans le dossier
correspondant ``make``.

Créez un fichier de configuration du type

.. code:: yaml

   rules: /usr/lib/libhanamikoji.so
   map: ./map.txt
   verbose: 3  # Niveau d'informations de débogage affichées dans la console
   clients:
     - ./champion.so
     - ./champion.so # Chemins vers les exécutables des champions, ils peuvent être différents
   names:
     - Player 1
     - Player 2
   dump: dump.json # Rapport du match pour le replay.

Créez un fichier ``map.txt`` représentant la distribution des cartes. Il doit être composé de trois
lignes, représentant la distribution des cartes pour chaque manche.

Sur chaque ligne les cartes sont représentées par des entiers de 0 à 6 séparés par des espaces, et
représentent dans l'ordre, les 6 cartes distribuées au premier joueur au début de la manche, les 6
suivantes sont les 6 cartes de début de manche du second joueur. Ensuite les cartes représentent les
cartes piochées à chaque tour, la dernière carte n'est donc pas utilisé.

Vous pouvez utiliser `ce script python <_static/random_map.py>`_ pour générer une distribution de
cartes aléatoire.

Lancez le match avec

::

   stechec2-run config.json
