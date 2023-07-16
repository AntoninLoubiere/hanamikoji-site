from django.http import HttpRequest
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from . import forms
from game.models import Champion, Match
from  django.db.models import Q
from game.forms import Filter_Champion, Filter_User, Add_Match
from authentication.models import User

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
            # set the uploader to the user before saving the model
            champion.uploader = request.user
            # now we can save
            champion.save()
            return redirect('home')
    return render(request, 'game/champion_upload.html', context={'form': form})

@login_required
def match_detail(request,id):
    match_select = Match.objects.get(id_match=id)
    return render(request, 'game/match_detail.html',context={'match':match_select})


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
    return render(request,'game/matchs.html',context={'matchs':matchs,'message':message, 'list_champions': list_champions, 'filter_type': filt_type, 'filter_id': filt_id})

@login_required
def champions(request):
    message=''
    champions = None
    users = User.objects.all()

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
    return render(request,'game/champions.html',context={'champions':champions, 'users': users, 'message':message, 'filter_id': filter_id})

def get_champions_per_user(current_user=None):
    champs = Champion.objects.all().order_by("-date")
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
def add_match(request):
    message=''
    if request.method == 'POST':
        form = Add_Match(request.POST)
        if form.is_valid():
            try:
                m = Match()
                m.champion1 = Champion.objects.get(nom=form.cleaned_data["champion_1"])
                m.champion2 = Champion.objects.get(nom=form.cleaned_data["champion_2"])
                m.save()
                if m.id_match is not None:
                    return redirect('match_detail', m.id_match)
                message="Impossible d'ajouter le match, vérifier que les deux champions sont bien valides et ont bien terminé leurs compilations."
            except Champion.DoesNotExist:
                message='Nom non trouvé !'
    else:
        form = Add_Match()
    return render(request,'game/add_match.html',context={'form':form,'message':message})