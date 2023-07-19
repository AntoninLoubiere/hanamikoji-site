// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (c) 2022 Association Prologin <association@prologin.org>
// Copyright (c) 2022 Léo Lanteri Thauvin

#include <js/Array.h>
#include <js/CompilationAndEvaluation.h>
#include <js/Conversions.h>
#include <js/ErrorReport.h>
#include <js/Initialization.h>
#include <jsapi.h>
#include <mozilla/mozalloc_abort.h>

#include <iostream>
#include <string>
#include <vector>

/// Les actions de jeu
typedef enum action
{
    VALIDER, ///< Valide une unique carte
    DEFAUSSER, ///< Defausse deux cartes
    CHOIX_TROIS, ///< Donne le choix entre trois cartes
    CHOIX_PAQUETS, ///< Donne le choix entre deux paquets de deux cartes
    PREMIER_JOUEUR, ///< Aucune action n'a été jouée (utilisé dans tour_precedent)
} action;

/// Enumeration contentant toutes les erreurs possibles
typedef enum error
{
    OK, ///< pas d'erreur
    ACTION_DEJA_JOUEE, ///< l'action a déjà été jouée
    CARTES_INVALIDES, ///< vous ne pouvez pas jouer ces cartes
    PAQUET_INVALIDE, ///< ce paquet n'existe pas
    GEISHA_INVALIDES, ///< cette geisha n'existe pas (doit être un entier entre 0 et NB_GEISHA)
    JOUEUR_INVALIDE, ///< ce joueur n'existe pas
    CHOIX_INVALIDE, ///< vous ne pouvez pas repondre à ce choix
    ACTION_INVALIDE, ///< vous ne pouvez pas jouer cette action maintenant
} error;

/// Enumeration représentant les différents joueurs
typedef enum joueur
{
    JOUEUR_1, ///< Le joueur 1
    JOUEUR_2, ///< Le joueur 2
    EGALITE, ///< Égalité, utilisé uniquement dans possession_geisha
} joueur;

/// La description d'une action jouée
typedef struct action_jouee
{
    action act; ///< L'action jouée
    int c1; ///< Si act==VALIDER ou act==DEFAUSSER, -1 sinon la première carte (du premier paquet)
    int c2; ///< Si act==V|D: -1 sinon la deuxième carte (du premier paquet)
    int c3; ///< Si act==V|D: -1 sinon la troisième carte (ou la première carte du second paquet si act==choix paquet)
    int c4; ///< Si act!=choix paquet: -1 sinon la deuxième carte du second paquet
} action_jouee;

extern "C" {
/// Renvoie l'identifiant du joueur
joueur api_id_joueur();

/// Renvoie l'identifiant de l'adversaire
joueur api_id_adversaire();

/// Renvoie le numéro de la manche
int api_manche();

/// Renvoie le numéro de la manche
int api_tour();

/// Renvoie l'action jouée par l'adversaire
action_jouee api_tour_precedent();

/// Renvoie le nombre de carte validée par le joueur pour la geisha
int api_nb_carte_validee(joueur j, int g);

/// Renvoie qui possède la geisha
joueur api_possession_geisha(int g);

/// Renvoie si l'action a déjà été jouée par le joueur
bool api_est_jouee_action(joueur j, action a);

/// Renvoie le nombre de carte que le joueur a
int api_nb_cartes(joueur j);

/// Renvoie les cartes que vous avez
std::vector<int> api_cartes_en_main();

/// Renvoie la carte que vous avez pioché au début du tour
int api_carte_pioche();

/// Jouer l'action valider une carte
error api_action_valider(int c);

/// Jouer l'action défausser deux cartes
error api_action_defausser(int c1, int c2);

/// Jouer l'action choisir entre trois cartes
error api_action_choix_trois(int c1, int c2, int c3);

/// Jouer l'action choisir entre deux paquets de deux cartes
error api_action_choix_paquets(int p1c1, int p1c2, int p2c1, int p2c2);

/// Choisir une des trois cartes proposées.
error api_repondre_choix_trois(int c);

/// Choisir un des deux paquets proposés.
error api_repondre_choix_paquets(int p);

/// Affiche le contenu d'une valeur de type action
void api_afficher_action(action v);

/// Affiche le contenu d'une valeur de type error
void api_afficher_error(error v);

/// Affiche le contenu d'une valeur de type joueur
void api_afficher_joueur(joueur v);

/// Affiche le contenu d'une valeur de type action_jouee
void api_afficher_action_jouee(action_jouee v);

}

/// Utility for converting a `JSString` into a C++ `std::string`
bool js_encode_string(JSContext* cx, JSString* in, std::string& out) {
    JS::AutoCheckCannotGC _nogc;
    JSLinearString* s = JS_EnsureLinearString(cx, in);
    if (!s)
        return false;
    size_t len = JS::GetDeflatedUTF8StringLength(s);
    out.resize(len);
    JS::DeflateStringToUTF8Buffer(s, out);
    return true;
}

template <typename CxxType>
void cxx_to_js(JSContext* cx, CxxType in, JS::MutableHandleValue out) {
    return in.__if_that_triggers_an_error_there_is_a_problem;
}

template <typename CxxType>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, CxxType& out) {
    return CxxType::__if_that_triggers_an_error_there_is_a_problem;
}

template<>
void cxx_to_js(JSContext* cx, int i, JS::MutableHandleValue out) {
    out.setInt32(i);
}

template <>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, int& out) {
    if (!in.isInt32())
        return false;
    out = in.toInt32();
    return true;
}

template <>
void cxx_to_js(JSContext* cx, double x, JS::MutableHandleValue out) {
    out.setNumber(x);
}

template <>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, double& out) {
    if (!in.isNumber())
        return false;
    out = in.toNumber();
    return true;
}

template <>
void cxx_to_js(JSContext* cx, std::string s, JS::MutableHandleValue out) {
    JSString* str = JS_NewStringCopyN(cx, s.data(), s.size());
    if (!str) {
        JS_ReportOutOfMemory(cx);
        return;
    }
    out.setString(str);
}

template <>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, std::string& out) {
    if (!in.isString())
        return false;
    JSString* str = in.toString();
    return js_encode_string(cx, str, out);
}

template <>
void cxx_to_js(JSContext* cx, bool b, JS::MutableHandleValue out) {
    out.setBoolean(b);
}

template <>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, bool& out) {
    if (!in.isBoolean())
        return false;
    out = in.toBoolean();
    return true;
}

template <typename CxxType>
void cxx_to_js_array(JSContext* cx, const std::vector<CxxType>& in, 
                     JS::MutableHandleValue out) {
    JS::RootedValueVector v(cx);
    if (!v.resize(in.size())) {
        JS_ReportOutOfMemory(cx);
        return;
    }
    for (size_t i = 0; i < in.size(); i++)
        cxx_to_js<CxxType>(cx, in[i], v[i]);
    out.setObject(*JS::NewArrayObject(cx, v));
}

template <typename CxxType>
bool js_to_cxx_array(JSContext* cx, JS::HandleValue in, 
                     std::vector<CxxType>& out) {
    bool is_array;
    if (!JS::IsArrayObject(cx, in, &is_array) || !is_array)
        return false;
    JS::RootedObject arr(cx, &in.toObject());

    uint32_t len;
    if (!JS::GetArrayLength(cx, arr, &len))
        return false;

    out.clear();
    out.reserve(len);
    for (uint32_t i = 0; i < len; i++) {
        JS::RootedValue jsval(cx);
        CxxType cxxval;
        if (!JS_GetElement(cx, arr, i, &jsval) ||
            !js_to_cxx<CxxType>(cx, jsval, (CxxType&)cxxval)) {
            return false;
        }
        out.push_back(cxxval);
    }
    return true;
}

template<>
void cxx_to_js(JSContext* cx, action in, JS::MutableHandleValue out) {
    cxx_to_js(cx, (int)in, out);
}

template<>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, action& out) {
    return js_to_cxx(cx, in, (int&)out);
}

template<>
void cxx_to_js(JSContext* cx, error in, JS::MutableHandleValue out) {
    cxx_to_js(cx, (int)in, out);
}

template<>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, error& out) {
    return js_to_cxx(cx, in, (int&)out);
}

template<>
void cxx_to_js(JSContext* cx, joueur in, JS::MutableHandleValue out) {
    cxx_to_js(cx, (int)in, out);
}

template<>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, joueur& out) {
    return js_to_cxx(cx, in, (int&)out);
}


template<>
void cxx_to_js(JSContext* cx, action_jouee in,
               JS::MutableHandleValue out) {
    JS::RootedValueVector v(cx);
    if (!v.resize(5)) {
        JS_ReportOutOfMemory(cx);
        return;
    }
    cxx_to_js(cx, in.act, v[0]);
    cxx_to_js(cx, in.c1, v[1]);
    cxx_to_js(cx, in.c2, v[2]);
    cxx_to_js(cx, in.c3, v[3]);
    cxx_to_js(cx, in.c4, v[4]);

    JS::RootedObject obj(cx, JS_NewPlainObject(cx));
    JS_SetProperty(cx, obj, "act",
                   v[0]);
    JS_SetProperty(cx, obj, "c1",
                   v[1]);
    JS_SetProperty(cx, obj, "c2",
                   v[2]);
    JS_SetProperty(cx, obj, "c3",
                   v[3]);
    JS_SetProperty(cx, obj, "c4",
                   v[4]);
    out.setObject(*obj);
}

template<>
bool js_to_cxx(JSContext* cx, JS::HandleValue in, action_jouee& out) {
    if (!in.isObject())
        return false;
    JS::RootedObject obj(cx, &in.toObject());
    
    JS::RootedValue act(cx);
    JS::RootedValue c1(cx);
    JS::RootedValue c2(cx);
    JS::RootedValue c3(cx);
    JS::RootedValue c4(cx);

    return true
        && JS_GetProperty(cx, obj, "act", &act)
        && js_to_cxx(cx, act, out.act)
        && JS_GetProperty(cx, obj, "c1", &c1)
        && js_to_cxx(cx, c1, out.c1)
        && JS_GetProperty(cx, obj, "c2", &c2)
        && js_to_cxx(cx, c2, out.c2)
        && JS_GetProperty(cx, obj, "c3", &c3)
        && js_to_cxx(cx, c3, out.c3)
        && JS_GetProperty(cx, obj, "c4", &c4)
        && js_to_cxx(cx, c4, out.c4)
    ;
}

bool js_id_joueur(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`idJoueur` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_id_joueur(),
        args.rval());
    return true;
}

bool js_id_adversaire(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`idAdversaire` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_id_adversaire(),
        args.rval());
    return true;
}

bool js_manche(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`manche` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_manche(),
        args.rval());
    return true;
}

bool js_tour(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`tour` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_tour(),
        args.rval());
    return true;
}

bool js_tour_precedent(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`tourPrecedent` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_tour_precedent(),
        args.rval());
    return true;
}

bool js_nb_carte_validee(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 2) {
        JS_ReportErrorASCII(cx, "`nbCarteValidee` "
                            "expected 2 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    joueur j;
    if (!js_to_cxx(cx, args[0], j)) {
        JS_ReportErrorASCII(cx, "`nbCarteValidee` "
                            "got bad 0th argument, "
                            "expected type `Joueur`");
        return false;
    }
    int g;
    if (!js_to_cxx(cx, args[1], g)) {
        JS_ReportErrorASCII(cx, "`nbCarteValidee` "
                            "got bad 1th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_nb_carte_validee(j, g),
        args.rval());
    return true;
}

bool js_possession_geisha(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`possessionGeisha` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int g;
    if (!js_to_cxx(cx, args[0], g)) {
        JS_ReportErrorASCII(cx, "`possessionGeisha` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_possession_geisha(g),
        args.rval());
    return true;
}

bool js_est_jouee_action(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 2) {
        JS_ReportErrorASCII(cx, "`estJoueeAction` "
                            "expected 2 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    joueur j;
    if (!js_to_cxx(cx, args[0], j)) {
        JS_ReportErrorASCII(cx, "`estJoueeAction` "
                            "got bad 0th argument, "
                            "expected type `Joueur`");
        return false;
    }
    action a;
    if (!js_to_cxx(cx, args[1], a)) {
        JS_ReportErrorASCII(cx, "`estJoueeAction` "
                            "got bad 1th argument, "
                            "expected type `Action`");
        return false;
    }

    cxx_to_js(
        cx,
        api_est_jouee_action(j, a),
        args.rval());
    return true;
}

bool js_nb_cartes(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`nbCartes` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    joueur j;
    if (!js_to_cxx(cx, args[0], j)) {
        JS_ReportErrorASCII(cx, "`nbCartes` "
                            "got bad 0th argument, "
                            "expected type `Joueur`");
        return false;
    }

    cxx_to_js(
        cx,
        api_nb_cartes(j),
        args.rval());
    return true;
}

bool js_cartes_en_main(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`cartesEnMain` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js_array(
        cx,
        api_cartes_en_main(),
        args.rval());
    return true;
}

bool js_carte_pioche(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 0) {
        JS_ReportErrorASCII(cx, "`cartePioche` "
                            "expected 0 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);


    cxx_to_js(
        cx,
        api_carte_pioche(),
        args.rval());
    return true;
}

bool js_action_valider(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`actionValider` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int c;
    if (!js_to_cxx(cx, args[0], c)) {
        JS_ReportErrorASCII(cx, "`actionValider` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_action_valider(c),
        args.rval());
    return true;
}

bool js_action_defausser(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 2) {
        JS_ReportErrorASCII(cx, "`actionDefausser` "
                            "expected 2 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int c1;
    if (!js_to_cxx(cx, args[0], c1)) {
        JS_ReportErrorASCII(cx, "`actionDefausser` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }
    int c2;
    if (!js_to_cxx(cx, args[1], c2)) {
        JS_ReportErrorASCII(cx, "`actionDefausser` "
                            "got bad 1th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_action_defausser(c1, c2),
        args.rval());
    return true;
}

bool js_action_choix_trois(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 3) {
        JS_ReportErrorASCII(cx, "`actionChoixTrois` "
                            "expected 3 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int c1;
    if (!js_to_cxx(cx, args[0], c1)) {
        JS_ReportErrorASCII(cx, "`actionChoixTrois` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }
    int c2;
    if (!js_to_cxx(cx, args[1], c2)) {
        JS_ReportErrorASCII(cx, "`actionChoixTrois` "
                            "got bad 1th argument, "
                            "expected type `number`");
        return false;
    }
    int c3;
    if (!js_to_cxx(cx, args[2], c3)) {
        JS_ReportErrorASCII(cx, "`actionChoixTrois` "
                            "got bad 2th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_action_choix_trois(c1, c2, c3),
        args.rval());
    return true;
}

bool js_action_choix_paquets(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 4) {
        JS_ReportErrorASCII(cx, "`actionChoixPaquets` "
                            "expected 4 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int p1c1;
    if (!js_to_cxx(cx, args[0], p1c1)) {
        JS_ReportErrorASCII(cx, "`actionChoixPaquets` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }
    int p1c2;
    if (!js_to_cxx(cx, args[1], p1c2)) {
        JS_ReportErrorASCII(cx, "`actionChoixPaquets` "
                            "got bad 1th argument, "
                            "expected type `number`");
        return false;
    }
    int p2c1;
    if (!js_to_cxx(cx, args[2], p2c1)) {
        JS_ReportErrorASCII(cx, "`actionChoixPaquets` "
                            "got bad 2th argument, "
                            "expected type `number`");
        return false;
    }
    int p2c2;
    if (!js_to_cxx(cx, args[3], p2c2)) {
        JS_ReportErrorASCII(cx, "`actionChoixPaquets` "
                            "got bad 3th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_action_choix_paquets(p1c1, p1c2, p2c1, p2c2),
        args.rval());
    return true;
}

bool js_repondre_choix_trois(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`repondreChoixTrois` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int c;
    if (!js_to_cxx(cx, args[0], c)) {
        JS_ReportErrorASCII(cx, "`repondreChoixTrois` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_repondre_choix_trois(c),
        args.rval());
    return true;
}

bool js_repondre_choix_paquets(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`repondreChoixPaquets` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    int p;
    if (!js_to_cxx(cx, args[0], p)) {
        JS_ReportErrorASCII(cx, "`repondreChoixPaquets` "
                            "got bad 0th argument, "
                            "expected type `number`");
        return false;
    }

    cxx_to_js(
        cx,
        api_repondre_choix_paquets(p),
        args.rval());
    return true;
}

bool js_afficher_action(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`afficherAction` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    action v;
    if (!js_to_cxx(cx, args[0], v)) {
        JS_ReportErrorASCII(cx, "`afficherAction` "
                            "got bad 0th argument, "
                            "expected type `Action`");
        return false;
    }

    api_afficher_action(v);
    args.rval().setUndefined();
    return true;
}

bool js_afficher_error(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`afficherError` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    error v;
    if (!js_to_cxx(cx, args[0], v)) {
        JS_ReportErrorASCII(cx, "`afficherError` "
                            "got bad 0th argument, "
                            "expected type `Error`");
        return false;
    }

    api_afficher_error(v);
    args.rval().setUndefined();
    return true;
}

bool js_afficher_joueur(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`afficherJoueur` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    joueur v;
    if (!js_to_cxx(cx, args[0], v)) {
        JS_ReportErrorASCII(cx, "`afficherJoueur` "
                            "got bad 0th argument, "
                            "expected type `Joueur`");
        return false;
    }

    api_afficher_joueur(v);
    args.rval().setUndefined();
    return true;
}

bool js_afficher_action_jouee(JSContext* cx, unsigned argc, JS::Value* vp) {
    if (argc != 1) {
        JS_ReportErrorASCII(cx, "`afficherActionJouee` "
                            "expected 1 arguments, "
                            "got %d", argc);
        return false;
    }
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

    action_jouee v;
    if (!js_to_cxx(cx, args[0], v)) {
        JS_ReportErrorASCII(cx, "`afficherActionJouee` "
                            "got bad 0th argument, "
                            "expected type `ActionJouee`");
        return false;
    }

    api_afficher_action_jouee(v);
    args.rval().setUndefined();
    return true;
}


static JSFunctionSpec api_functions[] = {
    JS_FN("idJoueur", 
          js_id_joueur, 0, 0),
    JS_FN("idAdversaire", 
          js_id_adversaire, 0, 0),
    JS_FN("manche", 
          js_manche, 0, 0),
    JS_FN("tour", 
          js_tour, 0, 0),
    JS_FN("tourPrecedent", 
          js_tour_precedent, 0, 0),
    JS_FN("nbCarteValidee", 
          js_nb_carte_validee, 2, 0),
    JS_FN("possessionGeisha", 
          js_possession_geisha, 1, 0),
    JS_FN("estJoueeAction", 
          js_est_jouee_action, 2, 0),
    JS_FN("nbCartes", 
          js_nb_cartes, 1, 0),
    JS_FN("cartesEnMain", 
          js_cartes_en_main, 0, 0),
    JS_FN("cartePioche", 
          js_carte_pioche, 0, 0),
    JS_FN("actionValider", 
          js_action_valider, 1, 0),
    JS_FN("actionDefausser", 
          js_action_defausser, 2, 0),
    JS_FN("actionChoixTrois", 
          js_action_choix_trois, 3, 0),
    JS_FN("actionChoixPaquets", 
          js_action_choix_paquets, 4, 0),
    JS_FN("repondreChoixTrois", 
          js_repondre_choix_trois, 1, 0),
    JS_FN("repondreChoixPaquets", 
          js_repondre_choix_paquets, 1, 0),
    JS_FN("afficherAction", 
          js_afficher_action, 1, 0),
    JS_FN("afficherError", 
          js_afficher_error, 1, 0),
    JS_FN("afficherJoueur", 
          js_afficher_joueur, 1, 0),
    JS_FN("afficherActionJouee", 
          js_afficher_action_jouee, 1, 0),
    JS_FS_END
};

bool define_enum_action(JSContext* cx, JS::HandleObject global) {
    JS::RootedObject obj(cx, JS_NewPlainObject(cx));
    JS::RootedValue i(cx);
    i = JS::Int32Value(0);
    JS_SetProperty(cx, obj, "Valider", i);
    i = JS::Int32Value(1);
    JS_SetProperty(cx, obj, "Defausser", i);
    i = JS::Int32Value(2);
    JS_SetProperty(cx, obj, "ChoixTrois", i);
    i = JS::Int32Value(3);
    JS_SetProperty(cx, obj, "ChoixPaquets", i);
    i = JS::Int32Value(4);
    JS_SetProperty(cx, obj, "PremierJoueur", i);

    JS_FreezeObject(cx, obj);
    JS::RootedValue val(cx, JS::ObjectValue(*obj));
    JS_SetProperty(cx, global, "Action", val);
    return true;
}

bool define_enum_error(JSContext* cx, JS::HandleObject global) {
    JS::RootedObject obj(cx, JS_NewPlainObject(cx));
    JS::RootedValue i(cx);
    i = JS::Int32Value(0);
    JS_SetProperty(cx, obj, "Ok", i);
    i = JS::Int32Value(1);
    JS_SetProperty(cx, obj, "ActionDejaJouee", i);
    i = JS::Int32Value(2);
    JS_SetProperty(cx, obj, "CartesInvalides", i);
    i = JS::Int32Value(3);
    JS_SetProperty(cx, obj, "PaquetInvalide", i);
    i = JS::Int32Value(4);
    JS_SetProperty(cx, obj, "GeishaInvalides", i);
    i = JS::Int32Value(5);
    JS_SetProperty(cx, obj, "JoueurInvalide", i);
    i = JS::Int32Value(6);
    JS_SetProperty(cx, obj, "ChoixInvalide", i);
    i = JS::Int32Value(7);
    JS_SetProperty(cx, obj, "ActionInvalide", i);

    JS_FreezeObject(cx, obj);
    JS::RootedValue val(cx, JS::ObjectValue(*obj));
    JS_SetProperty(cx, global, "Error", val);
    return true;
}

bool define_enum_joueur(JSContext* cx, JS::HandleObject global) {
    JS::RootedObject obj(cx, JS_NewPlainObject(cx));
    JS::RootedValue i(cx);
    i = JS::Int32Value(0);
    JS_SetProperty(cx, obj, "Joueur1", i);
    i = JS::Int32Value(1);
    JS_SetProperty(cx, obj, "Joueur2", i);
    i = JS::Int32Value(2);
    JS_SetProperty(cx, obj, "Egalite", i);

    JS_FreezeObject(cx, obj);
    JS::RootedValue val(cx, JS::ObjectValue(*obj));
    JS_SetProperty(cx, global, "Joueur", val);
    return true;
}

void define_const_nb_geisha(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(7));
    JS_SetProperty(cx, global, "NB_GEISHA", val);
}

void define_const_nb_cartes_total(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(21));
    JS_SetProperty(cx, global, "NB_CARTES_TOTAL", val);
}

void define_const_nb_cartes_debut(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(6));
    JS_SetProperty(cx, global, "NB_CARTES_DEBUT", val);
}

void define_const_nb_cartes_ecartees(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(1));
    JS_SetProperty(cx, global, "NB_CARTES_ECARTEES", val);
}

void define_const_nb_actions(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(4));
    JS_SetProperty(cx, global, "NB_ACTIONS", val);
}

void define_const_nb_manches_max(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::Int32Value(3));
    JS_SetProperty(cx, global, "NB_MANCHES_MAX", val);
}

void define_const_geisha_valeur(JSContext* cx,
                                                JS::HandleObject global) {
    JS::RootedValue val(cx, JS::StringValue(JS_NewStringCopyZ(cx, "2|2|2|3|3|4|5")));
    JS_SetProperty(cx, global, "GEISHA_VALEUR", val);
}


bool js_console_log_inner(JSContext* cx, unsigned argc, JS::Value* vp, 
                          std::ostream& out) {
    JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
    for (unsigned i = 0; i < argc; i++) {
        JS::RootedString js_str(cx, JS::ToString(cx, args[i]));
        if (!js_str) {
            JS_ReportErrorASCII(cx, "couldn't convert value to string");
            return false;
        }
        std::string str;
        if (!js_encode_string(cx, js_str, str))
            out << "??? ";
        else
            out << str << " ";
    }
    out << std::endl;
    return true;
}

bool js_console_log(JSContext* cx, unsigned argc, JS::Value* vp) {
    return js_console_log_inner(cx, argc, vp, std::cout);
}

bool js_console_error(JSContext* cx, unsigned argc, JS::Value* vp) {
    return js_console_log_inner(cx, argc, vp, std::cerr);
}

void define_js_console(JSContext* cx, JS::HandleObject global) {
    JS::RootedObject console(cx, JS_NewPlainObject(cx));
    JS_DefineFunction(cx, console, "log", js_console_log, 0, 0);
    JS_DefineFunction(cx, console, "error", js_console_error, 0, 0);
    JS::RootedValue console_val(cx, JS::ObjectValue(*console));
    JS_SetProperty(cx, global, "console", console_val);
}

static bool initialized = false;

// Call `JS_ShutDown()` to avoid a segfault on exit
class AutoCleanup {
public:
    ~AutoCleanup() {
        if (initialized)
            JS_ShutDown();
    }
};

static AutoCleanup _cleanup;
static JSContext* cx;
static JS::PersistentRootedObject global;

static void init_js() {
    if (initialized)
        return;
    initialized = true;

    if (!JS_Init())
        throw 42;
    cx = JS_NewContext(JS::DefaultHeapMaxBytes);
    if (!JS::InitSelfHostedCode(cx))
        throw 42;

    static JSClass GlobalClass = {"Stechec", JSCLASS_GLOBAL_FLAGS, &JS::DefaultGlobalClassOps};
    global = JS::PersistentRootedObject(
        cx, JS_NewGlobalObject(cx, &GlobalClass, nullptr,
                               JS::FireOnNewGlobalHook, JS::RealmOptions()));
    JS::EnterRealm(cx, global);

    define_js_console(cx, global);
    JS_DefineFunctions(cx, global, api_functions);
    define_enum_action(cx, global);
    define_enum_error(cx, global);
    define_enum_joueur(cx, global);
    define_const_nb_geisha(cx, global);
    define_const_nb_cartes_total(cx, global);
    define_const_nb_cartes_debut(cx, global);
    define_const_nb_cartes_ecartees(cx, global);
    define_const_nb_actions(cx, global);
    define_const_nb_manches_max(cx, global);
    define_const_geisha_valeur(cx, global);
    if (JS_IsExceptionPending(cx))
        throw 42;

    const char* champion_path = getenv("CHAMPION_PATH");
    std::string champion;

    if (!champion_path)
        champion = "champion.js";
    else {
        champion = champion_path;
        champion += "/champion.js";
    }
    JS::RootedValue _rval(cx);
    if (!JS::EvaluateUtf8Path(cx, JS::OwningCompileOptions(cx), 
                              champion.c_str(), &_rval)) {
        throw 42;
    }
}

static void js_report_error() {
    if (!JS_IsExceptionPending(cx))
        return;
    JS::RootedValue exc(cx);
    JS::ExceptionStack stack(cx);
    JS_GetPendingException(cx, &exc);
    JS::GetPendingExceptionStack(cx, &stack);
    JS_ClearPendingException(cx);

    JS::ErrorReportBuilder report(cx);
    report.init(cx, stack, JS::ErrorReportBuilder::WithSideEffects);
    JS::PrintError(stderr, report, true);

    JS::RootedString js_bt(cx);
    if (!stack.stack() || 
        !JS::BuildStackString(cx, nullptr, stack.stack(), &js_bt, 2)) {
        std::cerr << "(no stack trace available)" << std::endl;
        return;
    }
    std::string bt;
    js_encode_string(cx, js_bt, bt);
    std::cerr << bt;
}

extern "C" void init_jeu() {
    init_js();

    JS::RootedValue js_ret(cx);
    JS::HandleValueArray args = JS::HandleValueArray::empty();

    if (!JS_CallFunctionName(cx, global, 
        "initJeu", args, &js_ret)) {
        js_report_error();
        mozalloc_abort("");
    }
}

extern "C" void jouer_tour() {
    init_js();

    JS::RootedValue js_ret(cx);
    JS::HandleValueArray args = JS::HandleValueArray::empty();

    if (!JS_CallFunctionName(cx, global, 
        "jouerTour", args, &js_ret)) {
        js_report_error();
        mozalloc_abort("");
    }
}

extern "C" void repondre_action_choix_trois() {
    init_js();

    JS::RootedValue js_ret(cx);
    JS::HandleValueArray args = JS::HandleValueArray::empty();

    if (!JS_CallFunctionName(cx, global, 
        "repondreActionChoixTrois", args, &js_ret)) {
        js_report_error();
        mozalloc_abort("");
    }
}

extern "C" void repondre_action_choix_paquets() {
    init_js();

    JS::RootedValue js_ret(cx);
    JS::HandleValueArray args = JS::HandleValueArray::empty();

    if (!JS_CallFunctionName(cx, global, 
        "repondreActionChoixPaquets", args, &js_ret)) {
        js_report_error();
        mozalloc_abort("");
    }
}

extern "C" void fin_jeu() {
    init_js();

    JS::RootedValue js_ret(cx);
    JS::HandleValueArray args = JS::HandleValueArray::empty();

    if (!JS_CallFunctionName(cx, global, 
        "finJeu", args, &js_ret)) {
        js_report_error();
        mozalloc_abort("");
    }
}

