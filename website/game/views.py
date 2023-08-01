from datetime import datetime
from django.utils import timezone
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth.decorators import login_required
from game.tasks import MATCH_OUT_DIR, on_end_tournoi

from . import forms
from game.models import Champion, Match, Tournoi, Inscrit
from  django.db.models import Q
from authentication.models import User

from django.core.paginator import Paginator
import datetime

from django.db.models import Count

MIMES_TYPES = {
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.tgz': 'application/gzip',
    '.zip': 'application/zip',
    '.cc': 'text/x-c++src',
    '.cpp': 'text/x-c++src',
    '.ml': 'text/x-ocaml',
    '.c': 'text/x-csrc',
    '.py': 'text/x-python',
}

@login_required
def home(request):
    champions = Champion.objects.filter(
        uploader_id=request.user.id
    ).order_by("-date")
    matchs = Match.objects.filter(
        Q(champion1__in=champions) |
        Q(champion2__in=champions)
    ).order_by("-date")[:5]
    return render(request, 'game/home.html',context={'champions':champions,'matchs':matchs})

@login_required
def champion_upload(request):
    form = forms.ChampionsForm()
    if request.method == 'POST':
        form = forms.ChampionsForm(request.POST, request.FILES)
        if form.is_valid():
            champion = form.save(commit=False)
            champion.uploader = request.user
            champion.save()
            return redirect('home')
    return render(request, 'game/champion_upload.html', context={'form': form})

@login_required
def match_detail(request,id):
    match_select = get_object_or_404(Match, id_match=id)
    suiv = True
    try : 
        match_suiv = Match.objects.get(id_match=id+1)
    except Match.DoesNotExist :
        suiv = False
    map = ""
    if match_select.status == Match.Status.FINI:
        map = (MATCH_OUT_DIR / str(match_select.id_match) / 'map.txt').read_text()


    return render(request, 'game/match_detail.html',context={'match':match_select, 'map': map, 'suivant':suiv})


@login_required
def matchs(request: HttpRequest):
    message=''
    list_champions = get_champions_per_user(request.user)
    matchs = None

    filt_type = "all"
    filt_id = -1
    if request.method == 'POST':
        filt = request.POST.get('filter', 'all')
        f = filt.split('-')
        if len(f) >= 1:
            filt_type = f[0]
            if len(f) >= 2:
                try:
                    filt_id = int(f[1])
                except ValueError:
                    pass

        if filt_type == 'user':
            matchs = Match.objects.filter(Q(champion1__uploader__id=filt_id) | Q(champion2__uploader__id=filt_id)).order_by("-date")
        elif filt_type == 'champ':
            matchs = Match.objects.filter(Q(champion1__id=filt_id) | Q(champion2__id=filt_id)).order_by("-date")

    if matchs is None:
        matchs =  Match.objects.all().order_by("-date")
    paginator = Paginator(matchs,15)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)
    return render(request,'game/matchs.html',context={'matchs':page_obj,'message':message, 'list_champions': list_champions, 'filter_type': filt_type, 'filter_id': filt_id})

@login_required
def champions(request):
    message=''
    champions = None
    users = User.objects.all()

    filter_id = -1
    if request.method == 'POST':
        filter_id = request.POST.get('filter', 'all')
        if filter_id != 'all':
            try:
                filter_id = int(filter_id)
                champions = Champion.objects.filter(uploader__id=filter_id).order_by("-date")
            except ValueError:
                pass

    if champions is None:
        champions =  Champion.objects.all().order_by("-date")
    paginator = Paginator(champions,15)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)
    return render(request,'game/champions.html',context={'champions':page_obj, 'users': users, 'message':message, 'filter_id': filter_id})

def get_champions_per_user(current_user=None, filter_champions=False):
    champs = Champion.objects.filter(compilation_status=Champion.Status.FINI) if filter_champions else Champion.objects.all()
    champs = champs.order_by('-date')
    users = {}
    for c in champs:
        l = users.get(c.uploader, None)
        if l is None:
            l = []
            users[c.uploader] = l
        l.append(c)

    r = []
    if current_user in users:
        r.append((current_user, users[current_user]))
        del users[current_user]

    for u in sorted(users, key=lambda u: u.username):
        r.append((u, users[u]))

    return r

@login_required
def tournois(request):
    tournois = Tournoi.objects.all().annotate(null_date=Count('date_lancement')).order_by("-null_date","date_lancement")
    paginator = Paginator(tournois,10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    #print(Tournoi.objects.filter(date_lancement__gt=timezone.now()))
    prochain_tournoi = Tournoi.objects.filter(date_lancement__gt=timezone.now()).order_by("date_lancement").first()
    dateiso = prochain_tournoi.date_lancement.isoformat() if prochain_tournoi else ''
    nb_champs_user = prochain_tournoi.nb_champions_user(request.user) if prochain_tournoi else 0
    return render(request,'game/tournois.html',context={'tournois': page_obj, 'prochain_tournoi': prochain_tournoi, 'timer': dateiso, 'nb_champs_user': nb_champs_user})


@login_required
def add_match(request: HttpRequest):
    message=''
    list_champions = get_champions_per_user(request.user, True)

    if request.method == 'POST':
        try:
            m = Match()
            m.champion1 = Champion.objects.get(id=int(request.POST.get('champion1')))
            m.champion2 = Champion.objects.get(id=int(request.POST.get('champion2')))
            if m.is_correct():
                m.champion1.supprimer = False
                m.champion2.supprimer = False
                m.champion1.save()
                m.champion2.save()
                m.save()
                return redirect('match_detail', m.id_match)
            else:
                message = "Match invalide (vérifier que tous les champions ont bien terminé leur compilation)"

        except (ValueError, Champion.DoesNotExist):
            message = "Champion inexistants."

    return render(request,'game/add_match.html',context={'message':message, 'list_champions': list_champions})

@login_required
def delete_champion(request,name):
    champion = Champion.objects.get(nom=name) 

    if request.method == 'POST':
        champion.delete()
        return redirect('home')
    return render(request,
                    'game/delete_champion.html',
                    {'champion': champion})

@login_required
def redirection_out(request,id,nb):
    match_s = get_object_or_404(Match, id_match=id)
    if nb == 1:
        champion = match_s.champion1
    elif nb == 2:
        champion = match_s.champion2
    else :
        return HttpResponseBadRequest("Champion inexistant")
    if champion.uploader_id == request.user.id or request.user.is_superuser:
        response = HttpResponse()
        response["Content-Type"] = "text/plain"
        response["Content-Disposition"] = f"attachment; filename=match_{id}_champion{nb}.out.txt"
        response["X-Accel-Redirect"] = f"/media/match/{id}/champion{nb}.out.txt"
        return response
    return HttpResponseForbidden("Interdit")

@login_required
def redirection_code(request, name):
    champion = get_object_or_404(Champion,nom=name)
    if champion.uploader_id == request.user.id or request.user.is_superuser:
        response = HttpResponse()

        for ext, mime in MIMES_TYPES.items():
            if champion.code.name.endswith(ext):
                response["Content-Type"] = mime
                break
        else:
            response["Content-Type"] = "application/octet-stream"
        response["Content-Disposition"] = "attachment; filename=" + champion.code.name
        response["X-Accel-Redirect"] = champion.code.url
        return response
    return HttpResponseForbidden("Interdit")


@login_required
def add_tournoi(request):
    if request.user.create_tournament :
        form = forms.TournoisForm()
        if request.method == 'POST':
            form = forms.TournoisForm(request.POST)
            if form.is_valid():
                tournoi = form.save(commit=False)
                if tournoi.date_lancement == None:
                    tournoi.status = 'EA'
                else:
                    tournoi.status = 'LP'
                tournoi.save()
                return redirect('tournoi_detail',tournoi.id_tournoi)
        return render(request,'game/add_tournoi.html',context={'form':form})
    else:
        return HttpResponseForbidden("Interdit")

@login_required
def tournoi_detail(request,id):
    tournoi = get_object_or_404(Tournoi,id_tournoi=id)
    message = ''
    if request.method == 'POST':
        nb_inscrits = Inscrit.objects.filter(tournoi=tournoi,champion__uploader=request.user).count()
        if nb_inscrits < tournoi.max_champions :
            try:
                i = Inscrit()
                i.champion = Champion.objects.get(id=int(request.POST.get('champion')))
                i.tournoi = tournoi
                i.save()
                message = "Le champion a bien été selectionné"
            except:
                message = "Il y a eu une erreur lors de l'enregistrement du champion "
        else:
            message = "C'est très étrange, le nombre max de champion a pourtant été atteind"


    inscrits = Inscrit.objects.filter(tournoi=tournoi).order_by("classement")
    matchs = Match.objects.filter(tournoi=tournoi).order_by("champion1","champion2")
    champions_select = inscrits.filter(champion__uploader=request.user)
    champions_selected_ids = champions_select.values_list('champion', flat=True).all()
    champions_non_select = Champion.objects.exclude(id__in=champions_selected_ids).filter(uploader=request.user).order_by("-date")

    termine = 0
    match_matrix = None
    nb_matchs = matchs.count()
    if tournoi.status == Tournoi.Status.EN_COURS:
        termine = Match.objects.filter(Q(tournoi=tournoi) & (Q(status=Match.Status.FINI) | Q(status=Match.Status.ERREUR))).count()
        if termine >= nb_matchs:
            on_end_tournoi(tournoi)

    if tournoi.status == Tournoi.Status.FINI:
        nb_ins = inscrits.count()

        match_matrix = []
        user_to_classement = {}
        for i in inscrits:
            user_to_classement[i.champion.pk] = len(match_matrix)
            match_matrix.append((i, [None] * nb_ins))

        for m in matchs:
            match_matrix[user_to_classement[m.champion1.pk]][1][user_to_classement[m.champion2.pk]] = m

        print(match_matrix)


    return render(request,'game/tournoi_detail.html',context={
        'tournoi':tournoi,'inscrits':inscrits, 'matchs':matchs,'termine':termine,'nb_matchs':nb_matchs,'match_matrix': match_matrix, 'champions_select': champions_select, 'champions_non_select': champions_non_select, 'nb_select': champions_select.count(), 'message': message})

@login_required
def update_tournoi(request,id):
    if request.user.create_tournament :
        tournoi = get_object_or_404(Tournoi,id_tournoi=id)
        form = forms.TournoisForm(instance=tournoi) #Le préremplissage ne marche pas avec la date à cause du changement d'attrubut
        if request.method == 'POST':
            form = forms.TournoisForm(request.POST, instance=tournoi)
            if form.is_valid():
                tournoi = form.save(commit=False)
                if tournoi.date_lancement == None:
                    tournoi.status = 'EA'
                else:
                    tournoi.status = 'LP'
                tournoi.save()
                return redirect('tournoi_detail',tournoi.id_tournoi)
        return render(request,'game/update_tournoi.html',context={'form':form,'id':id})
    else:
        return HttpResponseForbidden("Interdit")

@login_required
def delete_champion_tournoi(request,id,nom):
    inscrit = Inscrit.objects.get(tournoi=Tournoi.objects.get(id_tournoi=id),champion=Champion.objects.get(nom=nom))
    inscrit.delete()
    return redirect('tournoi_detail', id)
