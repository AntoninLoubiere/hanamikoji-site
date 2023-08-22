const NB_GEISHAS = 7;
const NB_CARTES_TOTALES = 21;
const NB_ACTIONS = 4;
const GEISHA_VALEURS = [2, 2, 2, 3, 3, 4, 5]
const CARTES_TYPE = ["purple-item", "red-item", "yellow-item", "blue-item", "orange-item", "green-item", "pink-item"];


const JOUEUR1 = 0;
const JOUEUR2 = 1;
const EGALITE = 2;

function autre_joueur(j) {
    return 1 - j;
}

function get_dump_from_url() {
    const DUMP_PARAMETER = 'match'

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const PLAY_BEACON = 'play-';
    const matchTxt = urlParams.get(DUMP_PARAMETER);
    if (matchTxt?.startsWith(PLAY_BEACON)) {
        return fetch(`/media/play/${encodeURIComponent(matchTxt.slice(PLAY_BEACON.length))}/dump.json`).then(r => r.json())
    }
    const matchId = Number(matchTxt);
    if (!isNaN(matchId)) {
        return fetch(`/media/match/${matchId}/dump.json`).then(r => r.json())
    }
    return Promise.reject();
}

let HEIGHT = 0;
let WIDTH_FACTOR = 0;
let BASE_WIDTH = 1400;
let BASE_HEIGHT = 900;
let clampedInnerWidth = 0;
let SCALE_FACTOR = 1;
function init_size() {
    let game = /** @type {HTMLElement} */ (document.getElementById('game'));
    SCALE_FACTOR = 1;
    if (window.innerHeight < BASE_HEIGHT) {
        SCALE_FACTOR = (window.innerHeight) / BASE_HEIGHT;
    }

    clampedInnerWidth = Math.min(window.innerWidth, 1.5 * BASE_WIDTH)
    if (clampedInnerWidth / SCALE_FACTOR < BASE_WIDTH) {
        SCALE_FACTOR = clampedInnerWidth / BASE_WIDTH
    }

    WIDTH_FACTOR = Math.max(1, clampedInnerWidth / (SCALE_FACTOR * BASE_WIDTH))
    HEIGHT = window.innerHeight / SCALE_FACTOR

    if (SCALE_FACTOR >= 1) {
        game.style.transform = '';
    } else {
        game.style.transform = `scale(${SCALE_FACTOR})`;
    }

}

/** @type{HTMLImageElement[]} */
const GEISHAS = new Array(NB_GEISHAS)
/** @type{number[]} */
const GEISHAS_LEFT_OFFSET = new Array(NB_GEISHAS)
/** @type{HTMLImageElement[]} */
const MARKERS = new Array(NB_GEISHAS)
const GEISHA_FIRST_LEFT_OFFSET = 260
const GEISHA_SPACE_BETWEEN = 125;
function place_geishas() {
    for (let i = 0; i < NB_GEISHAS; i++) {
        const left = GEISHAS_LEFT_OFFSET[i] = GEISHA_FIRST_LEFT_OFFSET + i * GEISHA_SPACE_BETWEEN;
        const g = GEISHAS[i] = /** @type{HTMLImageElement} */ (document.getElementById('geisha' + i));
        g.style.left = `${left * WIDTH_FACTOR}px`
        g.style.top = `${HEIGHT / 2}px`
        const m = MARKERS[i] = /** @type{HTMLImageElement} */ (document.getElementById('marker' + i));
        m.style.left = `${left * WIDTH_FACTOR}px`
        m.style.top = `${HEIGHT / 2}px`
    }
}

/** @type{HTMLImageElement[][]} */
const JETONS = [
    new Array(NB_ACTIONS),
    new Array(NB_ACTIONS),
]
const JETON_SPACE_BETWEEN = 100;
const JETON_LEFT = 150;
function get_jeton_left_top(j, i) {
    let offset_left = JETON_LEFT;
    let offset_top = 75;
    if (1 <= i && i <= 2) {
        offset_top += JETON_SPACE_BETWEEN
    }
    if (i >= 2) {
        offset_left -= JETON_SPACE_BETWEEN;
    }
    return {
        left: offset_left,
        top: j == JOUEUR1 ? offset_top : - offset_top,
        topAnchor: j == JOUEUR1 ? 0 : 1,
        leftFixed: true,
        zIndex: 0
    }
}

function place_jetons() {
    for (let j = 0; j < 2; j++) {
        for (let i = 0; i < NB_ACTIONS; i++) {
            let jet = JETONS[j][i] = /** @type {HTMLImageElement} */ (document.getElementById(`j${j}-${i}`))
            applyMove(jet, get_jeton_left_top(j, i));
        }
    }
}

/** @type{HTMLSpanElement[]} */
const TEXT_TITLES = new Array(2);
const INFO_NAME = [
    /** @type {HTMLSpanElement} */ (document.getElementById('info-name-0')),
    /** @type {HTMLSpanElement} */ (document.getElementById('info-name-1')),
];
const INFO_SCORE = [
    /** @type {HTMLSpanElement} */ (document.getElementById('info-score-0')),
    /** @type {HTMLSpanElement} */ (document.getElementById('info-score-1')),
]
const MANCHE_STATUS = /** @type{HTMLSpanElement} */ (document.getElementById('manche-status'));

function place_texts() {
    let t = TEXT_TITLES[0] = /** @type{HTMLElement} */(document.getElementById('title-j0'));
    t.style.top = `${HEIGHT / 4}px`
    t.style.left = `${GEISHAS_LEFT_OFFSET[3] * WIDTH_FACTOR}px`;
    t = TEXT_TITLES[1] = /** @type{HTMLElement} */(document.getElementById('title-j1'));
    t.style.top = `${3 * HEIGHT / 4}px`
    t.style.left = `${GEISHAS_LEFT_OFFSET[3] * WIDTH_FACTOR}px`;

    t = /** @type{HTMLElement} */ (document.getElementById('info-section-0'));
    t.style.top = '0';
    t.style.left = `${(LAST_COLUMN - GEISHA_SPACE_BETWEEN / 2) * WIDTH_FACTOR}px`;
    t.style.maxWidth = `${(GEISHA_SPACE_BETWEEN * 1.2) * WIDTH_FACTOR}px`
    t = /** @type{HTMLElement} */ (document.getElementById('info-section-1'));
    t.style.top = `${HEIGHT}px`;
    t.style.left = `${(LAST_COLUMN - GEISHA_SPACE_BETWEEN / 2) * WIDTH_FACTOR}px`;
    t.style.maxWidth = `${(GEISHA_SPACE_BETWEEN * 1.2) * WIDTH_FACTOR}px`
}

const CARTE_HEIGHT_OFFSET = 35;
const PIOCHE_LEFT_OFFSET = 100
const PIOCHE_CENTRAL_POSITION = 4;
/**
 * @typedef moveAction
 * @prop {number} top
 * @prop {number} topAnchor
 * @prop {number} left
 * @prop {boolean} [leftFixed]
 * @prop {number} [zIndex]
 *
 * @param {HTMLElement} el
 * @param {moveAction} moveAction
 */
function applyMove(el, moveAction) {
    el.style.top = `${moveAction.top + HEIGHT * moveAction.topAnchor}px`
    el.style.left = `${moveAction.leftFixed ? moveAction.left : moveAction.left * WIDTH_FACTOR}px`
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
        top: - PIOCHE_CENTRAL_POSITION * CARTE_HEIGHT_OFFSET + position * CARTE_HEIGHT_OFFSET,
        topAnchor: .5,
        left: PIOCHE_LEFT_OFFSET,
        leftFixed: true,
        zIndex: overrideZIndex ?? 10 + position
    }
}

const CARTES_GEISHA_OFFSET = 140;
/**
 * @param {number} position
 * @return {moveAction}
*/
function moveToGeisha(geisha, position) {
    return {
        top: (position > 0 ? CARTES_GEISHA_OFFSET : -CARTES_GEISHA_OFFSET) + position * CARTE_HEIGHT_OFFSET,
        topAnchor: .5,
        left: GEISHAS_LEFT_OFFSET[geisha],
        zIndex: 9 + position
    }
}

const CARTES_MAIN_HEIGHT_OFFSET = 95;

/**
 * @param {number} position
 * @returns {moveAction}
*/
function moveToMain(joueur, position) {
    return {
        top: joueur == JOUEUR1 ? CARTES_MAIN_HEIGHT_OFFSET : - CARTES_MAIN_HEIGHT_OFFSET,
        topAnchor: joueur == JOUEUR1 ? 0 : 1,
        left: GEISHAS_LEFT_OFFSET[0] + position * GEISHA_SPACE_BETWEEN,
        zIndex: 10 + 2 * position - joueur,
    }
}

const VALIDATE_HEIGHT_OFFSET = 120;
const VALIDATE_LEFT_OFFSET = GEISHA_SPACE_BETWEEN * NB_GEISHAS + GEISHA_FIRST_LEFT_OFFSET;
function moveToValidate(joueur) {
    return {
        top: joueur == JOUEUR1 ? -VALIDATE_HEIGHT_OFFSET : VALIDATE_HEIGHT_OFFSET,
        topAnchor: .5,
        left: VALIDATE_LEFT_OFFSET,
        zIndex: 20
    }
}

const DEFAUSSER_HEIGHT_OFFSET = 300;
function moveToDefausser(joueur, o) {
    const off = DEFAUSSER_HEIGHT_OFFSET + o * CARTE_HEIGHT_OFFSET;
    return {
        top: joueur == JOUEUR1 ? -off : off,
        topAnchor: .5,
        left: VALIDATE_LEFT_OFFSET,
        zIndex: joueur == JOUEUR1 ? 20 - o : 20 + o
    }
}

const LAST_COLUMN = VALIDATE_LEFT_OFFSET + GEISHA_SPACE_BETWEEN;
const CHOIX_TROIS_CARTE_OFFSET = 190;
function moveToChoixTrois(i) {
    return {
        top: (i - 1) * CHOIX_TROIS_CARTE_OFFSET,
        topAnchor: .5,
        left: LAST_COLUMN,
        zIndex: 80 + 4 * i,
    }
}

const CHOIX_PAQUETS_OFFSET = VALIDATE_HEIGHT_OFFSET;
function moveToChoixPaquets(i) {
    let off = CHOIX_PAQUETS_OFFSET;
    if (i == 0 || i == 3) {
        off += CARTE_HEIGHT_OFFSET
    }
    return {
        top: i < 2 ? -off : off,
        topAnchor: .5,
        left: LAST_COLUMN,
        zIndex: 80 + i * 4,
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


/**
 *
 * @param {HTMLElement} el
 * @param {string} f
 * @param {string} t
 * @param {boolean} reverse
 */
function applyInnerTextTransition(el, f, reverse, t) {
    if (reverse) {
        el.innerText = f;
    } else {
        el.innerText = t;
    }
}

/**
 *
 * @param {HTMLElement} el
 * @param {string} f
 * @param {string} t
 * @param {boolean} reverse
 */
function applyClassTransition(el, f, reverse, t) {
    if (reverse) {
        if (t) {
            el.classList.remove(t)
        }
        if (f) {
            el.classList.add(f)
        }
    } else {
        if (f) {
            el.classList.remove(f)
        }
        if (t) {
            el.classList.add(t)
        }
    }
}

function updatePlaces() {
    init_size();
    place_geishas();
    place_texts();
    place_jetons();
}

let delayedInProgress = false;

/**
 * @typedef actionsGroup
 * @prop {action[]} acts
 * @prop {boolean} [end]
 * @prop {number} [delay]
 * @prop {number} [runDelay]
 *
 * @param {actionsGroup} g
 * @param {boolean} reverse
 */
function applyActionGroupSeq(g, reverse) {
    for (let a of g.acts) {
        a.a(a.el, a.f, reverse, a.t);
    }
}

function applyActionGroupDelay(g, reverse, i) {
    const a = reverse ? g.acts[g.acts.length - i - 1] : g.acts[i];
    a.a(a.el, a.f, reverse, a.t);
    i++;
    if (i < g.acts.length) {
        delayedInProgress = true;
        setTimeout(applyActionGroupDelay, g.delay, g, reverse, i);
    } else {
        delayedInProgress = false;
    }
}

function applyActionGroup(g, reverse) {
    if (g.delay) {
        applyActionGroupDelay(g, reverse, 0);
    } else {
        applyActionGroupSeq(g, reverse)
    }
}


function toggleFullScreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen()
    } else {
        document.body.requestFullscreen()
    }
}
