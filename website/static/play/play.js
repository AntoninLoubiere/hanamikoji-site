/** @type {WebSocket?} */
let connection = null;
function connect() {
    if (connection != null) {
        connection.close()
    }
    connection = new WebSocket(`${document.location.protocol == 'https' ? 'wss' : 'ws'}://${window.location.host}/play`)
    connection.onmessage = (e) => {
        let data;
        try {
            data = JSON.parse(e.data);
        } catch {
            console.error(e.data)
            return
        }
        onMessage(data);
    }

    connection.onclose = () => {
        connection = null;
    }
}

function onMessage(msg) {
    switch (msg.msg) {
        case 'run':
            if (msg.status == "started" || msg.status == "waiting") {
                initGame(msg);
                if (msg.status == "started") {
                    INFO_STATUS[MAIN_ADV].innerText = "À lui de jouer"
                    INFO_STATUS[MAIN_USER].innerText = ''
                } else {
                    INFO_STATUS[MAIN_ADV].innerText = "En attente de l'adversaire"
                    INFO_STATUS[MAIN_USER].innerText = "En attente de l'adversaire"
                }
            } else if (msg.status == "ended") {
                setTimeout(openNewGameModal, 3000)
            }
            break;
        case 'status':
            onStatus(msg);
            break;
        case 'err':
            if (msg.code == 'unk-champion' || msg.code == 'already-running') {
                break;
            }
            if (msg.code != 'eof') {
                console.error("ERR", msg.code);
            }
            INFO_STATUS[MAIN_ADV].innerText = `Erreur (${msg.code}) !`
            INFO_STATUS[MAIN_USER].innerText = `Erreur (${msg.code}) !`
            openNewGameModal();
            break;
        case 'champions':
            while (selectOpponent.firstChild) {
                // @ts-ignore
                selectOpponent.removeChild(selectOpponent.lastChild);
            }
            let group = document.createElement('optgroup');
            group.label = 'Champions'
            for (let c of msg.champions) {
                let opt = document.createElement('option');
                opt.value = `champ-${c}`;
                opt.innerText = c;
                group.appendChild(opt);
            }
            selectOpponent.appendChild(group);

            group = document.createElement('optgroup');
            group.label = 'Utilisateurs'
            for (let c of msg.users) {
                let opt = document.createElement('option');
                opt.value = `user-${c}`;
                opt.innerText = c;
                group.appendChild(opt);
            }
            selectOpponent.appendChild(group);
            break;
        default:
            console.info(msg);
    }
}

function onStatus(data) {
    MANCHE_STATUS.innerText = `${data.manche + 1}/${data.tour + 1}`
    const isNotLast = data.carte_piochee >= 0 || data.attente_reponse
    if (manche != data.manche) {
        manche = data.manche;
        tour = -1;
        if (isNotLast) {
            if (manche > 0) {
                // Reset cartes
                resetNouvelleManche();
            } else {
                setTimeout(
                    () => {
                        TEXT_TITLES[0].classList.add('hide');
                        TEXT_TITLES[1].classList.add('hide');
                    },
                    0
                )
            }
            for (let i = 0; i < 6; i++) {
                let c = piocherCarte();
                ajouterALaMain(MAIN_ADV, c);
            }

            for (let g of data.cartes) {
                let c = piocherCarte();
                retournerGeisha(c, g);
                ajouterALaMain(MAIN_USER, c);
            }
        }

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
    } else if (data.carte_piochee >= 0 && data.tour > tour) {
        let c = piocherCarte();
        retournerGeisha(c, data.carte_piochee);
        ajouterALaMain(MAIN_USER, c);
    }

    if (cartesEnAttenteAdv) {
        if (cartesEnAttenteAdv == 2) {
            for (let j = 0; j < 3; j++) {
                let cid = cartes_en_attente[j];
                let g = PLAY_CARTES[cid].geisha;
                validerCarte(cid, cartesValidees[MAIN_ADV][g] < data.cv_adv[g] ? MAIN_ADV : MAIN_USER);
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
                validerCarte(c0, MAIN_ADV);
                validerCarte(c1, MAIN_ADV);
                validerCarte(c2, MAIN_USER);
                validerCarte(c3, MAIN_USER);
            } else {
                validerCarte(c0, MAIN_USER);
                validerCarte(c1, MAIN_USER);
                validerCarte(c2, MAIN_ADV);
                validerCarte(c3, MAIN_ADV);
            }
        }
        cartesEnAttenteAdv = 0;
        cartes_en_attente.fill(-1);
    }

    if (!isNotLast || data.tour <= tour) return;
    INFO_STATUS[MAIN_ADV].innerText = "";
    INFO_STATUS[MAIN_USER].innerText = "À vous de jouer !";
    tour = data.tour;

    let last_act = data.derniere_action.act;
    if (tour > 0 && last_act < NB_ACTIONS && actionsAvailable[0][last_act]) {
        JETONS[MAIN_ADV][last_act].classList.add('jeton-off');
        actionsAvailable[MAIN_ADV][last_act] = false;

        if (last_act == 0) {
            let c = PLAY_CARTES[mains[MAIN_ADV].pop() ?? -1];
            c.status = VALIDER_SECRETEMENT;
            applyMove(c.el, moveToValidate(MAIN_ADV));
            applyMove(JETONS[MAIN_ADV][0], moveToValidate(MAIN_ADV));
        } else if (last_act == 1) {
            for (let i = 0; i < 2; i++) {
                let c = PLAY_CARTES[mains[MAIN_ADV].pop() ?? -1];
                c.status = DEFAUSSER_SECRETEMENT;
                applyMove(c.el, moveToDefausser(MAIN_ADV, i));
            }
            applyMove(JETONS[MAIN_ADV][1], moveToDefausser(MAIN_ADV, 0));
        }
    }

    if (data.attente_reponse) {
        if (last_act == 2) {
            let cartes = [data.derniere_action.c1, data.derniere_action.c2, data.derniere_action.c3]
            for (let i = 0; i < 3; i++) {
                let c = mains[MAIN_ADV].pop() ?? -1;
                cartes_en_attente[i] = c;
                retournerGeisha(c, cartes[i]);
                PLAY_CARTES[c].status = ATTENTE_CHOIX_TROIS[i];
                applyMove(PLAY_CARTES[c].el, moveToChoixTrois(i))
            }
        } else if (last_act == 3) {
            let cartes = [data.derniere_action.c1, data.derniere_action.c2, data.derniere_action.c3, data.derniere_action.c4]
            for (let i = 0; i < 4; i++) {
                let c = mains[MAIN_ADV].pop() ?? -1;
                cartes_en_attente[i] = c;

                retournerGeisha(c, cartes[i]);
                PLAY_CARTES[c].status = ATTENTE_CHOIX_PAQUETS[i < 2 ? 0 : 1];
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

function ajouterALaMain(j, c) {
    let pos = mains[j].push(c) - 1;
    PLAY_CARTES[c].status = j;
    PLAY_CARTES[c].mainPosition = pos;
    PLAY_CARTES[c].selected = false;
    applyMove(PLAY_CARTES[c].el, moveToMain(j, pos));
}

function validerCarte(c, j) {
    PLAY_CARTES[c].status = VALIDER_ADV + j;
    const g = PLAY_CARTES[c].geisha;
    let nb = ++cartesValidees[j][g];
    if (j == MAIN_ADV) {
        nb *= -1;
    }
    applyMove(PLAY_CARTES[c].el, moveToGeisha(g, nb))
}

function resetNouvelleManche() {
    pioche_idx = 0;
    canSelect = false;
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
let canSelect = false;
let cartesEnAttenteAdv = 0;
function initGame(msg) {
    MANCHE_STATUS.innerText = `1/1`
    joueur_user = msg?.joueur ?? 0;
    manche = -1;
    mains = [[], []]
    TEXT_TITLES[MAIN_ADV].innerText = msg?.champion ?? "Champion";
    TEXT_TITLES[MAIN_USER].innerText = msg?.user ?? "Vous";
    INFO_NAME[MAIN_ADV].innerText = msg?.champion ?? "Champion";
    INFO_NAME[MAIN_USER].innerText = msg?.user ?? "Vous";
    TEXT_TITLES[0].classList.remove('hide');
    TEXT_TITLES[1].classList.remove('hide');

    resetNouvelleManche()

    for (let g = 0; g < NB_GEISHAS; g++) {
        MARKERS[g].classList.remove('marker-top')
        MARKERS[g].classList.remove('marker-bot')
    }
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
        sendAction([choice])
        for (let i = 0; i < 3; i++) {
            validerCarte(cartes_en_attente[i], choice == i ? MAIN_USER : MAIN_ADV);
        }
        cartes_en_attente.fill(-1);
        onEndAction(true)
    } else if (!cartesEnAttenteAdv && ATTENTE_CHOIX_PAQUETS[0] <= status && status <= ATTENTE_CHOIX_PAQUETS[1]) {
        let choice = status - ATTENTE_CHOIX_PAQUETS[0];
        sendAction([choice])
        for (let i = 0; i < 4; i++) {
            validerCarte(cartes_en_attente[i], choice == Math.floor(i / 2) ? MAIN_USER : MAIN_ADV);
        }
        cartes_en_attente.fill(-1);
        onEndAction(true)
    } else if (canSelect && PLAY_CARTES[c].status == MAIN_USER) {
        if (PLAY_CARTES[c].selected) {
            const index = cartesSelectionnees.indexOf(c);
            console.assert(index > -1)
            cartesSelectionnees.splice(index, 1);
            PLAY_CARTES[c].selected = false;
            applyMove(PLAY_CARTES[c].el, moveToMain(MAIN_USER, PLAY_CARTES[c].mainPosition));
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
        onEndAction(false);
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
        if (i != c.mainPosition) {
            c.mainPosition = i;
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

function onEndAction(isChoix) {
    if (!isChoix) {
        ajouterALaMain(MAIN_ADV, piocherCarte());
    }
    cartesSelectionnees = []
    INFO_STATUS[MAIN_ADV].innerText = "À lui de jouer…";
    INFO_STATUS[MAIN_USER].innerText = "";
}

function sendAction(cartes) {
    connection?.send(JSON.stringify({ msg: "action", cartes }))
}

/**
 * @typedef Cartes
 * @property {HTMLElement} el
 * @property {HTMLImageElement} front
 * @property {number} status
 * @property {number} geisha
 * @property {boolean} selected
 * @property {number} mainPosition
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
            mainPosition: -1
        }
        el.onclick = () => onCarteClick(i);
    }
}

/** @type {HTMLSpanElement[]} */
const INFO_STATUS = new Array(2)
function play() {
    INFO_STATUS[0] = /** @type {HTMLSpanElement} */ (document.getElementById('info-status-0'));
    INFO_STATUS[1] = /** @type {HTMLSpanElement} */ (document.getElementById('info-status-1'));
    updatePlaces();

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
            connection?.send(JSON.stringify({ msg: "champions" }))
        }
    }
}

const modal = document.getElementById('new-match');
const selectOpponent = /** @type {HTMLSelectElement} */ (document.getElementById('opponent-select'));
const selectFirst = /** @type {HTMLSelectElement} */ (document.getElementById('first-select'));
function openNewGameModal() {
    modal?.classList.remove('hide');
}

function lancerMatch() {
    sendStartGame(selectOpponent.value, selectFirst.value)
    closeNewGameModal();
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
    initGame({ joueur: first ? 0 : 1, user: 'Vous', champion: name })
}

function stopGame() {
    connection?.send(JSON.stringify({ msg: "stop" }))
    openNewGameModal()
}

init_cartes();
play();

document.body.onresize = () => {
    updatePlaces();
}