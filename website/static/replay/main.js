var pause = false;

function toggle_pause()
{
    pause = !pause;
    document.getElementById("pause").style.backgroundImage = !pause ? "url('./assets/pause.png')" : "url('./assets/resume.png')";
}

var nb_cartes_en_jeu = 0;
const JOUEUR_1 = 0;
const JOUEUR_2 = 1;
const AUCUN_JOUEUR = -1;
var joueur_qui_commence = JOUEUR_1;
var cartes = ["2_violet", "2_rouge", "2_jaune", "3_bleu", "3_orange", "4_vert", "5_rose"];
var id_cartes_creees = []
var ligne_actuelle_json = 0;

// Opérateur ! pour les joueurs
function autre(joueur)
{
    return joueur == JOUEUR_1 ? JOUEUR_2 : JOUEUR_1;
}

// Instancie une nouvelle carte de type type_carte et l'ajoute au body HTML (placée en haut de la pioche)
function cree_carte(type_carte)
{
    var carte = document.createElement("img");
    nb_cartes_en_jeu++;
    carte.id = type_carte + nb_cartes_en_jeu;
    id_cartes_creees.push(carte.id);
    carte.src = "assets/cartes/" + type_carte + ".jpg";
    // carte.onclick = aaa;

    carte.style = "position:absolute; top:50%; transform:translate(80px, -80%); scale:0.65; transition: transform 1s, scale 1s;";

    const parent = document.getElementById("B1");
    document.body.insertBefore(carte, parent);

    return carte.id;
}

var noms_joueurs = ["Pifo1", "Pifo2"];
var main_j1 = [];
var carte_validee_id_j1 = null;
var main_j2 = [];
var carte_validee_id_j2 = null;
var carte_ecartee = "5_rose";

var nb_cartes_par_geisha = {
    "2_violet"  : [0, 0],
    "2_rouge"   : [0, 0],
    "2_jaune"   : [0, 0],
    "3_bleu"    : [0, 0],
    "3_orange"  : [0, 0],
    "4_vert"    : [0, 0],
    "5_rose"    : [0, 0]
}
var appartenance_geisha = {
    "2_violet"  : AUCUN_JOUEUR,
    "2_rouge"   : AUCUN_JOUEUR,
    "2_jaune"   : AUCUN_JOUEUR,
    "3_bleu"    : AUCUN_JOUEUR,
    "3_orange"  : AUCUN_JOUEUR,
    "4_vert"    : AUCUN_JOUEUR,
    "5_rose"    : AUCUN_JOUEUR
}
var valeur_geisha = {
    "2_violet"  : 2,
    "2_rouge"   : 2,
    "2_jaune"   : 2,
    "3_bleu"    : 3,
    "3_orange"  : 3,
    "4_vert"    : 4,
    "5_rose"    : 5
}
var nb_geishas_par_joueur = [0, 0];
var points_par_joueur = [0, 0];
var manche_actuelle = 0;
var data_json = [];

function update_description()
{
    document.getElementById("j1").innerHTML = "<h4>" + noms_joueurs[JOUEUR_1] + "<br>Score : " + points_par_joueur[JOUEUR_1] + "<br>Nombre de geishas : " + nb_geishas_par_joueur[JOUEUR_1] + "</h4>";
    document.getElementById("j2").innerHTML = "<h4>" + noms_joueurs[JOUEUR_2] + "<br>Score : " + points_par_joueur[JOUEUR_2] + "<br>Nombre de geishas : " + nb_geishas_par_joueur[JOUEUR_2] + "</h4>";
}

// Fait piocher une carte de type type_carte au joueur (avec l'animation qui va avec bien sûr...)
function piocher(type_carte, joueur)
{
    main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;
    var elem_id = cree_carte(type_carte);

    function go_anim()
    {
        var elem = document.getElementById(elem_id);
        elem.style.transform = "translate(" + (400 + 130 * main_j.length) + "%, " + (joueur == JOUEUR_1 ? 200 : -350) + "%)";
        main_j.push(elem_id);
    }

    setTimeout(go_anim, 100);
}

// j1 est la liste des id des 6 cartes de depart du joueur1, idem pour j2 et le joueur 2
function main_depart(j1, j2)
{
    var delay_actuel = 100;
    const pas_delay = 200;
    for(var c = 0; c < j1.length; c++)
    {
        setTimeout(piocher, delay_actuel, j1[c], JOUEUR_1);
        // setTimeout(place_carte, delay_actuel + 3000, j1[c], JOUEUR_1);
        delay_actuel += pas_delay;
        setTimeout(piocher, delay_actuel, j2[c], JOUEUR_2);
        // setTimeout(place_carte, delay_actuel + 3000, j2[c], JOUEUR_2);
        delay_actuel += pas_delay;
    }
}

// On veut deplacer la carte d'identifiant carte_id vers sa geisha, en fonction de quel joueur l'a jouée
function anim_place_carte(carte_id, joueur)
{
    var carte = document.getElementById(carte_id);

    // Pour que les cartes se superposent dans le bon ordre
    if(joueur == JOUEUR_1)
    {
        var b1 = document.getElementById("B1");
        b1.before(carte);
    }
    else
    {
        var p = document.getElementById("pioche");
        p.after(carte);
    }

    // Besoin de separer la partie de "superposition" du reste pour que la transition se declenche
    // Donc il faut un delai de quelques ms entre les deux sinon pas de transition, oui HTML c'est bizarre
    function toute_la_suite()
    {
        // coef vaut 1 si joueur est J1, -1 si joueur est J2
        var coef = joueur == JOUEUR_1 ? 1 : -1;
        var geisha_id = "geisha_" + carte_id.substring(0, carte_id.length - 1);

        // Au cas où l'ID se termine par un nombre à 2 chiffres
        if(geisha_id[geisha_id.length - 1] == 1 || geisha_id[geisha_id.length - 1] == 2)
        {
            geisha_id = geisha_id.substring(0, geisha_id.length - 1);
        }
        var type_carte_id = geisha_id.substring(7, geisha_id.length);

        var geisha = document.getElementById(geisha_id);
        var trX = geisha.style.transform.substring(10, 14);
        if(trX[trX.length - 1] == 'p')
        {
            // Au cas où le transform a 3 chiffres au lieu de 4...
            trX = trX.substring(0, trX.length - 1);
        }
        
        carte.style.transform = geisha.style.transform + "translate(" + (-60 + trX * 0.85) + "px," + (-35 + coef * (110 + 20 * nb_cartes_par_geisha[type_carte_id][joueur])) + "%)";
        nb_cartes_par_geisha[type_carte_id][joueur]++;
    }

    setTimeout(toute_la_suite, 70);
}

// Cherche une carte de type type_carte dans la main de joueur, et la place a sa geisha
function place_carte(type_carte, joueur)
{
    var main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;
    var debut = joueur == JOUEUR_1 ? 0 : main_j.length - 1;
    var fin = joueur == JOUEUR_1 ? main_j.length : -1;
    var incr = joueur == JOUEUR_1 ? 1 : -1;
    
    for(var c = debut; c != fin; c += incr)
    {
        if(main_j[c].includes(type_carte))
        {
            setTimeout(anim_place_carte, 100, main_j[c], joueur);
            
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);

            return;
        }
    }
}

function valider(type_carte, joueur)
{
    // Pour valider on s'inspire du transform de la pioche..
    function anim_valider(carte_id, joueur)
    {
        var carte = document.getElementById(carte_id);
        var pioche = document.getElementById("pioche");
        // valeur de transformX de la pioche à quelques pixels près
        carte.style.transform = pioche.style.transform + "translate(40%, " + (joueur == JOUEUR_1 ? 130 : -160) + "%)";
        carte.style.scale = 0.55;

        // Maintenant on place le jeton de l'action sur la carte validée
        var jeton_id = joueur == JOUEUR_1 ? "A1" : "B1";
        var jeton = document.getElementById(jeton_id);

        jeton.src = "./assets/actions/C1.jpg";
        jeton.style.scale = 0.7;
        jeton.style.transform = pioche.style.transform + "translate(80%, " + (joueur == JOUEUR_1 ? -70 : 360) + "%)";
    }
    
    main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;
    for(var c = 0; c < main_j.length; c++)
    {
        if(main_j[c].includes(type_carte))
        {
            setTimeout(anim_valider, 100, main_j[c], joueur);
            if(joueur == JOUEUR_1) carte_validee_id_j1 = main_j[c];
            else carte_validee_id_j2 = main_j[c];
            
            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);

            return;
        }
    }
}

function place_carte_validee(joueur)
{
    var carte_id = joueur == JOUEUR_1 ? carte_validee_id_j1 : carte_validee_id_j2;
    var carte = document.getElementById(carte_id);
    setTimeout((carte) => carte.style.scale = 0.65, 1100, carte);
    setTimeout(anim_place_carte, 1000, carte_id, joueur);
}

function defausser(type_carte_1, type_carte_2, joueur)
{
    // Pour defausser on s'inspire du transform de la pioche. num vaut 0 ou 1 selon quel appel c'est
    function anim_defausser(carte_id, joueur, num)
    {
        var carte = document.getElementById(carte_id);
        var pioche = document.getElementById("pioche");
        carte.style.transform = pioche.style.transform + "translate(" + (40 + num * 30) + "%, " + (joueur == JOUEUR_1 ? 280 : -310) + "%)";
        carte.style.scale = 0.55;

        // Maintenant on place le jeton de l'action sur la carte validée
        var jeton_id = joueur == JOUEUR_1 ? "A2" : "B2";
        var jeton = document.getElementById(jeton_id);

        jeton.src = "./assets/actions/C2.jpg";
        jeton.style.scale = 0.7;
        jeton.style.transform = pioche.style.transform + "translate(100%, " + (joueur == JOUEUR_1 ? 200 : 100) + "%)";
    }

    var trouve_1 = false;
    var trouve_2 = false;
    main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;
    for(var c = 0; c < main_j.length; c++)
    {
        if(main_j[c].includes(type_carte_1) && !trouve_1)
        {
            setTimeout(anim_defausser, 100, main_j[c], joueur, 0);
            
            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_1 = true;
        }
        if(main_j[c].includes(type_carte_2) && !trouve_2)
        {
            setTimeout(anim_defausser, 100, main_j[c], joueur, 1);
            
            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_2 = true;
        }
        if(trouve_1 && trouve_2) return;
    }
}

function propose_3(type_carte_1, type_carte_2, type_carte_3, joueur, rep)
{
    // On retourne le jeton de l'action "propose 3 cartes"
    var jeton_id = joueur == JOUEUR_1 ? "A3" : "B3";
    var jeton = document.getElementById(jeton_id);
    jeton.src = "./assets/actions/C3.jpg";

    // num vaut 0, 1 ou 2 selon quel appel c'est
    function anim_proposition_3(carte_id, joueur, num)
    {
        var carte = document.getElementById(carte_id);
        var geisha = document.getElementById("geisha_5_rose");
        carte.style.transform = geisha.style.transform + "translate(" + (700 + num * 110) + "%, " + (joueur == JOUEUR_1 ? 50 : -90) + "%)";
    }

    var trouve_1 = false;
    var trouve_2 = false;
    var trouve_3 = false;

    var id1 = null;
    var id2 = null;
    var id3 = null;
    var main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;

    var debut = joueur == JOUEUR_1 ? 0 : main_j.length - 1;
    var fin = joueur == JOUEUR_1 ? main_j.length : -1;
    var incr = joueur == JOUEUR_1 ? 1 : -1;

    for(var c = debut; c != fin; c += incr)
    {
        if(trouve_1 && trouve_2 && trouve_3) break;
        if(main_j[c] == null) continue;
        if(main_j[c].includes(type_carte_1) && !trouve_1)
        {
            setTimeout(anim_proposition_3, 100, main_j[c], joueur, 0);
            id1 = main_j[c];
            
            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_1 = true;
            c -= incr;
            continue;
        }
        if(main_j[c].includes(type_carte_2) && !trouve_2)
        {
            setTimeout(anim_proposition_3, 100, main_j[c], joueur, 1);
            id2 = main_j[c];

            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_2 = true;
            c -= incr;
            continue;
        }
        if(main_j[c].includes(type_carte_3) && !trouve_3)
        {
            setTimeout(anim_proposition_3, 100, main_j[c], joueur, 2);
            id3 = main_j[c];

            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_3 = true;
            c -= incr;
            continue;
        }
    }

    var j = [joueur, joueur, joueur];
    j[rep] = autre(joueur);
    
    setTimeout(anim_place_carte, 2000, id1, j[0]);
    setTimeout(anim_place_carte, 2000, id2, j[1]);
    setTimeout(anim_place_carte, 2000, id3, j[2]);
}

// pile_choisie vaut 0 pour la pile {1,2} ou 1 pour la pile {3,4}
function propose_4(type_carte_1, type_carte_2, type_carte_3, type_carte_4, joueur, pile_choisie)
{
    // On retourne le jeton de l'action "propose 4 cartes"
    var jeton_id = joueur == JOUEUR_1 ? "A4" : "B4";
    var jeton = document.getElementById(jeton_id);
    jeton.src = "./assets/actions/C4.jpg";

    // num vaut 0, 1, 2 ou 3 selon quel appel c'est
    function anim_proposition_4(carte_id, joueur, num)
    {
        var carte = document.getElementById(carte_id);
        var geisha = document.getElementById("geisha_5_rose");
        carte.style.transform = geisha.style.transform + "translate(" + (750 + (num > 1) * 160) + "%, " + ((110 + (-110) * (num % 2)) + (joueur == JOUEUR_1 ? -40 : -90)) + "%)";
    }

    var trouve_1 = false;
    var trouve_2 = false;
    var trouve_3 = false;
    var trouve_4 = false;

    var id1 = "";
    var id2 = "";
    var id3 = "";
    var id4 = "";
    main_j = joueur == JOUEUR_1 ? main_j1 : main_j2;

    var debut = joueur == JOUEUR_1 ? 0 : main_j.length - 1;
    var fin = joueur == JOUEUR_1 ? main_j.length : -1;
    var incr = joueur == JOUEUR_1 ? 1 : -1;

    for(var c = debut; c != fin; c += incr)
    {
        if(trouve_1 && trouve_2 && trouve_3 && trouve_4) break;
        if(main_j[c] == null) continue;
        if(main_j[c].includes(type_carte_1) && !trouve_1)
        {
            setTimeout(anim_proposition_4, 100, main_j[c], joueur, 0);
            id1 = main_j[c];
            
            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_1 = true;
            c -= incr;
            continue;
        }
        if(main_j[c] == null) continue;
        if(main_j[c].includes(type_carte_2) && !trouve_2)
        {
            setTimeout(anim_proposition_4, 100, main_j[c], joueur, 1);
            id2 = main_j[c];

            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_2 = true;
            c -= incr;
            continue;
        }
        if(main_j[c] == null) continue;
        if(main_j[c].includes(type_carte_3) && !trouve_3)
        {
            setTimeout(anim_proposition_4, 100, main_j[c], joueur, 2);
            id3 = main_j[c];

            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_3 = true;
            c -= incr;
            continue;
        }
        if(main_j[c] == null) continue;
        if(main_j[c].includes(type_carte_4) && !trouve_4)
        {
            setTimeout(anim_proposition_4, 100, main_j[c], joueur, 3);
            id4 = main_j[c];

            // Décaler les autres cartes de la main
            for(var i = c + 1; i < main_j.length; i++)
            {
                var carte = document.getElementById(main_j[i]);
                carte.style.transform += "translateX(-130%)";
            }

            main_j.splice(c, 1);
            trouve_4 = true;
            c -= incr;
            continue;
        }
    }

    function fin_anim()
    {
        if(pause)
        {
            setTimeout(fin_anim, 100);
            return;
        }

        var j = null;
        if(pile_choisie == 0) j = [autre(joueur), autre(joueur), joueur, joueur];
        else if(pile_choisie == 1) j = [joueur, joueur, autre(joueur), autre(joueur)];
    
        setTimeout(anim_place_carte, 100, id1, j[0]);
        setTimeout(anim_place_carte, 100, id2, j[1]);
        setTimeout(anim_place_carte, 100, id3, j[2]);
        setTimeout(anim_place_carte, 100, id4, j[3]);
    }

    setTimeout(fin_anim, 2000);
}

class Action {
    constructor(choix, params) {
        this.func = choix;
        this.params = params;
    }
}

// Actions correspond a l'ensemble des choix pris (en alternant j1 <-> j2) et pioche est une liste de types de cartes
function lancer_partie(actions, pioche, depart_j1, depart_j2)
{
    const pas_pioche = 1200;
    const pas_propose = 3700;

    // On alterne entre piocher une carte et jouer une action
    function action_suivante(actions, pioche, joueur, doit_piocher, compt)
    {
        if(compt >= pioche.length - 1)
        {
            fin_manche();
            return;
        }
        else if(pause)
        {
            setTimeout(action_suivante, 200, actions, pioche, joueur, doit_piocher, compt);
            return;
        }
        else if(doit_piocher)
        {
            setTimeout(piocher, 100, pioche[compt], joueur);
            setTimeout(action_suivante, pas_pioche, actions, pioche, joueur, false, compt);
            return;
        }
        else
        {
            var choix = actions[compt].func;
            var params = actions[compt].params;

            // Dans combien de ms on lance l'appel suivant ?
            var delai = 100;

            switch(choix)
            {
                case valider:
                    setTimeout(choix, 100, params[0], joueur);
                    delai = pas_pioche;
                    break;
                case defausser:
                    setTimeout(choix, 100, params[0], params[1], joueur);
                    delai = pas_pioche;
                    break;
                case propose_3:
                    setTimeout(choix, 100, params[0], params[1], params[2], joueur, params[3]);
                    delai = pas_propose;
                    break;
                case propose_4:
                    setTimeout(choix, 100, params[0], params[1], params[2], params[3], joueur, params[4]);
                    delai = pas_propose;
                    break;
                default:
                    break;
            }

            setTimeout(action_suivante, delai, actions, pioche, autre(joueur), true, compt + 1);
        }
    }

    setTimeout(main_depart, 100, depart_j1, depart_j2);
    setTimeout(action_suivante, 2600, actions, pioche, joueur_qui_commence, true, 0);
}


function fin_manche()
{
    cree_carte(traduire_cartes([carte_ecartee])[0]);
    setTimeout(place_carte_validee, 1000, JOUEUR_1);
    setTimeout(place_carte_validee, 1000, JOUEUR_2);

    function marker_suivant(i)
    {
        if(i >= cartes.length)
        {
            setTimeout(decision_suite, 1000);
            return;
        }

        if(nb_cartes_par_geisha[cartes[i]][JOUEUR_1] > nb_cartes_par_geisha[cartes[i]][JOUEUR_2] && appartenance_geisha[cartes[i]] != JOUEUR_1)
        {
            if(appartenance_geisha[cartes[i]] == JOUEUR_2)
            {
                nb_geishas_par_joueur[JOUEUR_2]--;
                points_par_joueur[JOUEUR_2] -= valeur_geisha[cartes[i]];
                document.getElementById("marker" + (i + 1)).style.transform += "translateY(200%)";
            }
            else
            {
                document.getElementById("marker" + (i + 1)).style.transform += "translateY(100%)";
            }
            appartenance_geisha[cartes[i]] = JOUEUR_1;
            nb_geishas_par_joueur[JOUEUR_1]++;
            points_par_joueur[JOUEUR_1] += valeur_geisha[cartes[i]];
        }
        else if(nb_cartes_par_geisha[cartes[i]][JOUEUR_1] < nb_cartes_par_geisha[cartes[i]][JOUEUR_2] && appartenance_geisha[cartes[i]] != JOUEUR_2)
        {
            if(appartenance_geisha[cartes[i]] == JOUEUR_1)
            {
                nb_geishas_par_joueur[JOUEUR_1]--;
                points_par_joueur[JOUEUR_1] -= valeur_geisha[cartes[i]];
                document.getElementById("marker" + (i + 1)).style.transform += "translateY(-200%)";
            }
            else
            {
                document.getElementById("marker" + (i + 1)).style.transform += "translateY(-100%)";
            }
            appartenance_geisha[cartes[i]] = JOUEUR_2;
            nb_geishas_par_joueur[JOUEUR_2]++;
            points_par_joueur[JOUEUR_2] += valeur_geisha[cartes[i]];
        }
        else
        {
            // Égalité : dans tous les cas le jeton ne bougera pas. Donc il y a rien à faire
        }
        
        update_description();
        setTimeout(marker_suivant, 1000, i + 1);
    }

    setTimeout(marker_suivant, 3500, 0);

    function decision_suite()
    {
        var nb1 = nb_geishas_par_joueur[JOUEUR_1];
        var sc1 = points_par_joueur[JOUEUR_1];
        var nb2 = nb_geishas_par_joueur[JOUEUR_2];
        var sc2 = points_par_joueur[JOUEUR_2];

        // Oui, l'ordre des ifs a une importance donc changez pas ce bloc moche svp
        if(nb1 >= 4 || (sc1 >= 11 && sc1 > sc2 && nb2 < 4))
        {
            fin_match(JOUEUR_1);
        }
        else if(nb2 >= 4 || (sc2 >= 11 && sc2 > sc1 && nb1 < 4))
        {
            fin_match(JOUEUR_2);
        }
        else if(manche_actuelle == 2)
        {
            if(sc1 > sc2)
            {
                fin_match(JOUEUR_1);
            }
            else if(sc2 > sc1)
            {
                fin_match(JOUEUR_2);
            }
            else if(nb1 > nb2)
            {
                fin_match(JOUEUR_1);
            }
            else if(nb2 > nb1)
            {
                fin_match(JOUEUR_2);
            }
            else
            {
                // failwith "ici, on panique"
            }
        }
        else
        {
            manche_suivante();
        }
    }

}

function manche_suivante()
{
    manche_actuelle++;
    carte_validee_id_j1 = null;
    carte_validee_id_j2 = null;

    // Efface toutes les cartes
    for(var i = 0; i < nb_cartes_en_jeu; i++)
    {
        document.getElementById(id_cartes_creees[i]).remove();
    }

    // Puis on remet les jetons action a leur place
    function go_jeton(nom, cb)
    {
        document.getElementById(nom).src = "./assets/actions/" + nom + ".jpg";
        document.getElementById(nom).style.transform = "translateX(" + cb + "px)";
        document.getElementById(nom).style.scale = 0.8;
    }

    go_jeton("A1", 2000);
    go_jeton("A2", 2135);
    go_jeton("A3", 2000);
    go_jeton("A4", 2135);

    go_jeton("B1", 2000);
    go_jeton("B2", 2135);
    go_jeton("B3", 2000);
    go_jeton("B4", 2135);

    joueur_qui_commence = autre(joueur_qui_commence);
    res = parse_dump_manche(manche_actuelle, ligne_actuelle_json, data_json);
    lancer_partie(res[0], res[1], res[2], res[3]);
}

function fin_match(gagnant)
{
    alert(noms_joueurs[gagnant] + "a gagné !!!");
}

var nom_to_func = {
    "VALIDER" : valider,
    "DEFAUSSER" : defausser,
    "CHOIX_TROIS" : propose_3,
    "CHOIX_PAQUETS" : propose_4
}

// Traduit un [0,1,2,3] en ["2_violet", "2_jaune", ...]
function traduire_cartes(l)
{
    var res = [];
    for(var i = 0; i < l.length; i++)
    {
        res.push(cartes[l[i]]);
    }
    return res;
}

// data etant la liste issue de la lecture du fichier json
// Renvoie actions, pioche, depart_j1, depart_j2
function parse_dump_manche(quelle_manche, offset, data)
{
    resultat = [[], [], [], []];

    carte_ecartee = data[offset]["carte_ecartee"];
    
    resultat[1] = traduire_cartes(data[offset]["cartes_pioche"]);
    resultat[2] = traduire_cartes(data[offset]["joueur_0"]["main"]);
    resultat[3] = traduire_cartes(data[offset]["joueur_1"]["main"]);

    if(quelle_manche == 0)
    {
        noms_joueurs[JOUEUR_1] = data[0]["joueur_0"]["nom"];
        noms_joueurs[JOUEUR_2] = data[0]["joueur_1"]["nom"];
    }

    for(var i = offset; i < data.length; i++)
    {
        if(data[i]["manche"] != offset)
        {
            ligne_actuelle_json = i;
            return resultat;
        }
        if(data[i]["derniere_action"]["action"] == "PREMIER_JOUEUR")
        {
            continue;
        }
        var cartes_choix = traduire_cartes(data[i]["derniere_action"]["cartes"]);
        if(data[i]["derniere_action"]["action"] == "CHOIX_TROIS" || data[i]["derniere_action"]["action"] == "CHOIX_PAQUETS")
        {
            if(!data[i]["attente_reponse"]) continue;
            else cartes_choix.push(data[i + 1]["dernier_choix"]);
        }
        resultat[0].push(new Action(nom_to_func[data[i]["derniere_action"]["action"]], cartes_choix));
    }
}

// Probleme de fetch
function parse_json(filename, quelle_manche, offset)
{
    fetch(filename, {})
        .then(res => res.json())
        .then((data) => {
            data_json = data;
            parse_dump_manche(quelle_manche, offset, data_json);
        }).catch(err => console.error(err));
}

function get_filename_from_url(nom_attrib)
{
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    return urlParams.get(nom_attrib);
}

// _____________________________________________________MAIN_________________________________________________________________

update_description();

// Pour test :
// data_json = [{"manche":0,"tour":0,"attente_reponse":false,"dernier_choix":-1,"derniere_action":{"action":"PREMIER_JOUEUR","joueur":2},"carte_ecartee":4,"cartes_pioche":[3,0,3,6,6,5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[0,1,4,5,5,6],"validees":[],"validees_secretement":-1},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[1,2,3,4,5,6],"validees":[],"validees_secretement":-1}},{"manche":0,"tour":0,"attente_reponse":false,"dernier_choix":-1,"derniere_action":{"action":"VALIDER", "cartes":[0], "joueur":0},"carte_ecartee":4,"cartes_pioche":[0,3,6,6,5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[1,3,4,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[1,2,3,4,5,6],"validees":[],"validees_secretement":-1}},{"manche":0,"tour":1,"attente_reponse":false,"dernier_choix":-1,"derniere_action":{"action":"VALIDER","joueur":1,"cartes":[0]},"carte_ecartee":4,"cartes_pioche":[3,6,6,5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[1,3,4,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[1,2,3,4,5,6],"validees":[],"validees_secretement":0}},{"manche":0,"tour":2,"attente_reponse":false,"dernier_choix":-1,"derniere_action":{"action":"DEFAUSSER","joueur":0,"cartes":[1,3]},"carte_ecartee":4,"cartes_pioche":[6,6,5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[3,4,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[1,2,3,4,5,6],"validees":[],"validees_secretement":0}},{"manche":0,"tour":3,"attente_reponse":false,"dernier_choix":-1,"derniere_action":{"action":"DEFAUSSER","joueur":1,"cartes":[1,2]},"carte_ecartee":4,"cartes_pioche":[6,5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[3,4,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[3,4,5,6,6],"validees":[],"validees_secretement":0}},{"manche":0,"tour":4,"attente_reponse":true,"dernier_choix":-1,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[3,4,5]},"carte_ecartee":4,"cartes_pioche":[5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[5,6,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[3,4,5,6,6],"validees":[],"validees_secretement":0}},{"manche":0,"tour":4,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[3,4,5]},"carte_ecartee":4,"cartes_pioche":[5,6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[5,6,6],"validees":[3,4],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[3,4,5,6,6],"validees":[5],"validees_secretement":0}},{"manche":0,"tour":5,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[3,4,5]},"carte_ecartee":4,"cartes_pioche":[6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[5,6,6],"validees":[3,4],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[5,6,6],"validees":[5],"validees_secretement":0}},{"manche":0,"tour":5,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[3,4,5]},"carte_ecartee":4,"cartes_pioche":[6,2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[5,6,6],"validees":[3,4,5],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[5,6,6],"validees":[3,4,5],"validees_secretement":0}},{"manche":0,"tour":6,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[5,6,6,6]},"carte_ecartee":4,"cartes_pioche":[2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[],"validees":[3,4,5],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[5,6,6],"validees":[3,4,5],"validees_secretement":0}},{"manche":0,"tour":6,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[5,6,6,6]},"carte_ecartee":4,"cartes_pioche":[2,4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[],"validees":[3,4,5,5,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[5,6,6],"validees":[3,4,5,6,6],"validees_secretement":0}},{"manche":0,"tour":7,"attente_reponse":true,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[2,5,6,6]},"carte_ecartee":4,"cartes_pioche":[4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[],"validees":[3,4,5,5,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[],"validees":[3,4,5,6,6],"validees_secretement":0}},{"manche":0,"tour":7,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[2,5,6,6]},"carte_ecartee":4,"cartes_pioche":[4],"joueur_0":{"id":0,"nom":"Player 1","score":0,"main":[],"validees":[3,4,5,5,6,6,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":0,"main":[],"validees":[2,3,4,5,5,6,6],"validees_secretement":0}},{"manche":1,"tour":0,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[2,5,6,6]},"carte_ecartee":3,"cartes_pioche":[3,6,6,6,4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[0,1,2,2,5,5],"validees":[],"validees_secretement":-1},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[1,4,4,5,6,6],"validees":[],"validees_secretement":-1}},{"manche":1,"tour":0,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"VALIDER","joueur":1,"cartes":[0]},"carte_ecartee":3,"cartes_pioche":[3,6,6,6,4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[0,1,2,2,5,5],"validees":[],"validees_secretement":-1},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[1,4,4,5,6,6],"validees":[],"validees_secretement":0}},{"manche":1,"tour":1,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"VALIDER","joueur":0,"cartes":[0]},"carte_ecartee":3,"cartes_pioche":[6,6,6,4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[1,2,2,3,5,5],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[1,4,4,5,6,6],"validees":[],"validees_secretement":0}},{"manche":1,"tour":2,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"DEFAUSSER","joueur":1,"cartes":[1,4]},"carte_ecartee":3,"cartes_pioche":[6,6,4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[1,2,2,3,5,5],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[4,5,6,6,6],"validees":[],"validees_secretement":0}},{"manche":1,"tour":3,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"DEFAUSSER","joueur":0,"cartes":[1,2]},"carte_ecartee":3,"cartes_pioche":[6,4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[2,3,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[4,5,6,6,6],"validees":[],"validees_secretement":0}},{"manche":1,"tour":4,"attente_reponse":true,"dernier_choix":1,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[4,5,6]},"carte_ecartee":3,"cartes_pioche":[4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[2,3,5,5,6],"validees":[],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[6,6,6],"validees":[],"validees_secretement":0}},{"manche":1,"tour":4,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[4,5,6]},"carte_ecartee":3,"cartes_pioche":[4,5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[2,3,5,5,6],"validees":[6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[6,6,6],"validees":[4,5],"validees_secretement":0}},{"manche":1,"tour":5,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[2,3,4]},"carte_ecartee":3,"cartes_pioche":[5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[5,5,6],"validees":[6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[6,6,6],"validees":[4,5],"validees_secretement":0}},{"manche":1,"tour":5,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[2,3,4]},"carte_ecartee":3,"cartes_pioche":[5,3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[5,5,6],"validees":[2,3,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[6,6,6],"validees":[4,4,5],"validees_secretement":0}},{"manche":1,"tour":6,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[5,6,6,6]},"carte_ecartee":3,"cartes_pioche":[3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[5,5,6],"validees":[2,3,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[],"validees":[4,4,5],"validees_secretement":0}},{"manche":1,"tour":6,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[5,6,6,6]},"carte_ecartee":3,"cartes_pioche":[3,3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[5,5,6],"validees":[2,3,6,6,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[],"validees":[4,4,5,5,6],"validees_secretement":0}},{"manche":1,"tour":7,"attente_reponse":true,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[3,5,5,6]},"carte_ecartee":3,"cartes_pioche":[3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[],"validees":[2,3,6,6,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[],"validees":[4,4,5,5,6],"validees_secretement":0}},{"manche":1,"tour":7,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[3,5,5,6]},"carte_ecartee":3,"cartes_pioche":[3],"joueur_0":{"id":0,"nom":"Player 1","score":5,"main":[],"validees":[2,3,3,5,6,6,6],"validees_secretement":0},"joueur_1":{"id":1,"nom":"Player 2","score":2,"main":[],"validees":[4,4,5,5,5,6,6],"validees_secretement":0}},{"manche":2,"tour":0,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[3,5,5,6]},"carte_ecartee":3,"cartes_pioche":[3,5,6,3,2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[1,1,4,5,6,6],"validees":[],"validees_secretement":-1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[0,0,4,5,5,6],"validees":[],"validees_secretement":-1}},{"manche":2,"tour":0,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"VALIDER","joueur":0,"cartes":[1]},"carte_ecartee":3,"cartes_pioche":[3,5,6,3,2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[1,2,4,5,6,6],"validees":[],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[0,0,4,5,5,6],"validees":[],"validees_secretement":-1}},{"manche":2,"tour":1,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"VALIDER","joueur":1,"cartes":[0]},"carte_ecartee":3,"cartes_pioche":[5,6,3,2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[1,2,4,5,6,6],"validees":[],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[0,3,4,5,5,6],"validees":[],"validees_secretement":0}},{"manche":2,"tour":2,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"DEFAUSSER","joueur":0,"cartes":[1,2]},"carte_ecartee":3,"cartes_pioche":[6,3,2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[4,5,5,6,6],"validees":[],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[0,3,4,5,5,6],"validees":[],"validees_secretement":0}},{"manche":2,"tour":3,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"DEFAUSSER","joueur":1,"cartes":[0,3]},"carte_ecartee":3,"cartes_pioche":[3,2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[4,5,5,6,6],"validees":[],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[4,5,5,6,6],"validees":[],"validees_secretement":0}},{"manche":2,"tour":4,"attente_reponse":true,"dernier_choix":1,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[3,4,5]},"carte_ecartee":3,"cartes_pioche":[2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[5,6,6],"validees":[],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[4,5,5,6,6],"validees":[],"validees_secretement":0}},{"manche":2,"tour":4,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":0,"cartes":[3,4,5]},"carte_ecartee":3,"cartes_pioche":[2,4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[5,6,6],"validees":[3,4],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[4,5,5,6,6],"validees":[5],"validees_secretement":0}},{"manche":2,"tour":5,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[2,4,5]},"carte_ecartee":3,"cartes_pioche":[4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[5,6,6],"validees":[3,4],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[5,6,6],"validees":[5],"validees_secretement":0}},{"manche":2,"tour":5,"attente_reponse":false,"dernier_choix":2,"derniere_action":{"action":"CHOIX_TROIS","joueur":1,"cartes":[2,4,5]},"carte_ecartee":3,"cartes_pioche":[4,6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[5,6,6],"validees":[3,4,5],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[5,6,6],"validees":[2,4,5],"validees_secretement":0}},{"manche":2,"tour":6,"attente_reponse":true,"dernier_choix":2,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[4,5,6,6]},"carte_ecartee":3,"cartes_pioche":[6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[],"validees":[3,4,5],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[5,6,6],"validees":[2,4,5],"validees_secretement":0}},{"manche":2,"tour":6,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":0,"cartes":[4,5,6,6]},"carte_ecartee":3,"cartes_pioche":[6,3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[],"validees":[3,4,4,5,5],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[5,6,6],"validees":[2,4,5,6,6],"validees_secretement":0}},{"manche":2,"tour":7,"attente_reponse":true,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[5,6,6,6]},"carte_ecartee":3,"cartes_pioche":[3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[],"validees":[3,4,4,5,5],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[],"validees":[2,4,5,6,6],"validees_secretement":0}},{"manche":2,"tour":7,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[5,6,6,6]},"carte_ecartee":3,"cartes_pioche":[3],"joueur_0":{"id":0,"nom":"Player 1","score":10,"main":[],"validees":[3,4,4,5,5,6,6],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":7,"main":[],"validees":[2,4,5,5,6,6,6],"validees_secretement":0}},{"manche":3,"tour":0,"attente_reponse":false,"dernier_choix":1,"derniere_action":{"action":"CHOIX_PAQUETS","joueur":1,"cartes":[5,6,6,6]},"joueur_0":{"id":0,"nom":"Player 1","score":8,"main":[],"validees":[1,3,4,4,5,5,6,6],"validees_secretement":1},"joueur_1":{"id":1,"nom":"Player 2","score":13,"main":[],"validees":[0,2,4,5,5,6,6,6],"validees_secretement":0}}];
// var rr = parse_dump_manche(0, 0, data_json);

parse_json(get_filename_from_url('dump'), 0, 0);
lancer_partie(rr[0], rr[1], rr[2], rr[3]);
