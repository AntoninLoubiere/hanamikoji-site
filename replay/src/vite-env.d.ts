/// <reference types="svelte" />
/// <reference types="vite/client" />

interface Geisha {
    id: int;
    card: int;
}

type ACTIONS = "VALIDER" | "DEFAUSSER" | "CHOIX_TROIS" | "CHOIX_PAQUETS"

interface JoueurState {
    id: number,
    nom: string,
    score: number
    main: number[],
    validees: number[]
}

interface State {
    manche: number,
    tour: number,
    carte_ecartee: number,
    dernier_choix: number,
    cartes_pioche: number[],
    attente_reponse: {
        valeur: false,
    } | {
        valeur: true,
        action: ACTIONS,
        cartes: number[]
    },
    joueur_0: JoueurState
    joueur_1: JoueurState
}