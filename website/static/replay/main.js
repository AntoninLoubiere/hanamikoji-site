const NB_GEISHAS = 7;
const NB_CARTES_TOTALES = 21;
const GEISHA_VALEURS = [2, 2, 2, 3, 3, 4, 5]

const HEIGHT = window.innerHeight;

const JOUEUR1 = 0;
const JOUEUR2 = 1;
const EGALITE = 2;

function get_dump_from_url()
{
    const DUMP_PARAMETER = 'dump.json'

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
        moveToPioche(c, PIOCHE_CENTRAL_POSITION);
    }
}

const CARTE_HEIGHT_OFFSET = 35;
const PIOCHE_LEFT_OFFSET = 100
const PIOCHE_CENTRAL_POSITION = 5;
/**
 * @param {HTMLElement} el
 * @param {number} position
*/
function moveToPioche(el, position) {
    const offset = HEIGHT / 2 - PIOCHE_CENTRAL_POSITION * CARTE_HEIGHT_OFFSET + position * CARTE_HEIGHT_OFFSET
    el.style.top = `${offset}px`;
    el.style.left = `${PIOCHE_LEFT_OFFSET}px`;
    el.style.zIndex = `${10 + position}`
}

const CARTES_GEISHA_OFFSET = 140;
/**
 * @param {HTMLElement} el
 * @param {number} position
*/
function moveToGeisha(el, geisha, position) {
    let offset = (position > 0 ? CARTES_GEISHA_OFFSET : -CARTES_GEISHA_OFFSET) + position * CARTE_HEIGHT_OFFSET + HEIGHT / 2
    el.style.top = `${offset}px`;
    el.style.left = `${GEISHAS_LEFT_OFFSET[geisha]}px`;
    el.style.zIndex = `${10 + position}`
}

const CARTES_MAIN_HEIGHT_OFFSET = 95;

/**
 * @param {HTMLElement} el
 * @param {number} position
*/
function moveToMain(el, joueur, position) {
    let top = joueur == JOUEUR1 ? CARTES_MAIN_HEIGHT_OFFSET : HEIGHT - CARTES_MAIN_HEIGHT_OFFSET;
    el.style.top = `${top}px`;
    el.style.left = `${GEISHAS_LEFT_OFFSET[0] + position * GEISHA_SPACE_BETWEEN}px`;
    el.style.zIndex = '0'
}

init_geishas();
init_cartes();