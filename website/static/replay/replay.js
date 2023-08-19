/** @type {HTMLDivElement[]} */
const CARTES = new Array(NB_CARTES_TOTALES)
/** @type {number[]} */
const CARTES_GEISHA = new Array(NB_CARTES_TOTALES)

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
        c.src = `/static/replay/assets/cartes/${CARTES_TYPE[idx]}.webp`
        c.classList.add('carte')
        target.append(c);
    }
}

function processDump(dump) {
    /** @type {moveAction[]} */
    let cartes_positions = new Array(NB_CARTES_TOTALES);
    /** @type {(JOUEUR1|JOUEUR2|EGALITE)[]} */
    let cartes_main = new Array(NB_CARTES_TOTALES).fill(EGALITE);
    /** @type {number[]} */
    let cartes_main_position = new Array(NB_CARTES_TOTALES).fill(-1);
    /** @type {boolean[]} */
    let cartes_invalidated_main = new Array(NB_CARTES_TOTALES).fill(false);
    let cartes_main_length = [0, 0]
    /** @type {number[][]} */
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

async function loadFromFile(el) {
    const f = el.files[0];
    const dump = JSON.parse(await f.text());
    processDump(dump);
    document.getElementById('load-from-file-parent')?.classList.add('hide')
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
function play() {
    updatePlaces();
    get_dump_from_url()
        .then(processDump)
        .catch(() => document.getElementById('load-from-file-parent')?.classList.remove('hide'));
}

init_cartes();
play();
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
}

function stopRun() {
    if (runTimeoutId >= 0) {
        clearTimeout(runTimeoutId);
        runTimeoutId = -1;
    }
}
