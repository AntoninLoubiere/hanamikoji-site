import json
import sys
from api import *


ACTIONS_FUNC = [action_valider, action_defausser, action_choix_trois, action_choix_paquets]

def send_line(data):
    sys.stdout.write(json.dumps(data))
    sys.stdout.write('\n')
    sys.stdout.flush()

class Context:
    def __init__(self) -> None:
        self.moi = id_joueur()
        self.adv = id_adversaire()
        self.manche = -1

    def update(self, attente_reponse=False, is_end=False):
        m = manche()
        self.tour = tour()
        self.actions_moi = [not est_jouee_action(self.moi, a) for a in range(NB_ACTIONS)]
        self.actions_adv = [not est_jouee_action(self.moi, a) for a in range(NB_ACTIONS)]
        self.moi_cartes = [nb_cartes_validees(self.moi, g) for g in range(NB_GEISHA)]
        self.adv_cartes = [nb_cartes_validees(self.adv, g) for g in range(NB_GEISHA)]
        self.posession = [possession_geisha(g) for g in range(NB_GEISHA)]
        self.cartes = cartes_en_main()
        self.carte_piochee = carte_piochee()
        self.derniere_action = tour_precedent()

        if self.tour == 0 and not attente_reponse and not is_end:
            sys.stdout.write('new-manche')
        self.manche = m

        send_line({
            "msg": "status", "manche": self.manche, "tour": self.tour, "cartes": self.cartes,
            "carte_piochee": -1 if is_end else self.carte_piochee, "actions_moi": self.actions_moi, "actions_adv": self.actions_adv,
            "cv_moi": self.moi_cartes, "cv_adv": self.adv_cartes, "possession": self.posession,
            "derniere_action": {
                "act": self.derniere_action.act,
                "c1": self.derniere_action.c1,
                "c2": self.derniere_action.c2,
                "c3": self.derniere_action.c3,
                "c4": self.derniere_action.c4
            },
            "attente_reponse": attente_reponse, "joueur": self.moi, "nb_cartes_adv": nb_cartes(self.adv),
            "is_end": is_end,
        })

    def jouer_tour(self):
        while True:
            try:
                input_ = input()
            except EOFError:
                send_line({"msg": "err", "code": "eof"})
                return
            try:
                cartes = list(map(int, input_.split(' ')))
                if 1 <= len(cartes) <= 4:
                    err = ACTIONS_FUNC[len(cartes) - 1](*cartes)
                    if err == error.OK:
                        break
                    send_line({"msg": "err", "code": "action-err", "nb": err})
                else:
                    raise ValueError
            except ValueError:
                send_line({"msg": "err", "code": "cartes-value-error"})

    def repondre_action_choix_trois(self):
        while True:
            try:
                input_ = input()
            except EOFError:
                send_line({"msg": "err", "code": "eof"})
                return
            try:
                c = int(input_)
                if 0 <= c <= 2:
                    err = repondre_choix_trois(c)
                    if err == error.OK:
                        break
                    send_line({"msg": "err", "code": "action-err", "nb": err})
                else:
                    raise ValueError
            except ValueError:
                send_line({"msg": "err", "code": "choix-value-error"})

    def repondre_action_choix_paquets(self):
        while True:
            try:
                input_ = input()
            except EOFError:
                send_line({"msg": "err", "code": "eof"})
                return
            try:
                p = int(input_)
                if 0 <= p <= 1:
                    err = repondre_choix_paquets(p)
                    if err == error.OK:
                        break
                    send_line({"msg": "err", "code": "action-err", "nb": err})
                else:
                    raise ValueError
            except ValueError:
                send_line({"msg": "err", "code": "choix-value-error"})

def init_jeu():
    global CTX
    CTX = Context()

# Fonction appelee au debut du tour
def jouer_tour():
    CTX.update()
    CTX.jouer_tour()

# Fonction appelee lors du choix entre les trois cartes lors de l'action de
# l'adversaire (cf tour_precedent)
def repondre_action_choix_trois():
    CTX.update(True)
    CTX.repondre_action_choix_trois()


# Fonction appelee lors du choix entre deux paquet lors de l'action de
# l'adversaire (cf tour_precedent)
def repondre_action_choix_paquets():
    CTX.update(True)
    CTX.repondre_action_choix_paquets()

# Fonction appelee à la fin du jeu
def fin_jeu():
    CTX.update(is_end=True)
