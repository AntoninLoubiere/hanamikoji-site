// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (c) 2020 Association Prologin <association@prologin.org>

// This file contains the code to call the API functions from the C language.
// This file was generated by stechec2-generator. DO NOT EDIT.

#include <vector>
#include <string>

#include "HsFFI.h"

extern "C" {
#include "api.h"
}

extern "C" void haskell_init()
{
    static bool done = false;
    if (!done){
        hs_init(0, 0);
        done = true;
    }
}

static std::vector<void*> __internal_need_free;

template<typename CPtrType, typename CxxType>
CxxType cptr_to_cxx(CPtrType in)
{
    return in;
}

template<>
std::string cptr_to_cxx<char*, std::string>(char* in)
{
    return in;
}

template<typename CPtrType, typename CPtrType_array, typename CxxType>
std::vector<CxxType> cptr_to_cxx_array(CPtrType_array in)
{
    std::vector<CxxType> out(in.length);
    for (size_t i = 0; i < in.length; ++i)
        out[i] = cptr_to_cxx<CPtrType, CxxType>(in.items[i]);
    return out;
}

template<typename CPtrType, typename CPtrType_array, typename CxxType>
std::vector<CxxType> cptr_to_cxx_array_ptr(CPtrType_array* in)
{
    std::vector<CxxType> out(in->length);
    for (size_t i = 0; i < in->length; ++i)
        out[i] = cptr_to_cxx<CPtrType, CxxType>(in->items[i]);
    return out;
}

template<typename CPtrType, typename CxxType>
CPtrType cxx_to_cptr(CxxType in)
{
    return in;
}

template<>
char* cxx_to_cptr<char*, std::string>(std::string in)
{
    size_t l = in.length();
    char* out = (char *) malloc(l + 1);
    __internal_need_free.push_back(out);
    for (size_t i = 0; i < l; i++)
        out[i] = in[i];
    out[l] = 0;
    return out;
}

template<typename CPtrType, typename CPtrType_array, typename CxxType>
CPtrType_array cxx_to_cptr_array(const std::vector<CxxType>& in)
{
    CPtrType_array out = { NULL, in.size() };
    out.items = (CPtrType *)malloc((out.length) * sizeof(CPtrType));
    __internal_need_free.push_back(out.items);
    for (size_t i = 0; i < out.length; ++i)
        out.items[i] = cxx_to_cptr<CPtrType, CxxType>(in[i]);
    return out;
}

template<typename CPtrType, typename CPtrType_array, typename CxxType>
CPtrType_array* cxx_to_cptr_array_ptr(const std::vector<CxxType>& in)
{
    CPtrType_array* out = (CPtrType_array*)malloc(sizeof (CPtrType_array));
    __internal_need_free.push_back(out);
    *out = { NULL, in.size() };
    out->items = (CPtrType *)malloc((out->length) * sizeof(CPtrType));
    __internal_need_free.push_back(out->items);
    for (size_t i = 0; i < out->length; ++i)
        out->items[i] = cxx_to_cptr<CPtrType, CxxType>(in[i]);
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

template<>
__internal__cxx__action_jouee cptr_to_cxx<action_jouee, __internal__cxx__action_jouee>(action_jouee in)
{
    __internal__cxx__action_jouee out;
    out.act = cptr_to_cxx<action, action>(in.act);
    out.c1 = cptr_to_cxx<int, int>(in.c1);
    out.c2 = cptr_to_cxx<int, int>(in.c2);
    out.c3 = cptr_to_cxx<int, int>(in.c3);
    out.c4 = cptr_to_cxx<int, int>(in.c4);
    return out;
}

template<>
action_jouee cxx_to_cptr<action_jouee, __internal__cxx__action_jouee>(__internal__cxx__action_jouee in)
{
    action_jouee out;
    out.act = cxx_to_cptr<action, action>(in.act);
    out.c1 = cxx_to_cptr<int, int>(in.c1);
    out.c2 = cxx_to_cptr<int, int>(in.c2);
    out.c3 = cxx_to_cptr<int, int>(in.c3);
    out.c4 = cxx_to_cptr<int, int>(in.c4);
    return out;
}

template<>
__internal__cxx__action_jouee cptr_to_cxx<action_jouee*, __internal__cxx__action_jouee>(action_jouee* in)
{
    __internal__cxx__action_jouee out;
    out.act = cptr_to_cxx<action, action>(in->act);
    out.c1 = cptr_to_cxx<int, int>(in->c1);
    out.c2 = cptr_to_cxx<int, int>(in->c2);
    out.c3 = cptr_to_cxx<int, int>(in->c3);
    out.c4 = cptr_to_cxx<int, int>(in->c4);
    return out;
}

template<>
action_jouee* cxx_to_cptr<action_jouee*, __internal__cxx__action_jouee>(__internal__cxx__action_jouee in)
{
    action_jouee* out = (action_jouee*)malloc(sizeof (action_jouee));
    __internal_need_free.push_back(out);
    out->act = cxx_to_cptr<action, action>(in.act);
    out->c1 = cxx_to_cptr<int, int>(in.c1);
    out->c2 = cxx_to_cptr<int, int>(in.c2);
    out->c3 = cxx_to_cptr<int, int>(in.c3);
    out->c4 = cxx_to_cptr<int, int>(in.c4);
    return out;
}


extern "C" joueur api_id_joueur();

extern "C" joueur hs_id_joueur(void)
{
    return cxx_to_cptr<joueur, joueur>(api_id_joueur());
}

extern "C" joueur api_id_adversaire();

extern "C" joueur hs_id_adversaire(void)
{
    return cxx_to_cptr<joueur, joueur>(api_id_adversaire());
}

extern "C" int api_manche();

extern "C" int hs_manche(void)
{
    return cxx_to_cptr<int, int>(api_manche());
}

extern "C" int api_tour();

extern "C" int hs_tour(void)
{
    return cxx_to_cptr<int, int>(api_tour());
}

extern "C" __internal__cxx__action_jouee api_tour_precedent();

extern "C" action_jouee* hs_tour_precedent(void)
{
    return cxx_to_cptr<action_jouee*, __internal__cxx__action_jouee>(api_tour_precedent());
}

extern "C" int api_nb_carte_validee(joueur j, int g);

extern "C" int hs_nb_carte_validee(joueur j, int g)
{
    return cxx_to_cptr<int, int>(api_nb_carte_validee(cptr_to_cxx<joueur, joueur>(j), cptr_to_cxx<int, int>(g)));
}

extern "C" joueur api_possession_geisha(int g);

extern "C" joueur hs_possession_geisha(int g)
{
    return cxx_to_cptr<joueur, joueur>(api_possession_geisha(cptr_to_cxx<int, int>(g)));
}

extern "C" bool api_est_jouee_action(joueur j, action a);

extern "C" bool hs_est_jouee_action(joueur j, action a)
{
    return cxx_to_cptr<bool, bool>(api_est_jouee_action(cptr_to_cxx<joueur, joueur>(j), cptr_to_cxx<action, action>(a)));
}

extern "C" int api_nb_cartes(joueur j);

extern "C" int hs_nb_cartes(joueur j)
{
    return cxx_to_cptr<int, int>(api_nb_cartes(cptr_to_cxx<joueur, joueur>(j)));
}

extern "C" std::vector<int> api_cartes_en_main();

extern "C" int_array* hs_cartes_en_main(void)
{
    return cxx_to_cptr_array_ptr<int, int_array, int>(api_cartes_en_main());
}

extern "C" int api_carte_pioche();

extern "C" int hs_carte_pioche(void)
{
    return cxx_to_cptr<int, int>(api_carte_pioche());
}

extern "C" error api_action_valider(int c);

extern "C" error hs_action_valider(int c)
{
    return cxx_to_cptr<error, error>(api_action_valider(cptr_to_cxx<int, int>(c)));
}

extern "C" error api_action_defausser(int c1, int c2);

extern "C" error hs_action_defausser(int c1, int c2)
{
    return cxx_to_cptr<error, error>(api_action_defausser(cptr_to_cxx<int, int>(c1), cptr_to_cxx<int, int>(c2)));
}

extern "C" error api_action_choix_trois(int c1, int c2, int c3);

extern "C" error hs_action_choix_trois(int c1, int c2, int c3)
{
    return cxx_to_cptr<error, error>(api_action_choix_trois(cptr_to_cxx<int, int>(c1), cptr_to_cxx<int, int>(c2), cptr_to_cxx<int, int>(c3)));
}

extern "C" error api_action_choix_paquets(int p1c1, int p1c2, int p2c1, int p2c2);

extern "C" error hs_action_choix_paquets(int p1c1, int p1c2, int p2c1, int p2c2)
{
    return cxx_to_cptr<error, error>(api_action_choix_paquets(cptr_to_cxx<int, int>(p1c1), cptr_to_cxx<int, int>(p1c2), cptr_to_cxx<int, int>(p2c1), cptr_to_cxx<int, int>(p2c2)));
}

extern "C" error api_repondre_choix_trois(int c);

extern "C" error hs_repondre_choix_trois(int c)
{
    return cxx_to_cptr<error, error>(api_repondre_choix_trois(cptr_to_cxx<int, int>(c)));
}

extern "C" error api_repondre_choix_paquets(int p);

extern "C" error hs_repondre_choix_paquets(int p)
{
    return cxx_to_cptr<error, error>(api_repondre_choix_paquets(cptr_to_cxx<int, int>(p)));
}

extern "C" void api_afficher_action(action v);

extern "C" void hs_afficher_action(action v)
{
api_afficher_action(cptr_to_cxx<action, action>(v));
}

extern "C" void api_afficher_error(error v);

extern "C" void hs_afficher_error(error v)
{
api_afficher_error(cptr_to_cxx<error, error>(v));
}

extern "C" void api_afficher_joueur(joueur v);

extern "C" void hs_afficher_joueur(joueur v)
{
api_afficher_joueur(cptr_to_cxx<joueur, joueur>(v));
}

extern "C" void api_afficher_action_jouee(__internal__cxx__action_jouee v);

extern "C" void hs_afficher_action_jouee(action_jouee* v)
{
api_afficher_action_jouee(cptr_to_cxx<action_jouee*, __internal__cxx__action_jouee>(v));
}

extern "C" void hs_init_jeu(void);

extern "C" void init_jeu(void)
{
    haskell_init();
    hs_init_jeu();
    hs_perform_gc();
    for (void* ptr : __internal_need_free)
        free(ptr);
    __internal_need_free.clear();
}

extern "C" void hs_jouer_tour(void);

extern "C" void jouer_tour(void)
{
    haskell_init();
    hs_jouer_tour();
    hs_perform_gc();
    for (void* ptr : __internal_need_free)
        free(ptr);
    __internal_need_free.clear();
}

extern "C" void hs_repondre_action_choix_trois(void);

extern "C" void repondre_action_choix_trois(void)
{
    haskell_init();
    hs_repondre_action_choix_trois();
    hs_perform_gc();
    for (void* ptr : __internal_need_free)
        free(ptr);
    __internal_need_free.clear();
}

extern "C" void hs_repondre_action_choix_paquets(void);

extern "C" void repondre_action_choix_paquets(void)
{
    haskell_init();
    hs_repondre_action_choix_paquets();
    hs_perform_gc();
    for (void* ptr : __internal_need_free)
        free(ptr);
    __internal_need_free.clear();
}

extern "C" void hs_fin_jeu(void);

extern "C" void fin_jeu(void)
{
    haskell_init();
    hs_fin_jeu();
    hs_perform_gc();
    for (void* ptr : __internal_need_free)
        free(ptr);
    __internal_need_free.clear();
}