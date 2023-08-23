/** @type {WebSocket?} */
let connection = null;
let connectionTry = 0;
function connect() {
    if (connection != null) {
        connection.close()
    }
    setStatusMsg('connection');
    connection = new WebSocket(`${document.location.protocol == 'https:' ? 'wss' : 'ws'}://${window.location.host}/play`)
    connection.onmessage = (e) => {
        let data;
        try {
            data = JSON.parse(e.data);
        } catch {
            console.error(e.data)
            if (e.data.includes("Il perd donc.") || e.data.includes("socket.cc") || e.data.includes("Sandbox call exceeded the time limit")) {
                setStatusMsg("err_eof");
            }
            return
        }
        connectionTry = 0;
        onMessage(data);
    }

    connection.addEventListener('open', () => {
        setStatusMsg('connected');
    })

    connection.onclose = (err) => {
        connection = null;
        let reconnectSecondes = Math.max(1000, Math.min(60000, 5000 * connectionTry));
        currentStatusMsg = 'connection-lost'
        STATUS_TITLE.innerText = `Connexion perdue, reconnexion dans ${reconnectSecondes / 1000}s #${connectionTry + 1}`
        connectionTry++;
        openNewGameModal();
        setTimeout(connect, reconnectSecondes)
    }
}

let defiUsername = null;
let acceptedDefi = null;
const defiModal = /** @type {HTMLElement} */ (document.getElementById('defi-popup'));
const defiName = /** @type {HTMLSpanElement} */ (document.getElementById('defi-name'));
function showDefi(username) {
    defiModal.classList.remove('hide');
    defiUsername = username;
    defiName.innerText = username;
}

function hideDefi() {
    defiModal.classList.add('hide');
    acceptedDefi = null;
    defiUsername = null;
}

function rejectDefi() {
    connection?.send(JSON.stringify({ msg: "defi-reject", user: defiUsername }))
    hideDefi();
}

function acceptDefi() {
    acceptedDefi = defiUsername;
    if (gameRunning) {
        stopGame()
    } else {
        _sendStartGame(acceptedDefi, false);
        acceptedDefi = null;
    }
}

function onMessage(msg) {
    switch (msg.msg) {
        case 'run':
            if (msg.status == "started" || msg.status == "waiting") {
                gameRunning = true;
                initGame(msg);
                if (msg.champion == defiUsername) hideDefi();

                if (msg.status == "started") {
                    setStatusMsg('adv_turn');
                } else {
                    setStatusMsg('adv_wait');
                }
            } else if (msg.status == "ended") {
                gameRunning = false;
                setStatusMsg('ok_match_end');
                if (acceptedDefi != null) {
                    _sendStartGame(acceptedDefi, false);
                    acceptedDefi = null;
                } else {
                    if (modal?.classList.contains('hide')) {
                        START_NEW_MANCHE_BUTTON.classList.remove('hide');
                        START_NEW_MANCHE_BUTTON.innerText = "Terminer";
                    }
                }
            }
            break;
        case 'status':
            onStatus(msg);
            break;
        case 'choix':
            onChoix(msg)
            break;
        case 'defi':
            showDefi(msg.user);
            break;
        case 'new-manche':
            onNewMancheMsg(msg);
            break;
        case 'err':
            if (msg.code != 'unk-champion' && msg.code != 'already-running' && msg.code != 'eof') {
                console.error("ERR", msg.code);
            }
            if (['already-running', 'unk-champion', 'defi_reject'].includes(msg.code)) {
                openNewGameModal();
            }
            if (msg.code == 'no-game' && acceptedDefi != null) {
                _sendStartGame(acceptedDefi, false);
            }
            setStatusMsg(`err_${msg.code}${msg.nb || ''}`);
            break;
        default:
            console.info(msg);
    }
}

function onNewMancheMsg(data) {
    MANCHE_STATUS.innerText = `${data.manche + 1}/${data.tour + 1}`
    updateScore(data);
    delayedManche = data.manche;
    if (data.manche == 0) {
        startNewManche();
    } else {
        START_NEW_MANCHE_BUTTON.classList.remove('hide');
        setStatusMsg("wait-start-new-manche");
    }
}

let delayedEndMancheData = null;
let delayedManche = -1;
function onStatus(data) {
    if (cartesEnAttenteAdv) {
        if (cartesEnAttenteAdv == 2) {
            for (let j = 0; j < 3; j++) {
                let cid = cartes_en_attente[j];
                let g = PLAY_CARTES[cid].geisha;
                validerCarte(cid, cartesValidees[MAIN_ADV][g] < data.cv_adv[g] ? MAIN_ADV : MAIN_USER);
                outlineElement(PLAY_CARTES[cid].el);
            }
        } else if (cartesEnAttenteAdv == 3) {
            let c0 = cartes_en_attente[0]
            let g0 = PLAY_CARTES[c0].geisha;
            let c1 = cartes_en_attente[1]
            let g1 = PLAY_CARTES[c1].geisha;
            let c2 = cartes_en_attente[2]
            let c3 = cartes_en_attente[3]

            if ((g0 == g1 && cartesValidees[MAIN_ADV][g0] < data.cv_adv[g0] - 1) ||
                (cartesValidees[MAIN_ADV][g0] < data.cv_adv[g0] && cartesValidees[MAIN_ADV][g1] < data.cv_adv[g1])) {
                validerCarte(c1, MAIN_ADV);
                validerCarte(c0, MAIN_ADV);
                validerCarte(c2, MAIN_USER);
                validerCarte(c3, MAIN_USER);
            } else {
                validerCarte(c0, MAIN_USER);
                validerCarte(c1, MAIN_USER);
                validerCarte(c3, MAIN_ADV);
                validerCarte(c2, MAIN_ADV);
            }
            outlineElement(PLAY_CARTES[c0].el);
            outlineElement(PLAY_CARTES[c1].el);
            outlineElement(PLAY_CARTES[c2].el);
            outlineElement(PLAY_CARTES[c3].el);
        }
        cartesEnAttenteAdv = 0;
        cartes_en_attente.fill(-1);
    }

    if (delayedManche != data.manche) {
        delayedManche = data.manche;
        if (delayedEndMancheData != null) {
            console.log("DATA LOSS ?", { data, delayedEndData: delayedEndMancheData })
        }
        delayedEndMancheData = data;
        onNewMancheMsg(data);
    } else {
        applyOnStatus(data);
    }
}

const START_NEW_MANCHE_BUTTON = /** @type {HTMLButtonElement} */ (document.getElementById('end-manche'));
function onStartNewMancheClick() {
    if (!gameRunning || (delayedEndMancheData && isLastStatus(delayedEndMancheData))) {
        openNewGameModal();
    } else {
        resetNouvelleManche();
        setTimeout(() => {
            startNewManche();
        }, 1000);
    }
    START_NEW_MANCHE_BUTTON.classList.add('hide');
}

function startNewManche() {
    if (delayedEndMancheData == null) {
        resetNouvelleManche();
        for (let j = 0; j < 6; j++) {
            ajouterALaMain(MAIN_ADV, piocherCarte());
            ajouterALaMain(MAIN_USER, piocherCarte());
        }
        ajouterALaMain(MAIN_ADV, piocherCarte());
        setStatusMsg('adv_turn')
    } else if (!gameRunning || isLastStatus(delayedEndMancheData)) {
        openNewGameModal();
    } else {
        resetNouvelleManche();
        applyOnStatus(delayedEndMancheData);
    }
    delayedEndMancheData = null;
}

function isLastStatus(data) {
    return data.carte_piochee < 0 && !data.attente_reponse
}

function applyOnStatus(data) {
    MANCHE_STATUS.innerText = `${data.manche + 1}/${data.tour + 1}`
    if (manche != data.manche) {
        manche = data.manche;
        if (manche == 0) {
            TEXT_TITLES[0].classList.add('hide');
            TEXT_TITLES[1].classList.add('hide');
        }

        for (let j = mains[MAIN_USER].length; j < data.cartes.length; j++) {
            ajouterALaMain(MAIN_USER, piocherCarte());
        }

        for (let i = 0; i < data.cartes.length; i++) {
            let c = mains[MAIN_USER][i];
            retournerGeisha(c, data.cartes[i]);
        }

    } else if (data.carte_piochee >= 0 && data.tour > tour) {
        let c = piocherCarte();
        retournerGeisha(c, data.carte_piochee);
        ajouterALaMain(MAIN_USER, c);
    }

    if (isLastStatus(data) || data.tour <= tour) return;
    let audio = new Audio("/static/play/bell-me.mp3");
    audio.play();
    setStatusMsg('user_turn');
    tour = data.tour;

    let last_act = data.derniere_action.act;
    if (tour > 0 && last_act < NB_ACTIONS && actionsAvailable[0][last_act]) {
        JETONS[MAIN_ADV][last_act].classList.add('jeton-off');
        actionsAvailable[MAIN_ADV][last_act] = false;

        if (last_act == 0) {
            let c = PLAY_CARTES[popCardFromAdv()]
            c.status = VALIDER_SECRETEMENT;
            c.statusPosition = MAIN_ADV;
            applyMove(c.el, moveToValidate(MAIN_ADV));
            applyMove(JETONS[MAIN_ADV][0], moveToValidate(MAIN_ADV));
            outlineElement(c.el);
        } else if (last_act == 1) {
            for (let i = 0; i < 2; i++) {
                let c = PLAY_CARTES[popCardFromAdv()];
                c.status = DEFAUSSER_SECRETEMENT;
                c.statusPosition = i;
                applyMove(c.el, moveToDefausser(MAIN_ADV, i));
                outlineElement(c.el);
            }
            applyMove(JETONS[MAIN_ADV][1], moveToDefausser(MAIN_ADV, 0));
        }
    }

    if (data.attente_reponse) {
        if (last_act == 2) {
            let cartes = [data.derniere_action.c1, data.derniere_action.c2, data.derniere_action.c3]
            for (let i = 0; i < 3; i++) {
                let c = popCardFromAdv();
                cartes_en_attente[i] = c;
                retournerGeisha(c, cartes[i]);
                PLAY_CARTES[c].status = ATTENTE_CHOIX_TROIS[i];
                outlineElement(PLAY_CARTES[c].el)
                applyMove(PLAY_CARTES[c].el, moveToChoixTrois(i))
            }
        } else if (last_act == 3) {
            let cartes = [data.derniere_action.c1, data.derniere_action.c2, data.derniere_action.c3, data.derniere_action.c4]
            for (let i = 0; i < 4; i++) {
                let c = popCardFromAdv();
                cartes_en_attente[i] = c;

                retournerGeisha(c, cartes[i]);
                PLAY_CARTES[c].status = ATTENTE_CHOIX_PAQUETS[i < 2 ? 0 : 1];
                PLAY_CARTES[c].statusPosition = i
                outlineElement(PLAY_CARTES[c].el)
                applyMove(PLAY_CARTES[c].el, moveToChoixPaquets(i))
            }

        } else {
            console.error("????? attente ?", last_act);
        }
    } else {
        canSelect = true;
    }

    for (let j = mains[MAIN_ADV].length; j < data.nb_cartes_adv; j++) {
        ajouterALaMain(MAIN_ADV, piocherCarte());
    }
}

function onChoix(data) {
    if (cartesEnAttenteAdv == 2) {
        for (let j = 0; j < 3; j++) {
            let cid = cartes_en_attente[j];
            validerCarte(cid, data.choix == j ? MAIN_ADV : MAIN_USER);
            outlineElement(PLAY_CARTES[cid].el);
        }
    } else if (cartesEnAttenteAdv == 3) {
        let c0 = cartes_en_attente[0]
        let c1 = cartes_en_attente[1]
        let c2 = cartes_en_attente[2]
        let c3 = cartes_en_attente[3]

        if (data.choix == 0) {
            validerCarte(c1, MAIN_ADV);
            validerCarte(c0, MAIN_ADV);
            validerCarte(c2, MAIN_USER);
            validerCarte(c3, MAIN_USER);
        } else {
            validerCarte(c0, MAIN_USER);
            validerCarte(c1, MAIN_USER);
            validerCarte(c3, MAIN_ADV);
            validerCarte(c2, MAIN_ADV);
        }
        outlineElement(PLAY_CARTES[c0].el);
        outlineElement(PLAY_CARTES[c1].el);
        outlineElement(PLAY_CARTES[c2].el);
        outlineElement(PLAY_CARTES[c3].el);
    } else {
        console.error("Excepted choice !")
    }
    cartesEnAttenteAdv = 0;
    cartes_en_attente.fill(-1);
    adversairePiocherEndAction();
}

function adversairePiocherEndAction() {
    if (tour < 7) {
        ajouterALaMain(MAIN_ADV, piocherCarte());
    }
}

function ajouterALaMain(j, c) {
    let pos = mains[j].push(c) - 1;
    PLAY_CARTES[c].status = j;
    PLAY_CARTES[c].statusPosition = pos;
    PLAY_CARTES[c].selected = false;
    applyMove(PLAY_CARTES[c].el, moveToMain(j, pos));
}

function popCardFromAdv() {
    return mains[MAIN_ADV].pop() ?? piocherCarte();
}

function validerCarte(cid, j) {
    let c = PLAY_CARTES[cid];
    c.status = VALIDER_ADV + j;
    const g = c.geisha;
    let nb = ++cartesValidees[j][g];
    if (j == MAIN_ADV) {
        nb *= -1;
    }
    c.statusPosition = nb;
    applyMove(c.el, moveToGeisha(g, nb))
}

function resetNouvelleManche(force) {
    if (!force && tour < 0) return; // Already reseted.
    clearCartesOutlined();
    pioche_idx = 0;
    tour = -1;
    canSelect = false;
    START_NEW_MANCHE_BUTTON.classList.add('hide');
    let pos = moveToPioche(PIOCHE_CENTRAL_POSITION)
    for (let i = 0; i < NB_CARTES_TOTALES; i++) {
        applyMove(PLAY_CARTES[i].el, pos);
        PLAY_CARTES[i].el.classList.add('hide')
        PLAY_CARTES[i].status = PIOCHE;
        PLAY_CARTES[i].geisha = NB_GEISHAS;
    }

    for (let a = 0; a < NB_ACTIONS; a++) {
        JETONS[0][a].classList.remove('jeton-off')
        JETONS[1][a].classList.remove('jeton-off')
        JETONS[MAIN_USER][a].classList.remove('jeton-selected')
        applyMove(JETONS[0][a], get_jeton_left_top(0, a));
        applyMove(JETONS[1][a], get_jeton_left_top(1, a));
    }

    actionsAvailable[0].fill(true);
    actionsAvailable[1].fill(true);
    cartesValidees[0].fill(0);
    cartesValidees[1].fill(0);

    mains[0] = [];
    mains[1] = [];

    cartesEnAttenteAdv = 0;
    cartes_en_attente.fill(-1);
    cartesSelectionnees = []
}

function updateScore(data) {
    let nb_cartes = [0, 0];
    let score = [0, 0];

    for (let g = 0; g < NB_GEISHAS; g++) {
        if (data.possession[g] == 1 - data.joueur) {
            nb_cartes[MAIN_ADV] += 1;
            score[MAIN_ADV] += GEISHA_VALEURS[g];
            MARKERS[g].classList.add('marker-top')
            MARKERS[g].classList.remove('marker-bot')
        } else if (data.possession[g] == data.joueur) {
            nb_cartes[MAIN_USER] += 1;
            score[MAIN_USER] += GEISHA_VALEURS[g];
            MARKERS[g].classList.remove('marker-top')
            MARKERS[g].classList.add('marker-bot')
        }
    }

    INFO_SCORE[MAIN_ADV].innerText = `${nb_cartes[MAIN_ADV]} carte${nb_cartes[MAIN_ADV] == 1 ? '' : 's'}, ${score[MAIN_ADV]} points`
    INFO_SCORE[MAIN_USER].innerText = `${nb_cartes[MAIN_USER]} carte${nb_cartes[MAIN_USER] == 1 ? '' : 's'}, ${score[MAIN_USER]} points`
}

let joueur_user = 2;
let pioche_idx = 0;
/** @type {number[][]} */
let mains = [[], []]
let manche = -1;
let tour = -1;
let actionsAvailable = [
    [true, true, true, true],
    [true, true, true, true],
]
let cartes_en_attente = new Array(4);
let cartesValidees = [new Array(NB_GEISHAS), new Array(NB_GEISHAS)];
let cartesSelectionnees = []
/** @type {HTMLElement[]} */
let cartesOutlined = [];
let canSelect = false;
let cartesEnAttenteAdv = 0;
let adv_name = "Champion";
let gameRunning = false;
function initGame(msg) {
    MANCHE_STATUS.innerText = `1/1`
    joueur_user = msg?.joueur ?? 0;
    manche = -1;
    delayedManche = -1;
    mains = [[], []]
    delayedEndMancheData = null;
    adv_name = msg?.champion ?? "Champion";
    TEXT_TITLES[MAIN_ADV].innerText = adv_name;
    TEXT_TITLES[MAIN_USER].innerText = msg?.user ?? username;
    INFO_NAME[MAIN_ADV].innerText = adv_name;
    INFO_NAME[MAIN_USER].innerText = msg?.user ?? username;
    TEXT_TITLES[0].classList.remove('hide');
    TEXT_TITLES[1].classList.remove('hide');
    START_NEW_MANCHE_BUTTON.innerText = "Continuer";
    START_NEW_MANCHE_BUTTON.classList.add('hide');
    modal.classList.add('hide');

    resetNouvelleManche(true)

    for (let g = 0; g < NB_GEISHAS; g++) {
        MARKERS[g].classList.remove('marker-top')
        MARKERS[g].classList.remove('marker-bot')
    }
}

function clearCartesOutlined() {
    for (let el of cartesOutlined) {
        el.classList.remove('outlined');
    }
    cartesOutlined = [];
}

function outlineElement(el) {
    cartesOutlined.push(el);
    el.classList.add('outlined');
}

function piocherCarte() {
    console.assert(pioche_idx < NB_CARTES_TOTALES);
    return pioche_idx++;
}

function retournerGeisha(i, geisha) {
    PLAY_CARTES[i].front.src = `/static/replay/assets/cartes/${CARTES_TYPE[geisha]}.webp`;
    PLAY_CARTES[i].el.classList.remove('hide');
    PLAY_CARTES[i].geisha = geisha;
}

function onCarteClick(c) {
    const status = PLAY_CARTES[c].status;
    if (!cartesEnAttenteAdv && ATTENTE_CHOIX_TROIS[0] <= status && status <= ATTENTE_CHOIX_TROIS[2]) {
        let choice = status - ATTENTE_CHOIX_TROIS[0];
        sendChoix(choice)
        for (let i = 2; i >= 0; i--) {
            validerCarte(cartes_en_attente[i], choice == i ? MAIN_USER : MAIN_ADV);
        }
        cartes_en_attente.fill(-1);
        onEndAction(false)
    } else if (!cartesEnAttenteAdv && ATTENTE_CHOIX_PAQUETS[0] <= status && status <= ATTENTE_CHOIX_PAQUETS[1]) {
        let choice = status - ATTENTE_CHOIX_PAQUETS[0];
        sendChoix(choice)
        if (choice == 0) {
            validerCarte(cartes_en_attente[0], MAIN_USER);
            validerCarte(cartes_en_attente[1], MAIN_USER);
            validerCarte(cartes_en_attente[3], MAIN_ADV);
            validerCarte(cartes_en_attente[2], MAIN_ADV);
        } else {
            validerCarte(cartes_en_attente[1], MAIN_ADV);
            validerCarte(cartes_en_attente[0], MAIN_ADV);
            validerCarte(cartes_en_attente[2], MAIN_USER);
            validerCarte(cartes_en_attente[3], MAIN_USER);
        }
        cartes_en_attente.fill(-1);
        onEndAction(false)
    } else if (canSelect && PLAY_CARTES[c].status == MAIN_USER) {
        if (PLAY_CARTES[c].selected) {
            const index = cartesSelectionnees.indexOf(c);
            console.assert(index > -1)
            cartesSelectionnees.splice(index, 1);
            PLAY_CARTES[c].selected = false;
            applyMove(PLAY_CARTES[c].el, moveToMain(MAIN_USER, PLAY_CARTES[c].statusPosition));
            updateSelected(-1);
        } else {
            let mc = getMaxCardSelect();
            if (cartesSelectionnees.length < mc) {
                cartesSelectionnees.push(c)
                PLAY_CARTES[c].selected = true;
                updateSelected(1);
            }
        }
    }
}

function onJetonClick(i) {
    if (cartesSelectionnees.length - 1 == i && actionsAvailable[MAIN_USER][i]) {
        // On joue l'action
        if (i == 0) {
            let cid = cartesSelectionnees[0];
            let c = PLAY_CARTES[cid];
            sendAction([c.geisha]);
            c.status = VALIDER_SECRETEMENT;
            c.selected = false;
            c.statusPosition = MAIN_USER;
            applyMove(c.el, moveToValidate(MAIN_USER));
            applyMove(JETONS[MAIN_USER][0], moveToValidate(MAIN_USER));

            // On enlève la carte de la main
            const index = mains[MAIN_USER].indexOf(cid);
            console.assert(index > -1);
            mains[MAIN_USER].splice(index, 1);
            updateMain(MAIN_USER);
        } else if (i == 1) {
            let cartes = new Array(2);
            for (let j = 0; j < 2; j++) {
                let cid = cartesSelectionnees[j];
                let c = PLAY_CARTES[cid];
                c.status = DEFAUSSER_SECRETEMENT;
                c.statusPosition = j + 2;
                c.selected = false;
                cartes[j] = c.geisha;
                applyMove(c.el, moveToDefausser(MAIN_USER));

                // On enlève la carte de la main
                const index = mains[MAIN_USER].indexOf(cid);
                console.assert(index > -1);
                mains[MAIN_USER].splice(index, 1);
            }
            applyMove(JETONS[MAIN_USER][1], moveToDefausser(MAIN_USER, 1));
            sendAction(cartes);
        } else if (i == 2) {
            let cartes = new Array(3);
            for (let j = 0; j < 3; j++) {
                let cid = cartesSelectionnees[j];
                let c = PLAY_CARTES[cid];
                c.status = ATTENTE_CHOIX_TROIS[j];
                c.selected = false;
                cartes[j] = c.geisha;

                // On enlève la carte de la main
                const index = mains[MAIN_USER].indexOf(cid);
                console.assert(index > -1);
                mains[MAIN_USER].splice(index, 1);
                cartes_en_attente[j] = cid;
                cartesEnAttenteAdv = 2;
            }
            sendAction(cartes);
        } else if (i == 3) {
            let cartes = new Array(4);
            for (let j = 0; j < 4; j++) {
                let cid = cartesSelectionnees[j];
                let c = PLAY_CARTES[cid];
                c.status = ATTENTE_CHOIX_PAQUETS[Math.floor(j / 2)];
                c.statusPosition = j;
                c.selected = false;
                cartes[j] = c.geisha;

                // On enlève la carte de la main
                const index = mains[MAIN_USER].indexOf(cid);
                console.assert(index > -1);
                mains[MAIN_USER].splice(index, 1);
                cartes_en_attente[j] = cid;
                cartesEnAttenteAdv = 3;
            }
            sendAction(cartes);
        }
        actionsAvailable[MAIN_USER][i] = false;
        JETONS[MAIN_USER][i].classList.add('jeton-off');
        JETONS[MAIN_USER][i].classList.remove('jeton-selected');
        updateMain(MAIN_USER);
        onEndAction(i < 2);
        cartesSelectionnees = [];
        canSelect = false;
    }
}

function updateSelectedGetAction() {
    for (let j = cartesSelectionnees.length - 1; j < NB_ACTIONS; j++) {
        if (actionsAvailable[MAIN_USER][j]) {
            return j;
        }
    }
    console.error("Pas d'action :(");
    return 3;
}

function updateMain(j) {
    for (let i = 0; i < mains[j].length; i++) {
        let c = PLAY_CARTES[mains[j][i]]
        if (i != c.statusPosition) {
            c.statusPosition = i;
            applyMove(c.el, moveToMain(MAIN_USER, i));
        }
    }
}

function updateSelected(cartesAdded) {
    if (cartesSelectionnees.length > 0) {
        let ac = updateSelectedGetAction();
        if (ac == 0) {
            let c = cartesSelectionnees[0];
            applyMove(PLAY_CARTES[c].el, moveToValidate(MAIN_USER));
        } else if (ac == 1) {
            for (let i = 0; i < cartesSelectionnees.length; i++) {
                let c = cartesSelectionnees[i];
                applyMove(PLAY_CARTES[c].el, moveToDefausser(MAIN_USER, i));
            }
        } else if (ac == 2) {
            for (let i = 0; i < cartesSelectionnees.length; i++) {
                let c = cartesSelectionnees[i];
                applyMove(PLAY_CARTES[c].el, moveToChoixTrois(i));
            }
        } else if (ac == 3) {
            for (let i = 0; i < cartesSelectionnees.length; i++) {
                let c = cartesSelectionnees[i];
                applyMove(PLAY_CARTES[c].el, moveToChoixPaquets(i));
            }
        } else {
            console.error("IS NOT AN ACTION :( ???");
        }
    }

    let prevAction = cartesSelectionnees.length - cartesAdded - 1;
    if (prevAction >= 0 && actionsAvailable[MAIN_USER][prevAction]) {
        JETONS[MAIN_USER][prevAction].classList.remove('jeton-selected')
    }

    let action = cartesSelectionnees.length - 1
    if (action >= 0 && actionsAvailable[MAIN_USER][action]) {
        JETONS[MAIN_USER][action].classList.add('jeton-selected')
    }
}

function getMaxCardSelect() {
    for (let a = NB_ACTIONS - 1; a >= 0; a--) {
        if (actionsAvailable[MAIN_USER][a]) {
            return a + 1
        }
    }
    return 0;
}

function onEndAction(addCard) {
    if (addCard) {
        adversairePiocherEndAction();
    }
    if (tour < 7) {
        MANCHE_STATUS.innerText = `${manche + 1}/${tour + 1}`
    }
    cartesSelectionnees = []
    setStatusMsg('adv_turn');

    clearCartesOutlined();
}

function sendAction(cartes) {
    connection?.send(JSON.stringify({ msg: "action", cartes }))
}

function sendChoix(choix) {
    connection?.send(JSON.stringify({ msg: "choix", choix }))
}

/**
 * @typedef Cartes
 * @property {HTMLElement} el
 * @property {HTMLImageElement} front
 * @property {number} status
 * @property {number} geisha
 * @property {boolean} selected
 * @property {number} statusPosition
 */
/** @type {Cartes[]} */
const PLAY_CARTES = new Array(NB_CARTES_TOTALES);

const MAIN_ADV = 0;
const MAIN_USER = 1;
const PIOCHE = 2;
const ATTENTE_CHOIX_TROIS = [3, 4, 5];
const ATTENTE_CHOIX_PAQUETS = [6, 7];
const VALIDER_ADV = 8;
const VALIDER_USER = 9;
const VALIDER_SECRETEMENT = 10;
const DEFAUSSER_SECRETEMENT = 11;
function init_cartes() {
    let target = /** @type {HTMLElement} */ (document.getElementById('cards-container'));
    for (let i = NB_CARTES_TOTALES - 1; i >= 0; i--) {
        let el = document.createElement('div');
        el.classList.add('carte');
        target.appendChild(el);

        let front = document.createElement('img')
        front.src = `/static/replay/assets/cartes/${CARTES_TYPE[0]}.webp`
        front.classList.add('carte-front')
        el.appendChild(front);

        let dos = document.createElement('img')
        dos.src = `/static/replay/assets/cartes/item-back.webp`
        dos.classList.add('carte-dos')
        el.appendChild(dos);

        PLAY_CARTES[i] = {
            el,
            front,
            status: PIOCHE,
            geisha: NB_GEISHAS,
            selected: false,
            statusPosition: -1
        }
        applyMove(el, moveToPioche(PIOCHE_CENTRAL_POSITION));
        el.onclick = () => onCarteClick(i);
    }
}

const STATUS_TITLE = /** @type {HTMLSpanElement} */ (document.getElementById('status-title'));
function play() {
    updatePlayPlaces();

    for (let i = 0; i < NB_ACTIONS; i++) {
        JETONS[MAIN_USER][i].onclick = () => onJetonClick(i);
    }

    initGame()
    connect()
    if (connection) {
        connection.onopen = () => {
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            const adv = urlParams.get('adv');
            if (adv) {
                let first = urlParams.get('first');
                sendStartGame(adv, first);
            } else {
                openNewGameModal();
            }
        }
    }
}

const modal = /** @type {HTMLElement} */ (document.getElementById('new-match'));
const selectOpponent = /** @type {HTMLSelectElement} */ (document.getElementById('opponent-select'));
const selectFirst = /** @type {HTMLSelectElement} */ (document.getElementById('first-select'));
function openNewGameModal() {
    canSelect = false;
    START_NEW_MANCHE_BUTTON.classList.add('hide');
    modal?.classList.remove('hide');
    TEXT_TITLES[0].classList.remove('hide');
    TEXT_TITLES[1].classList.remove('hide');
}

function lancerMatch() {
    if (connection?.readyState == WebSocket.OPEN) {
        sendStartGame(selectOpponent.value, selectFirst.value)
        closeNewGameModal();
    }
}

function closeNewGameModal() {
    modal?.classList.add('hide');
}

function sendStartGame(value, firstTxt) {
    const CHAMP = "champ-";
    const USER = "user-";
    let first = undefined;
    firstTxt = firstTxt?.toLocaleLowerCase()
    if (firstTxt == 'true') {
        first = true;
    } else if (firstTxt == 'false') {
        first = false;
    }
    if (value.startsWith(CHAMP)) {
        _sendStartGame(value.slice(CHAMP.length), true, first);
    } else if (value.startsWith("user-")) {
        _sendStartGame(value.slice(USER.length), false, first);
    } else {
        _sendStartGame(value, true, first);
    }
}

function _sendStartGame(name, isChampion, first) {
    if (first == undefined) {
        first = Math.random() < 0.5
    }
    if (isChampion) {
        connection?.send(JSON.stringify({ msg: "run", champion: name, first }))
    } else {
        connection?.send(JSON.stringify({ msg: "run", user: name, first }))
    }
    initGame({ joueur: first ? 0 : 1, user: username, champion: name })
}

function stopGame() {
    connection?.send(JSON.stringify({ msg: "stop" }))
    gameRunning = false;
    openNewGameModal()
}

function updatePlayPlaces() {
    updatePlaces();
    modal.style.left = `${GEISHAS_LEFT_OFFSET[3] * clampedInnerWidth / BASE_WIDTH}px`
    modal.style.top = `${window.innerHeight / 2}px`; innerHeight
    STATUS_TITLE.style.left = `${GEISHAS_LEFT_OFFSET[3] * WIDTH_FACTOR}px`
    START_NEW_MANCHE_BUTTON.style.left = `${GEISHAS_LEFT_OFFSET[3] * WIDTH_FACTOR}px`;
    START_NEW_MANCHE_BUTTON.style.top = `${HEIGHT - 15}px`;
}

document.body.onresize = () => {
    updatePlayPlaces();
    for (let j = 0; j < 2; j++) {
        if (!actionsAvailable[j][0]) {
            applyMove(JETONS[j][0], moveToValidate(j));
        }
        if (!actionsAvailable[j][1]) {
            applyMove(JETONS[j][1], moveToDefausser(j, j));
        }
    }

    for (let c of PLAY_CARTES) {
        switch (c.status) {
            case MAIN_ADV:
            case MAIN_USER:
                applyMove(c.el, moveToMain(c.status, c.statusPosition));
                break;
            case PIOCHE:
                applyMove(c.el, moveToPioche(PIOCHE_CENTRAL_POSITION));
                break;
            case ATTENTE_CHOIX_TROIS[0]:
            case ATTENTE_CHOIX_TROIS[1]:
            case ATTENTE_CHOIX_TROIS[2]:
                applyMove(c.el, moveToChoixTrois(c.status - ATTENTE_CHOIX_TROIS[0]));
                break;
            case ATTENTE_CHOIX_PAQUETS[0]:
            case ATTENTE_CHOIX_PAQUETS[1]:
                applyMove(c.el, moveToChoixPaquets(c.statusPosition));
                break;
            case VALIDER_ADV:
            case VALIDER_USER:
                applyMove(c.el, moveToGeisha(c.geisha, c.statusPosition));
                break;
            case VALIDER_SECRETEMENT:
                applyMove(c.el, moveToValidate(c.statusPosition));
                break;
            case DEFAUSSER_SECRETEMENT:
                applyMove(c.el, moveToDefausser(Math.floor(c.statusPosition / 2), c.statusPosition % 2));
                break;
        }
    }
    updateSelected(0);
}

const MESSAGES = {
    connection: "Connexion en cours…",
    connected: "Connecté",
    ok_match_end: "Fin du match !",
    user_turn: "C'est à VOUS de jouer !",
    get adv_turn() {
        return `Au tour de ${adv_name} de jouer`;
    },
    get adv_wait() {
        return `En attente de la connexion de ${adv_name}`;
    },
    "wait-start-new-manche": "Fin de la manche cliquez sur le bouton pour continuer.",
    err_eof: "Erreur: Le match a été interrompu !",
    'err_no-game': "Erreur: Pas de partie en cours !",
    'err_already-running': "Erreur: Une partie est déjà en cours !",
    err_request: "Erreur: Requête invalide !",
    "err_unk-champion": "Erreur: Champion inconnu !",
    "err_self-match": "Erreur: Vous ne pouvez pas faire de match contre vous même !",
    "err_new-channel": "Erreur: Vous avez ouvert une nouvelle fenêtre !",
    "err_action-err1": "Erreur: Erreur lors de l'action: action déjà jouée",
    "err_action-err2": "Erreur: Erreur lors de l'action: cartes invalides",
    "err_action-err3": "Erreur: Erreur lors de l'action: paquet invalide",
    "err_action-err4": "Erreur: Erreur lors de l'action: geisha invalide",
    "err_action-err5": "Erreur: Erreur lors de l'action: joueur invalide",
    "err_action-err6": "Erreur: Erreur lors de l'action: choix invalide",
    "err_action-err7": "Erreur: Erreur lors de l'action: action invalide",
    "err_cartes-value-error": "Erreur: Erreur lors de l'action: cartes invalides",
    "err_choix-value-error": "Erreur: Erreur lors de l'action: choix invalides",
    get err_defi_reject() {
        return `${adv_name} a rejeté votre défi.`
    }
}
let currentStatusMsg = "connection";
function setStatusMsg(id) {
    if (currentStatusMsg.startsWith('err') && id.startsWith('ok')) {
        return;
    }
    currentStatusMsg = id;
    STATUS_TITLE.innerText = MESSAGES[id] ?? id;
}

init_cartes();
play();