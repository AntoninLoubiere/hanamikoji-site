=================
Coder un champion
=================

Introduction
============

Pour participer à la compétition vous devez coder un programme (appelé champion). Pour cela
télécharger les `patrons de codes </static/rules.zip>`_. Choisissez votre langage favoris parmi :

- c
- c++
- ocaml
- python

Pour

- java
- js
- php
- rust

veuillez nous demander.

Anatomie d'un champion
======================

Un champion doit implémenter les cinq `fonctions utilisateurs <api.html#fonctions-utilisateur>`_ :

.. code-block:: c

   void init_jeu()
   void jouer_tour()
   void repondre_action_choix_trois()
   void repondre_action_choix_paquets()
   void fin_jeu()


Après l'initialisation du jeu, la fonction ``init_jeu`` est appelée, à partir de ce moment, vous
avez accès à toutes les `fonctions de l'API <api.html#fonctions>`_.

.. warning::
  Appeler des fonctions de l'API avant que ``init_jeu`` ait été appelée peut planter.

À votre tour, la fonction ``jouer_tour`` sera appelée. Lorsque l'adversaire jouera une action qui
nécessite une intervention de votre part, la fonction en question sera appelée. Une fois la partie
terminée, la fonction ``fin_jeu`` sera appelée.

.. warning::
  Ne pas jouer d'action ou ne pas répondre à un choix entraîne la perte **immédiate** du match.

Les `Geisha <jeu.html#description-generale>`_ sont représentées par des entiers de 0
à 6 représentant dans l'ordre les trois Geisha à deux cartes, les deux Geisha à trois cartes, la
Geisha à quatre cartes et la Geisha à cinq cartes.

Les cartes sont représentées par des entiers de 0 à 6 correspondant à la Geisha représentée par la
carte.

Lancer un match
===============

 - `Lancer un match en local <utilisation-local.html#lancement-dun-match>`_
 - `Lancer un match avec le serveur <utilisation-serveur.html#lancer-un-match>`_