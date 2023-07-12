// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (c) 2020 Association Prologin <association@prologin.org>

// This file contains the code to call the API functions from the C language.
// This file was generated by stechec2-generator. DO NOT EDIT.

#include <string>
#include <vector>

extern "C"
{
#include "api.h"
}

template <typename CType, typename CxxType>
CxxType c_to_cxx(CType in)
{
    return in;
}

template <>
std::string c_to_cxx<char*, std::string>(char* in)
{
    return in;
}

template <typename CType, typename CType_array, typename CxxType>
std::vector<CxxType> c_to_cxx_array(CType_array in)
{
    std::vector<CxxType> out(in.length);
    for (size_t i = 0; i < in.length; ++i)
        out[i] = c_to_cxx<CType, CxxType>(in.items[i]);
    return out;
}

template <typename CType, typename CxxType>
CType cxx_to_c(CxxType in)
{
    return in;
}

template <>
char* cxx_to_c<char*, std::string>(std::string in)
{
    size_t l = in.length();
    char* out = (char *) malloc(l + 1);
    for (size_t i = 0; i < l; i++)
        out[i] = in[i];
    out[l] = 0;
    return out;
}

template <typename CType, typename CType_array, typename CxxType>
CType_array cxx_to_c_array(const std::vector<CxxType>& in)
{
    CType_array out = {NULL, in.size()};
    out.items = (CType*)malloc((out.length) * sizeof(CType));
    for (size_t i = 0; i < out.length; ++i)
        out.items[i] = cxx_to_c<CType, CxxType>(in[i]);
    return out;
}

/// La description d'une action jouée

typedef struct __internal__cxx__action_jouee
{
    action act; ///< L'action jouée
    int c1; ///< Si act==VALIDER ou act==DEFAUSSER, -1 sinon la première carte (du premier paquet)
    int c2; ///< Si act==V|D: -1 sinon la deuxième carte (du premier paquet)
    int c3; ///< Si act==V|D: -1 sinon la troisième carte (ou la première carte du second paquet si act==choix paquet)
    int c4; ///< Si act!=choix paquet: -1 sinon la deuxième carte du second paquet
} __internal__cxx__action_jouee;

template <>
__internal__cxx__action_jouee c_to_cxx<action_jouee, __internal__cxx__action_jouee>(action_jouee in)
{
    __internal__cxx__action_jouee out;
    out.act = c_to_cxx<action, action>(in.act);
    out.c1 = c_to_cxx<int, int>(in.c1);
    out.c2 = c_to_cxx<int, int>(in.c2);
    out.c3 = c_to_cxx<int, int>(in.c3);
    out.c4 = c_to_cxx<int, int>(in.c4);
    return out;
}

template <>
action_jouee cxx_to_c<action_jouee, __internal__cxx__action_jouee>(__internal__cxx__action_jouee in)
{
    action_jouee out;
    out.act = cxx_to_c<action, action>(in.act);
    out.c1 = cxx_to_c<int, int>(in.c1);
    out.c2 = cxx_to_c<int, int>(in.c2);
    out.c3 = cxx_to_c<int, int>(in.c3);
    out.c4 = cxx_to_c<int, int>(in.c4);
    return out;
}


extern "C" joueur api_id_joueur();

extern "C" joueur id_joueur(void)
{
    return cxx_to_c<joueur, joueur>(api_id_joueur());
}

extern "C" joueur api_id_adversaire();

extern "C" joueur id_adversaire(void)
{
    return cxx_to_c<joueur, joueur>(api_id_adversaire());
}

extern "C" int api_manche();

extern "C" int manche(void)
{
    return cxx_to_c<int, int>(api_manche());
}

extern "C" int api_tour();

extern "C" int tour(void)
{
    return cxx_to_c<int, int>(api_tour());
}

extern "C" __internal__cxx__action_jouee api_tour_precedent();

extern "C" action_jouee tour_precedent(void)
{
    return cxx_to_c<action_jouee, __internal__cxx__action_jouee>(api_tour_precedent());
}

extern "C" int api_nb_carte_validee(joueur j, int g);

extern "C" int nb_carte_validee(joueur j, int g)
{
    return cxx_to_c<int, int>(api_nb_carte_validee(c_to_cxx<joueur, joueur>(j), c_to_cxx<int, int>(g)));
}

extern "C" joueur api_possession_geisha(int g);

extern "C" joueur possession_geisha(int g)
{
    return cxx_to_c<joueur, joueur>(api_possession_geisha(c_to_cxx<int, int>(g)));
}

extern "C" bool api_est_jouee_action(joueur j, action a);

extern "C" bool est_jouee_action(joueur j, action a)
{
    return cxx_to_c<bool, bool>(api_est_jouee_action(c_to_cxx<joueur, joueur>(j), c_to_cxx<action, action>(a)));
}

extern "C" int api_nb_cartes(joueur j);

extern "C" int nb_cartes(joueur j)
{
    return cxx_to_c<int, int>(api_nb_cartes(c_to_cxx<joueur, joueur>(j)));
}

extern "C" std::vector<int> api_cartes_en_main();

extern "C" int_array cartes_en_main(void)
{
    return cxx_to_c_array<int, int_array, int>(api_cartes_en_main());
}

extern "C" int api_carte_pioche();

extern "C" int carte_pioche(void)
{
    return cxx_to_c<int, int>(api_carte_pioche());
}

extern "C" error api_action_valider(int c);

extern "C" error action_valider(int c)
{
    return cxx_to_c<error, error>(api_action_valider(c_to_cxx<int, int>(c)));
}

extern "C" error api_action_defausser(int c1, int c2);

extern "C" error action_defausser(int c1, int c2)
{
    return cxx_to_c<error, error>(api_action_defausser(c_to_cxx<int, int>(c1), c_to_cxx<int, int>(c2)));
}

extern "C" error api_action_choix_trois(int c1, int c2, int c3);

extern "C" error action_choix_trois(int c1, int c2, int c3)
{
    return cxx_to_c<error, error>(api_action_choix_trois(c_to_cxx<int, int>(c1), c_to_cxx<int, int>(c2), c_to_cxx<int, int>(c3)));
}

extern "C" error api_action_choix_paquets(int p1c1, int p1c2, int p2c1, int p2c2);

extern "C" error action_choix_paquets(int p1c1, int p1c2, int p2c1, int p2c2)
{
    return cxx_to_c<error, error>(api_action_choix_paquets(c_to_cxx<int, int>(p1c1), c_to_cxx<int, int>(p1c2), c_to_cxx<int, int>(p2c1), c_to_cxx<int, int>(p2c2)));
}

extern "C" error api_repondre_choix_trois(int c);

extern "C" error repondre_choix_trois(int c)
{
    return cxx_to_c<error, error>(api_repondre_choix_trois(c_to_cxx<int, int>(c)));
}

extern "C" error api_repondre_choix_paquets(int p);

extern "C" error repondre_choix_paquets(int p)
{
    return cxx_to_c<error, error>(api_repondre_choix_paquets(c_to_cxx<int, int>(p)));
}

extern "C" void api_afficher_action(action v);

extern "C" void afficher_action(action v)
{
api_afficher_action(c_to_cxx<action, action>(v));
}

extern "C" void api_afficher_error(error v);

extern "C" void afficher_error(error v)
{
api_afficher_error(c_to_cxx<error, error>(v));
}

extern "C" void api_afficher_joueur(joueur v);

extern "C" void afficher_joueur(joueur v)
{
api_afficher_joueur(c_to_cxx<joueur, joueur>(v));
}

extern "C" void api_afficher_action_jouee(__internal__cxx__action_jouee v);

extern "C" void afficher_action_jouee(action_jouee v)
{
api_afficher_action_jouee(c_to_cxx<action_jouee, __internal__cxx__action_jouee>(v));
}