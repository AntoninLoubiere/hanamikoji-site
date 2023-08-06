const NB_GEISHAS = 7;
const NB_CARTES_TOTALES = 21;
const GEISHA_VALEURS = [2, 2, 2, 3, 3, 4, 5]

const HEIGHT = window.innerHeight;

const JOUEUR1 = 0;
const JOUEUR2 = 1;
const EGALITE = 2;

function get_dump_from_url()
{
    const DUMP_PARAMETER = 'dump'

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const fileUrl = urlParams.get(DUMP_PARAMETER);
    if (fileUrl) {
        return fetch(fileUrl).then(r => r.json())
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
        zIndex: 30,
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

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_0.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 20 - 2 * j)
            )
            acts[2 * j] = moveCard(
                c,
                moveToMain(JOUEUR1, j)
            );
        }

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_1.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 19 - 2 * j)
            )
            acts[2 * j + 1] = moveCard(
                c,
                moveToMain(JOUEUR2, j)
            );
        }

        for (let j = 0; j < 8; j++) {
            let c = firstCard(dumpData.cartes_pioche[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 8 - j)
            )
            acts[12 + j] = moveCard(
                c,
                moveToPioche(8 - j)
            );
        }
        let c = firstCard(dumpData.carte_ecartee);
        resetActs[c] = moveCard(
            c,
            moveToPioche(PIOCHE_CENTRAL_POSITION, 0)
        )
        acts[20] = moveCard(
            c,
            moveToPioche(0)
        );

        if (dumpData.manche == 0) {
            console.log(resetActs);
            for (let a of resetActs) {
                a.a(a.el, a.f, false, a.t);
            }
        } else {
            actions.push(resetActs);
        }

        actions.push(acts);
    }

    let manche = -1;

    for (let currentLine = 0; currentLine < dump.length; currentLine++) {
        const dumpData = dump[currentLine];
        if (manche != dumpData.manche && dumpData.manche < 3) {
            nouvelleManche(dumpData);
            manche = dumpData.manche;
            continue;
        }


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
main()