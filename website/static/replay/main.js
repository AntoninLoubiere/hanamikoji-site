const NB_GEISHAS = 7;
const NB_CARTES_TOTALES = 21;
const NB_ACTIONS = 4;
const GEISHA_VALEURS = [2, 2, 2, 3, 3, 4, 5]


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
    const matchId = Number(urlParams.get(DUMP_PARAMETER));
    if (!isNaN(matchId)) {
        return fetch(`/media/match/${matchId}/dump.json`).then(r => r.json())
    }
    return Promise.reject();
}

let HEIGHT = 0;
let WIDTH_FACTOR = 0;
let BASE_WIDTH = 1400;
let BASE_HEIGHT = 900;
function init_size() {
    let game = /** @type {HTMLElement} */ (document.getElementById('game'));
    let scaleFactor = 1;
    if (window.innerHeight < BASE_HEIGHT) {
        scaleFactor = (window.innerHeight) / BASE_HEIGHT;
    }

    let innerWidth = Math.min(window.innerWidth, 1.5 * BASE_WIDTH)
    if (innerWidth / scaleFactor < BASE_WIDTH) {
        scaleFactor = innerWidth / BASE_WIDTH
    }

    WIDTH_FACTOR = Math.max(1, innerWidth / (scaleFactor * BASE_WIDTH))
    HEIGHT = window.innerHeight / scaleFactor

    if (scaleFactor >= 1) {
        game.style.transform = '';
    } else {
        game.style.transform = `scale(${scaleFactor})`;
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

/** @type{HTMLImageElement[]} */
const CARTES = new Array(NB_CARTES_TOTALES)
/** @type{number[]} */
const CARTES_GEISHA = new Array(NB_CARTES_TOTALES)
const CARTES_TYPE = ["purple-item", "red-item", "yellow-item", "blue-item", "orange-item", "green-item", "pink-item"];

function init_cartes() {
    let idx = 0;
    let nb = GEISHA_VALEURS[idx];
    let target = /** @type {HTMLElement} */ (document.getElementById('cards-container'));
    for (let i = 0; i < NB_CARTES_TOTALES; i++) {
        if (nb <= 0) {
            idx++;
            nb = GEISHA_VALEURS[idx];
        }
        nb--;
        CARTES_GEISHA[i] = idx;
        let c = CARTES[i] = document.createElement('img')
        c.src = `./assets/cartes/${CARTES_TYPE[idx]}.webp`
        c.classList.add('carte')
        target.append(c);
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
const CARD_HEIGHT = 175;
function moveToChoixTrois(i) {
    return {
        top: (i - 1) * CARD_HEIGHT,
        topAnchor: .5,
        left: LAST_COLUMN,
        zIndex: 80 + 4 * i,
    }
}

const CHOIX_PAQUETS_OFFSET = VALIDATE_HEIGHT_OFFSET;
function moveToChoixPaquets(i) {
    const off = CHOIX_PAQUETS_OFFSET + (i % 2) * CARTE_HEIGHT_OFFSET;
    return {
        top: i < 2 ? -off : off,
        topAnchor: .5,
        left: LAST_COLUMN,
        zIndex: i < 2 ? 80 - i * 4 : 80 + i * 4,
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

function processDump(dump) {
    /** @type{moveAction[]} */
    let cartes_positions = new Array(NB_CARTES_TOTALES);
    /** @type{(JOUEUR1|JOUEUR2|EGALITE)[]} */
    let cartes_main = new Array(NB_CARTES_TOTALES).fill(EGALITE);
    /** @type{number[]} */
    let cartes_main_position = new Array(NB_CARTES_TOTALES).fill(-1);
    /** @type{boolean[]} */
    let cartes_invalidated_main = new Array(NB_CARTES_TOTALES).fill(false);
    let cartes_main_length = [0, 0]
    /** @type{number[][]} */
    let cartes_geisha = [
        new Array(NB_GEISHAS).fill(0),
        new Array(NB_GEISHAS).fill(0),
    ]
    let pioche = [];
    actions = [];
    let cartes_validees = [-1, -1];
    let cartes_choix_3 = [-1, -1, -1];
    let cartes_choix_paquets = [-1, -1, -1, -1];
    let markers = new Array(NB_GEISHAS);
    let mancheText = "";
    let scoreText = ["0 cartes, 0 points", "0 cartes, 0 points"];

    /**
     * @param {number} c
     * @param {moveAction} t
     * @param {boolean} [bypassPiocheCheck]
     */
    function moveCard(c, t, bypassPiocheCheck) {
        let act = { a: applyMoveTransition, f: cartes_positions[c], t, el: CARTES[c] }
        cartes_positions[c] = t;

        if (!bypassPiocheCheck && cartes_main[c] != EGALITE) {
            let p = cartes_main_position[c];
            let j = cartes_main[c];
            cartes_main_length[j]--;
            cartes_main[c] = EGALITE;
            cartes_main_position[c] = -1;

            for (let cd = 0; cd < NB_CARTES_TOTALES; cd++) {
                if (cartes_main[cd] == j && cartes_main_position[cd] > p) {
                    cartes_main_position[cd]--;
                    cartes_invalidated_main[cd] = true;
                }
            }
        }

        return act;
    }

    function getCarteMain(j, g) {
        for (let i = NB_CARTES_TOTALES - 1; i >= 0; i--) {
            if (CARTES_GEISHA[i] == g && cartes_main[i] == j) {
                return i;
            }
        }
        return -1;
    }

    function addToMain(p, c) {
        let act = moveCard(c, moveToMain(p, cartes_main_length[p]))
        cartes_main[c] = p;
        cartes_main_position[c] = cartes_main_length[p];
        cartes_main_length[p]++;
        return act;
    }

    function addToGeisha(j, c) {
        let g = CARTES_GEISHA[c];
        let pos = cartes_geisha[j][g]++ + 1;
        if (j == JOUEUR1) {
            pos = -pos;
        }
        return moveCard(c, moveToGeisha(g, pos));
    }

    function refreshMain() {
        let acts = []
        for (let c = 0; c < NB_CARTES_TOTALES; c++) {
            if (cartes_invalidated_main[c]) {
                cartes_invalidated_main[c] = false;
                if (cartes_main[c] != EGALITE) {
                    acts.push(moveCard(c, moveToMain(cartes_main[c], cartes_main_position[c]), true))
                }
            }
        }
        return acts;
    }

    function bougerMarker(j, g) {
        let act = {
            a: applyClassTransition,
            f: markers[g],
            t: j == JOUEUR1 ? 'marker-top' : 'marker-bot',
            el: MARKERS[g]
        }
        markers[g] = act.t
        return act
    }

    function jetonDone(j, i) {
        let act = {
            a: applyClassTransition,
            t: 'jeton-off',
            el: JETONS[j][i]
        }
        return act
    }

    function jetonToDo(j, i) {
        let act = {
            a: applyClassTransition,
            f: 'jeton-off',
            el: JETONS[j][i]
        }
        return act
    }

    function updateManche(data) {
        let act = {
            a: applyInnerTextTransition,
            el: MANCHE_STATUS,
            f: mancheText,
            t: `${data.manche + 1} / ${data.tour + 1}`
        }
        mancheText = act.t;
        return act
    }

    function updateScore(j, s, c) {
        let act = {
            a: applyInnerTextTransition,
            el: INFO_SCORE[j],
            f: scoreText[j],
            t: `${c} carte${c == 1 ? '' : 's'}, ${s} points`
        }
        scoreText[j] = act.t;
        return act;
    }

    function montrerChoixTrois(j, gs) {
        return gs.map((g, i) => {
            let c = getCarteMain(j, g);
            cartes_choix_3[i] = c;
            return moveCard(
                c,
                moveToChoixTrois(i)
            )
        })
    }

    function ajouterMontrerChoixTrois(j, choix) {
        let acts = cartes_choix_3.map((c, i) => {
            let add_j = i == choix ? autre_joueur(j) : j;
            return addToGeisha(add_j, c)
        })
        cartes_choix_3.fill(-1)
        return acts;
    }

    function montrerChoixPaquets(j, gs) {
        return gs.map((g, i) => {
            let c = getCarteMain(j, g);
            cartes_choix_paquets[i] = c;
            return moveCard(
                c,
                moveToChoixPaquets(i)
            )
        })
    }

    function ajouterMontrerChoixPaquets(j, choix) {
        let acts = cartes_choix_paquets.map((c, i) => {
            let add_j = Math.floor(i / 2) == choix ? autre_joueur(j) : j;
            return addToGeisha(add_j, c)
        })
        cartes_choix_paquets.fill(-1)
        return acts;
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
        cartes_geisha[0].fill(0);
        cartes_geisha[1].fill(0);
        cartes_invalidated_main.fill(false);
        cartes_validees.fill(-1);
        cartes_choix_3.fill(-1);
        cartes_choix_paquets.fill(-1);

        resetActs.push(updateManche(dumpData));

        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < NB_ACTIONS; i++) {
                resetActs.push(jetonToDo(j, i));
            }
            resetActs.push({
                a: applyMoveTransition,
                el: JETONS[j][0],
                f: moveToValidate(j),
                t: get_jeton_left_top(j, 0),
            },)
            resetActs.push({
                a: applyMoveTransition,
                el: JETONS[j][1],
                f: moveToDefausser(j, j),
                t: get_jeton_left_top(j, 1),
            },)
        }

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_0.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 10 + 2 * j)
            )
            acts[10 - 2 * j] = addToMain(JOUEUR1, c);
        }

        for (let j = 0; j < 6; j++) {
            let c = firstCard(dumpData.joueur_1.main[j]);
            resetActs[c] = moveCard(
                c,
                moveToPioche(PIOCHE_CENTRAL_POSITION, 9 + 2 * j)
            )
            acts[11 - 2 * j] = addToMain(JOUEUR2, c);
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
            acts[19 - j] = moveCard(
                c,
                moveToPioche(j + 1)
            );
        }

        if (dumpData.manche == 0) {
            initActions = { acts: resetActs };
            acts.unshift({
                el: TEXT_TITLES[0],
                a: applyClassTransition,
                t: 'hide'
            }, {
                el: TEXT_TITLES[1],
                a: applyClassTransition,
                t: 'hide'
            })
        } else {
            actions.push({ acts: resetActs });
        }

        actions.push({ acts, delay: 30, runDelay: 1200 });
    }

    function finishManche() {
        actions.push({
            acts: [
                addToGeisha(JOUEUR1, cartes_validees[JOUEUR1]),
                addToGeisha(JOUEUR2, cartes_validees[JOUEUR2]),
            ]
        })
        let acts = [];
        let nb_cartes = [0, 0];
        let score = [0, 0];
        for (let g = 0; g < NB_GEISHAS; g++) {
            if (cartes_geisha[JOUEUR1][g] > cartes_geisha[JOUEUR2][g]) {
                acts.push(bougerMarker(JOUEUR1, g));
                score[JOUEUR1] += GEISHA_VALEURS[g];
                nb_cartes[JOUEUR1] += 1;
            } else if (cartes_geisha[JOUEUR1][g] < cartes_geisha[JOUEUR2][g]) {
                acts.push(bougerMarker(JOUEUR2, g));
                score[JOUEUR2] += GEISHA_VALEURS[g];
                nb_cartes[JOUEUR2] += 1;
            } else {
                if (markers[g] == 'marker-top') {
                    score[JOUEUR1] += GEISHA_VALEURS[g];
                    nb_cartes[JOUEUR1] += 1;
                } else if (markers[g] == 'marker-bot') {
                    score[JOUEUR2] += GEISHA_VALEURS[g];
                    nb_cartes[JOUEUR2] += 1;
                }
            }
        }
        acts.push(updateScore(JOUEUR1, score[JOUEUR1], nb_cartes[JOUEUR1]))
        acts.push(updateScore(JOUEUR2, score[JOUEUR2], nb_cartes[JOUEUR2]))
        actions.push({ acts, end: true, runDelay: 2000 });
    }

    function validerCarte(j, c) {
        cartes_validees[j] = c;
        return [
            moveCard(c, moveToValidate(j)),
            {
                a: applyMoveTransition,
                el: JETONS[j][0],
                f: get_jeton_left_top(j, 0),
                t: moveToValidate(j)
            },
            jetonDone(j, 0)
        ]
    }

    function defausserCarte(j, g0, g1) {
        return [
            moveCard(getCarteMain(j, g0), moveToDefausser(j, 0)),
            moveCard(getCarteMain(j, g1), moveToDefausser(j, 1)),
            {
                a: applyMoveTransition,
                el: JETONS[j][1],
                f: get_jeton_left_top(j, 1),
                t: moveToDefausser(j, j)
            },
            jetonDone(j, 1)
        ]
    }

    let manche = -1;
    let attente_reponse = false;

    /** @type {string} */
    let nom0 = dump[0].joueur_0.nom;
    let nom1 = dump[1].joueur_1.nom
    if (nom0.endsWith('-1') && nom1.endsWith('-2')) {
        nom0 = nom0.slice(0, nom0.length - 2);
        nom1 = nom1.slice(0, nom1.length - 2);
    }
    TEXT_TITLES[0].innerText = nom0;
    TEXT_TITLES[1].innerText = nom1;
    INFO_NAME[0].innerText = nom0;
    INFO_NAME[1].innerText = nom1;

    for (let currentLine = 0; currentLine < dump.length; currentLine++) {
        const dumpData = dump[currentLine];
        let joueur_courant = (dumpData.manche + dumpData.tour) % 2 == 0 ? JOUEUR1 : JOUEUR2;
        if (manche != dumpData.manche) {
            if (dumpData.manche > 0) {
                finishManche();
            }

            if (dumpData.cartes_pioche != undefined) {
                nouvelleManche(dumpData);
            }
            manche = dumpData.manche;
            continue;
        }

        if (!attente_reponse) {
            actions.push({ acts: [addToMain(joueur_courant, pioche.pop()), updateManche(dumpData)] });
        }

        if (dumpData.attente_reponse) {
            const da = dumpData.derniere_action;
            if (da.action == "CHOIX_TROIS") {
                actions.push({
                    acts: [
                        ...montrerChoixTrois(da.joueur, da.cartes),
                        jetonDone(da.joueur, 2),
                        ...refreshMain(),
                    ]
                })
            } else if (da.action == "CHOIX_PAQUETS") {
                actions.push({
                    acts: [
                        ...montrerChoixPaquets(da.joueur, da.cartes),
                        jetonDone(da.joueur, 3),
                        ...refreshMain(),
                    ]
                })
            }
        } else {
            const da = dumpData.derniere_action;
            switch (da.action) {
                case "VALIDER":
                    let c = getCarteMain(da.joueur, da.cartes[0])
                    actions.push({ acts: [...validerCarte(da.joueur, c), ...refreshMain()] })
                    break;
                case "DEFAUSSER":
                    actions.push({ acts: [...defausserCarte(da.joueur, da.cartes[0], da.cartes[1]), ...refreshMain()] });
                    break;
                case "CHOIX_TROIS":
                    actions.push({
                        acts: ajouterMontrerChoixTrois(da.joueur, dumpData.dernier_choix)
                    });
                    break;
                case "CHOIX_PAQUETS":
                    actions.push({
                        acts: ajouterMontrerChoixPaquets(da.joueur, dumpData.dernier_choix)
                    });
                    break;
            }
        }
        attente_reponse = dumpData.attente_reponse;
    }

    applyActionGroup(initActions, false);
}

/**
 * @typedef action
 * @prop {any} a
 * @prop {any} [f]
 * @prop {any} [t]
 * @prop {HTMLElement} el
 *
 * @typedef actionsGroup
 * @prop {action[]} acts
 * @prop {boolean} [end]
 * @prop {number} [delay]
 * @prop {number} [runDelay]
 */
/** @type {actionsGroup[]} */
let actions = [];
/** @type {actionsGroup?} */
let initActions = null;
let currentActionIndex = 0;
function main() {
    updatePlaces();
    get_dump_from_url()
        .then(processDump)
        .catch(() => document.getElementById('load-from-file-parent')?.classList.remove('hide'));
}

function updatePlaces() {
    init_size();
    place_geishas();
    place_texts();
    place_jetons();
}

async function loadFromFile(el) {
    const f = el.files[0];
    const dump = JSON.parse(await f.text());
    processDump(dump);
    document.getElementById('load-from-file-parent')?.classList.add('hide')
}

let delayedInProgress = false;

/**
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

function next(b) {
    if (delayedInProgress) return true;
    if (!b) {
        stopRun();
    }
    if (currentActionIndex < actions.length) {
        applyActionGroup(actions[currentActionIndex], false);
        currentActionIndex++;
        return true;
    }
    return false;
}

function prev() {
    if (delayedInProgress) return;

    stopRun();
    if (currentActionIndex > 0) {
        currentActionIndex--;
        applyActionGroup(actions[currentActionIndex], true)
    }
}

function nextUntilEnd() {
    if (delayedInProgress) return;
    stopRun();
    while (currentActionIndex < actions.length) {
        applyActionGroupSeq(actions[currentActionIndex], false)
        currentActionIndex++;
        if (actions[currentActionIndex - 1].end) {
            break;
        }
    }
}

function prevUntilEnd() {
    if (delayedInProgress) return;
    stopRun();
    while (currentActionIndex > 0) {
        currentActionIndex--;
        applyActionGroupSeq(actions[currentActionIndex], true)
        if (currentActionIndex > 0 && actions[currentActionIndex - 1].end) {
            break;
        }
    }
}

let runTimeoutId = -1;
function runStep() {
    if (next(true)) {
        runTimeoutId = setTimeout(runStep, actions[currentActionIndex - 1].runDelay || 900);
    } else {
        runTimeoutId = -1;
    }
}

function toggleRun() {
    if (runTimeoutId < 0) {
        if (currentActionIndex >= actions.length) {
            for (let j = actions.length - 1; j >= 0; j--) {
                applyActionGroupSeq(actions[j], true);
            }
            currentActionIndex = 0;
            runTimeoutId = setTimeout(runStep, actions[0].runDelay || 900);
        } else {
            runStep();
        }
    } else {
        stopRun();
    }
}

function toggleFullScreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen()
    } else {
        document.body.requestFullscreen()
    }
}

function stopRun() {
    if (runTimeoutId >= 0) {
        clearTimeout(runTimeoutId);
        runTimeoutId = -1;
    }
}


init_cartes();
main();
document.onkeydown = (evt) => {
    if (evt.key == 'ArrowRight') {
        if (evt.ctrlKey) {
            nextUntilEnd()
        } else {
            next();
        }
    } else if (evt.key == 'ArrowLeft') {
        if (evt.ctrlKey) {
            prevUntilEnd()
        } else {
            prev();
        }
    } else if (evt.key == ' ') {
        toggleRun();
    }
}

document.body.onresize = () => {
    updatePlaces();
    applyActionGroup(initActions, false);
    for (let i = 0; i < currentActionIndex; i++) {
        applyActionGroupSeq(actions[i], false); // On réapplique toutes les transitions
    }
    console.log("????");
}