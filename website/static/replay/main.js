const NB_GEISHAS = 7;
const NB_CARTES_TOTALES = 21;
const GEISHA_VALEURS = [2, 2, 2, 3, 3, 4, 5]

const HEIGHT = window.innerHeight;

const JOUEUR1 = 0;
const JOUEUR2 = 1;
const EGALITE = 2;

function get_dump_from_url()
{
    const DUMP_PARAMETER = 'match'

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const matchId = Number(urlParams.get(DUMP_PARAMETER));
    if (!isNaN(matchId)) {
        return fetch(`/media/match/${matchId}/dump.json`).then(r => r.json())
    }
}

/** @type{HTMLImageElement[]} */
const GEISHAS = new Array(NB_GEISHAS)
/** @type{number[]} */
const GEISHAS_LEFT_OFFSET = new Array(NB_GEISHAS)
/** @type{HTMLImageElement[]} */
const MARKERS = new Array(NB_GEISHAS)
const GEISHA_SPACE_BETWEEN = 150;

function init_geishas() {
    for (let i = 0; i < NB_GEISHAS; i++) {
        const left = GEISHAS_LEFT_OFFSET[i] = 300 + i * GEISHA_SPACE_BETWEEN;
        const g = GEISHAS[i] = /** @type{HTMLImageElement} */ (document.getElementById('geisha' + i));
        g.style.left = `${left}px`
        g.style.top = `${HEIGHT / 2}px`
        const m = MARKERS[i] = /** @type{HTMLImageElement} */ (document.getElementById('marker' + i));
        m.style.left = `${left}px`
        m.style.top = `${HEIGHT / 2}px`
    }
}

/** @type{HTMLImageElement[]} */
const CARTES = new Array(NB_CARTES_TOTALES)
/** @type{number[]} */
const CARTES_GEISHA = new Array(NB_CARTES_TOTALES)
const CARTES_TYPE = ["2_violet", "2_rouge", "2_jaune", "3_bleu", "3_orange", "4_vert", "5_rose"];

function init_cartes() {
    let idx = 0;
    let nb = GEISHA_VALEURS[idx];
    for (let i = 0; i < NB_CARTES_TOTALES; i++) {
        if (nb <= 0) {
            idx++;
            nb = GEISHA_VALEURS[idx];
        }
        nb--;
        CARTES_GEISHA[i] = idx;
        let c = CARTES[i] = document.createElement('img')
        c.src = `./assets/cartes/${CARTES_TYPE[idx]}.jpg`
        c.classList.add('carte')
        document.body.append(c)
        applyMove(c, moveToPioche(PIOCHE_CENTRAL_POSITION));
    }
}

const CARTE_HEIGHT_OFFSET = 35;
const PIOCHE_LEFT_OFFSET = 100
const PIOCHE_CENTRAL_POSITION = 5;
/**
 * @typedef moveAction
 * @prop {number} top
 * @prop {number} left
 * @prop {number?} zIndex
 *
 * @param {HTMLElement} el
 * @param {moveAction} moveAction
 */
function applyMove(el, moveAction) {
    el.style.top = `${moveAction.top}px`
    el.style.left = `${moveAction.left}px`
    if (moveAction.zIndex != null) {
        el.style.zIndex = `${moveAction.zIndex}`
    }
}
/**
 * @param {number} position
 * @param {number} [overrideZIndex]
 * @returns {moveAction}
*/
function moveToPioche(position, overrideZIndex) {
    return {
        top: HEIGHT / 2 - PIOCHE_CENTRAL_POSITION * CARTE_HEIGHT_OFFSET + position * CARTE_HEIGHT_OFFSET,
        left: PIOCHE_LEFT_OFFSET,
        zIndex: 10 + (overrideZIndex ?? position)
    }
}

const CARTES_GEISHA_OFFSET = 140;
/**
 * @param {number} position
 * @return {moveAction}
*/
function moveToGeisha(geisha, position) {
    return {
        top: (position > 0 ? CARTES_GEISHA_OFFSET : -CARTES_GEISHA_OFFSET) + position * CARTE_HEIGHT_OFFSET + HEIGHT / 2,
        left: GEISHAS_LEFT_OFFSET[geisha],
        zIndex: 10 + position
    }
}

const CARTES_MAIN_HEIGHT_OFFSET = 95;

/**
 * @param {number} position
 * @returns {moveAction}
*/
function moveToMain(joueur, position) {
    return {
        top: joueur == JOUEUR1 ? CARTES_MAIN_HEIGHT_OFFSET : HEIGHT - CARTES_MAIN_HEIGHT_OFFSET,
        left: GEISHAS_LEFT_OFFSET[0] + position * GEISHA_SPACE_BETWEEN,
        zIndex: 10 + position,
    }
}

/**
 *
 * @param {HTMLElement} el
 * @param {moveAction} f
 * @param {moveAction} t
 * @param {boolean} reverse
 */
function applyMoveTransition(el, f, reverse, t) {
    if (reverse) {
        applyMove(el, f);
    } else {
        applyMove(el, t);
    }
}

function processDump(dump) {
    /** @type{moveAction[]} */
    let cartes_positions = new Array(NB_CARTES_TOTALES);
    /** @type{(JOUEUR1|JOUEUR2|EGALITE)[]} */
    let cartes_main = new Array(NB_CARTES_TOTALES).fill(EGALITE);
    /** @type{number[]} */
    let cartes_main_position = new Array(NB_CARTES_TOTALES).fill(-1);
    let cartes_main_length = [0, 0]
    let pioche = [];
    let actions = [];

    /**
     * @param {number} c
     * @param {moveAction} t
     */
    function moveCard(c, t) {
        let act = { a: applyMoveTransition, f: cartes_positions[c], t, el: CARTES[c] }
        cartes_positions[c] = t;
        return act;
    }

    function getCardMain(p, g) {
        for (let j = NB_CARTES_TOTALES - 1; j > + 0; j--) {
            if (CARTES_GEISHA[j] == g && cartes_main[j] == p) {
                return j;
            }
        }
    }

    function addToMain(p, c) {
        cartes_main[c] = p;
        cartes_main_position[c] = cartes_main_length[p];
        let act = moveCard(c, moveToMain(p, cartes_main_length[p]))
        cartes_main_length[p]++;
        return act;
    }

    function nouvelleManche(dumpData) {
        let resetActs = new Array(NB_CARTES_TOTALES);
        let acts = new Array(NB_CARTES_TOTALES);
        /** @type{boolean[]} */
        let used = new Array(NB_CARTES_TOTALES).fill(false);

        function firstCard(g) {
            for (let j = 0; j < NB_CARTES_TOTALES; j++) {
                if (CARTES_GEISHA[j] == g && !used[j]) {
                    used[j] = true;
                    return j;
                } 
            }
            return -1;
        }

        cartes_main.fill(EGALITE);
        cartes_main_position.fill(-1);
        cartes_main_length = [0, 0]

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_0.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 20 - 2 * j)
            )
            acts[2 * j] = addToMain(JOUEUR1, c);
        }

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_1.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 19 - 2 * j)
            )
            acts[2 * j + 1] = addToMain(JOUEUR2, c);
        }

        pioche = [];
        let c = firstCard(dumpData.carte_ecartee);
        pioche.push(c);
        resetActs[c] = moveCard(
            c,
            moveToPioche(PIOCHE_CENTRAL_POSITION, 0)
        )
        acts[20] = moveCard(
            c,
            moveToPioche(0)
        );
        for (let j = 0; j < 8; j++) {
            let c = firstCard(dumpData.cartes_pioche[7 - j]);
            pioche.push(c);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, j + 1)
            )
            acts[12 + j] = moveCard(
                c,
                moveToPioche(j + 1)
            );
        }

        if (dumpData.manche == 0) {
                for (let a of resetActs) {
                a.a(a.el, a.f, false, a.t);
            }
        } else {
            actions.push(resetActs);
        }

        actions.push(acts);
    }

    let manche = -1;
    let attente_reponse = false;

    for (let currentLine = 0; currentLine < dump.length; currentLine++) {
        const dumpData = dump[currentLine];
        let joueur_courant = (dumpData.manche + dumpData.tour) % 2 == 0 ? JOUEUR1 : JOUEUR2;
        if (manche != dumpData.manche && dumpData.manche < 3) {
            nouvelleManche(dumpData);
            manche = dumpData.manche;
            continue;
        }

        if (!attente_reponse) {
            actions.push([addToMain(joueur_courant, pioche.pop())])
        }

        if (!dumpData.attente_reponse) {
            switch (dumpData.derniere_action.action) {
                case "VALIDER":
                    break;
            }
        }
        attente_reponse = dumpData.attente_reponse;
    }

    return actions;
}

/**
 * @typedef action
 * @prop {any} a
 * @prop {any} f
 * @prop {any} t
 * @prop {HTMLElement} el
 */
 /** @type {action[][]} */
let actions = [];
let currentActionIndex = 0;
async function main() {
    const dump = await get_dump_from_url();
    const r = processDump(dump);
    actions = r;
}

function next() {
    if (currentActionIndex < actions.length) {
        for (let a of actions[currentActionIndex]) {
            a.a(a.el, a.f, false, a.t);
        }
        currentActionIndex++;
    }
}

function prev() {
    if (currentActionIndex > 0) {
        currentActionIndex--;
        for (let a of actions[currentActionIndex]) {
            a.a(a.el, a.f, true, a.t);
        }
    }
}

init_geishas();
init_cartes();
main();
document.onkeydown = (evt) => {
    if (evt.key == 'ArrowRight') {
        next();
    } else if (evt.key == 'ArrowLeft') {
        prev();
    }
}