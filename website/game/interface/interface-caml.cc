// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (c) 2020 Association Prologin <association@prologin.org>

// This file contains the code to call the API functions from the OCaml
// language.
// This file was generated by stechec2-generator. DO NOT EDIT.

#define CAML_NAME_SPACE
#include <caml/mlvalues.h>
#include <caml/callback.h>
#include <caml/alloc.h>
#include <caml/memory.h>

#include <vector>
#include <string>


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

template <typename CamlType, typename CxxType>
CamlType cxx_to_caml(CxxType in)
{
    return in.__if_that_triggers_an_error_there_is_a_problem;
}

template <>
value cxx_to_caml<value, int>(int in)
{
    CAMLparam0();
    CAMLreturn(Val_int(in));
}

template <>
value cxx_to_caml<value, double>(double in)
{
    CAMLparam0();
    CAMLreturn(caml_copy_double(in));
}

template<>
value cxx_to_caml<value, std::string>(std::string in)
{
    CAMLparam0();
    size_t l = in.length();
    char* out = (char *) malloc(l + 1);
    out[l] = 0;
    CAMLreturn(caml_copy_string(in.c_str()));
}

template <>
value cxx_to_caml<value, bool>(bool in)
{
    CAMLparam0();
    CAMLreturn(Val_bool(in));
}

template <typename CxxType>
value cxx_to_caml_array(const std::vector<CxxType>& in)
{
    CAMLparam0();
    CAMLlocal1(v);
    size_t size = in.size();
    if (size == 0)
        CAMLreturn(Atom(0));
    v = caml_alloc(size, 0);
    for (size_t i = 0; i < size; ++i)
        caml_modify(&Field(v, i), cxx_to_caml<value, CxxType>(in[i]));
    CAMLreturn(v);
}

template <typename CamlType, typename CxxType>
CxxType caml_to_cxx(CamlType in)
{
    return in.__if_that_triggers_an_error_there_is_a_problem;
}

template<>
std::string caml_to_cxx<value, std::string>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(std::string, String_val(in));
}

template <>
int caml_to_cxx<value, int>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(int, Int_val(in));
}

template <>
double caml_to_cxx<value, double>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(double, Double_val(in));
}

template <>
bool caml_to_cxx<value, bool>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(bool, Bool_val(in));
}

template <typename CxxType>
std::vector<CxxType> caml_to_cxx_array(value in)
{
    CAMLparam1(in);
    mlsize_t size = Wosize_val(in);
    std::vector<CxxType> out(size);
    for (size_t i = 0; i < size; ++i)
        out[i] = caml_to_cxx<value, CxxType>(Field(in, i));
    CAMLreturnT(std::vector<CxxType>, out);
}

// OCaml Manual 20.3.3 - Arrays
// "Arrays of floating-point numbers (type float array) have a special,
// unboxed, more efficient representation. These arrays are represented by
// pointers to blocks with tag Double_array_tag. They should be accessed with
// the Double_field and Store_double_field macros."
// https://caml.inria.fr/pub/docs/manual-ocaml/intfc.html#ss:c-arrays

template <>
value cxx_to_caml_array(const std::vector<double>& in)
{
    CAMLparam0();
    CAMLlocal1(v);
    size_t size = in.size();
    v = caml_alloc_float_array(size);
    for (size_t i = 0; i < size; ++i)
        Store_double_field(v, i, in[i]);
    CAMLreturn(v);
}

template <>
std::vector<double> caml_to_cxx_array(value in)
{
    CAMLparam1(in);
    mlsize_t size = Wosize_val(in);
    std::vector<double> out(size);
    for (size_t i = 0; i < size; ++i)
        out[i] = Double_field(in, i);
    CAMLreturnT(std::vector<double>, out);
}


// Les actions de jeu
template<>
value cxx_to_caml<value, action>(action in)
{
    CAMLparam0();
    CAMLreturn(Val_int(in));
}

template<>
action caml_to_cxx<value, action>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(action, (action)Int_val(in));
}

// Enumeration contentant toutes les erreurs possibles
template<>
value cxx_to_caml<value, error>(error in)
{
    CAMLparam0();
    CAMLreturn(Val_int(in));
}

template<>
error caml_to_cxx<value, error>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(error, (error)Int_val(in));
}

// Enumeration représentant les différents joueurs
template<>
value cxx_to_caml<value, joueur>(joueur in)
{
    CAMLparam0();
    CAMLreturn(Val_int(in));
}

template<>
joueur caml_to_cxx<value, joueur>(value in)
{
    CAMLparam1(in);
    CAMLreturnT(joueur, (joueur)Int_val(in));
}

// La description d'une action jouée
template<>
value cxx_to_caml<value, action_jouee>(action_jouee in)
{
    CAMLparam0();
    CAMLlocal1(out);
    out = caml_alloc(5, 0);
    Store_field(out, 0, (cxx_to_caml<value, action>(in.act)));
    Store_field(out, 1, (cxx_to_caml<value, int>(in.c1)));
    Store_field(out, 2, (cxx_to_caml<value, int>(in.c2)));
    Store_field(out, 3, (cxx_to_caml<value, int>(in.c3)));
    Store_field(out, 4, (cxx_to_caml<value, int>(in.c4)));
    CAMLreturn(out);
}

template<>
action_jouee caml_to_cxx<value, action_jouee>(value in)
{
    CAMLparam1(in);
    action_jouee out;
    out.act = caml_to_cxx<value, action>(Field(in, 0));
    out.c1 = caml_to_cxx<value, int>(Field(in, 1));
    out.c2 = caml_to_cxx<value, int>(Field(in, 2));
    out.c3 = caml_to_cxx<value, int>(Field(in, 3));
    out.c4 = caml_to_cxx<value, int>(Field(in, 4));
    CAMLreturnT(action_jouee, out);
}

/*
** Inititialize caml
*/
static inline void _init_caml()
{
    static bool is_initialized = false;
    if (!is_initialized)
    {
        is_initialized = true;
        char program_name[] = "./caml";
        char* argv[2] = {program_name, NULL};
        caml_startup(argv);
    }
}

// Renvoie l'identifiant du joueur
extern "C" CAMLprim value ml_id_joueur(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, joueur>(api_id_joueur())));
}

// Renvoie l'identifiant de l'adversaire
extern "C" CAMLprim value ml_id_adversaire(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, joueur>(api_id_adversaire())));
}

// Renvoie le numéro de la manche
extern "C" CAMLprim value ml_manche(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, int>(api_manche())));
}

// Renvoie le numéro de la manche
extern "C" CAMLprim value ml_tour(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, int>(api_tour())));
}

// Renvoie l'action jouée par l'adversaire
extern "C" CAMLprim value ml_tour_precedent(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, action_jouee>(api_tour_precedent())));
}

// Renvoie le nombre de carte validée par le joueur pour la geisha
extern "C" CAMLprim value ml_nb_carte_validee(value j, value g)
{
    CAMLparam2(j, g);
    CAMLreturn((cxx_to_caml<value, int>(api_nb_carte_validee(caml_to_cxx<value, joueur>(j), caml_to_cxx<value, int>(g)))));
}

// Renvoie qui possède la geisha
extern "C" CAMLprim value ml_possession_geisha(value g)
{
    CAMLparam1(g);
    CAMLreturn((cxx_to_caml<value, joueur>(api_possession_geisha(caml_to_cxx<value, int>(g)))));
}

// Renvoie si l'action a déjà été jouée par le joueur
extern "C" CAMLprim value ml_est_jouee_action(value j, value a)
{
    CAMLparam2(j, a);
    CAMLreturn((cxx_to_caml<value, bool>(api_est_jouee_action(caml_to_cxx<value, joueur>(j), caml_to_cxx<value, action>(a)))));
}

// Renvoie le nombre de carte que le joueur a
extern "C" CAMLprim value ml_nb_cartes(value j)
{
    CAMLparam1(j);
    CAMLreturn((cxx_to_caml<value, int>(api_nb_cartes(caml_to_cxx<value, joueur>(j)))));
}

// Renvoie les cartes que vous avez
extern "C" CAMLprim value ml_cartes_en_main(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml_array(api_cartes_en_main())));
}

// Renvoie la carte que vous avez pioché au début du tour
extern "C" CAMLprim value ml_carte_pioche(value unit)
{
    CAMLparam1(unit);
    CAMLreturn((cxx_to_caml<value, int>(api_carte_pioche())));
}

// Jouer l'action valider une carte
extern "C" CAMLprim value ml_action_valider(value c)
{
    CAMLparam1(c);
    CAMLreturn((cxx_to_caml<value, error>(api_action_valider(caml_to_cxx<value, int>(c)))));
}

// Jouer l'action défausser deux cartes
extern "C" CAMLprim value ml_action_defausser(value c1, value c2)
{
    CAMLparam2(c1, c2);
    CAMLreturn((cxx_to_caml<value, error>(api_action_defausser(caml_to_cxx<value, int>(c1), caml_to_cxx<value, int>(c2)))));
}

// Jouer l'action choisir entre trois cartes
extern "C" CAMLprim value ml_action_choix_trois(value c1, value c2, value c3)
{
    CAMLparam3(c1, c2, c3);
    CAMLreturn((cxx_to_caml<value, error>(api_action_choix_trois(caml_to_cxx<value, int>(c1), caml_to_cxx<value, int>(c2), caml_to_cxx<value, int>(c3)))));
}

// Jouer l'action choisir entre deux paquets de deux cartes
extern "C" CAMLprim value ml_action_choix_paquets(value p1c1, value p1c2, value p2c1, value p2c2)
{
    CAMLparam4(p1c1, p1c2, p2c1, p2c2);
    CAMLreturn((cxx_to_caml<value, error>(api_action_choix_paquets(caml_to_cxx<value, int>(p1c1), caml_to_cxx<value, int>(p1c2), caml_to_cxx<value, int>(p2c1), caml_to_cxx<value, int>(p2c2)))));
}

// Choisir une des trois cartes proposées.
extern "C" CAMLprim value ml_repondre_choix_trois(value c)
{
    CAMLparam1(c);
    CAMLreturn((cxx_to_caml<value, error>(api_repondre_choix_trois(caml_to_cxx<value, int>(c)))));
}

// Choisir un des deux paquets proposés.
extern "C" CAMLprim value ml_repondre_choix_paquets(value p)
{
    CAMLparam1(p);
    CAMLreturn((cxx_to_caml<value, error>(api_repondre_choix_paquets(caml_to_cxx<value, int>(p)))));
}

// Affiche le contenu d'une valeur de type action
extern "C" CAMLprim value ml_afficher_action(value v)
{
    CAMLparam1(v);
    api_afficher_action(caml_to_cxx<value, action>(v));
    CAMLreturn(Val_unit);
}

// Affiche le contenu d'une valeur de type error
extern "C" CAMLprim value ml_afficher_error(value v)
{
    CAMLparam1(v);
    api_afficher_error(caml_to_cxx<value, error>(v));
    CAMLreturn(Val_unit);
}

// Affiche le contenu d'une valeur de type joueur
extern "C" CAMLprim value ml_afficher_joueur(value v)
{
    CAMLparam1(v);
    api_afficher_joueur(caml_to_cxx<value, joueur>(v));
    CAMLreturn(Val_unit);
}

// Affiche le contenu d'une valeur de type action_jouee
extern "C" CAMLprim value ml_afficher_action_jouee(value v)
{
    CAMLparam1(v);
    api_afficher_action_jouee(caml_to_cxx<value, action_jouee>(v));
    CAMLreturn(Val_unit);
}


// Fonction appelée au début du jeu
extern "C" void init_jeu()
{
    _init_caml();
    CAMLparam0();
    CAMLlocal1(_ret);

    static const value *closure = NULL;
    if (closure == NULL)
        closure = caml_named_value("ml_init_jeu");

    _ret = caml_callback(*closure, Val_unit);

    CAMLreturn0;
}

// Fonction appelée au début du tour
extern "C" void jouer_tour()
{
    _init_caml();
    CAMLparam0();
    CAMLlocal1(_ret);

    static const value *closure = NULL;
    if (closure == NULL)
        closure = caml_named_value("ml_jouer_tour");

    _ret = caml_callback(*closure, Val_unit);

    CAMLreturn0;
}

// Fonction appelée lors du choix entre les trois cartes lors de l'action de
// l'adversaire (cf tour_precedent)
extern "C" void repondre_action_choix_trois()
{
    _init_caml();
    CAMLparam0();
    CAMLlocal1(_ret);

    static const value *closure = NULL;
    if (closure == NULL)
        closure = caml_named_value("ml_repondre_action_choix_trois");

    _ret = caml_callback(*closure, Val_unit);

    CAMLreturn0;
}

// Fonction appelée lors du choix entre deux paquet lors de l'action de
// l'adversaire (cf tour_precedent)
extern "C" void repondre_action_choix_paquets()
{
    _init_caml();
    CAMLparam0();
    CAMLlocal1(_ret);

    static const value *closure = NULL;
    if (closure == NULL)
        closure = caml_named_value("ml_repondre_action_choix_paquets");

    _ret = caml_callback(*closure, Val_unit);

    CAMLreturn0;
}

// Fonction appelée à la fin du jeu
extern "C" void fin_jeu()
{
    _init_caml();
    CAMLparam0();
    CAMLlocal1(_ret);

    static const value *closure = NULL;
    if (closure == NULL)
        closure = caml_named_value("ml_fin_jeu");

    _ret = caml_callback(*closure, Val_unit);

    CAMLreturn0;
}