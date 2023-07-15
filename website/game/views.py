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
def matchs(request):
    message=''
    if request.method == 'POST':
        form = Filter_Champion(request.POST)
        if form.is_valid():
            try:
                champion = Champion.objects.get(nom=form.cleaned_data["nom_du_champion"])
                matchs = Match.objects.filter(
                    Q(champion1=champion) |
                    Q(champion2=champion)
                ).order_by("-date")
            except Champion.DoesNotExist:
                if form.cleaned_data["nom_du_champion"] != '':
                    message='Nom non trouvé !'
                matchs =  Match.objects.all().order_by("-date")
    else:
        form = Filter_Champion()
        matchs =  Match.objects.all().order_by("-date")
    return render(request,'game/matchs.html',context={'matchs':matchs,'form':form,'message':message})

@login_required
def champions(request):
    message=''
    # if request.method == 'POST':
    #     form = Filter_User(request.POST)
    #     if form.is_valid():
    #         try:
    #             user = User.objects.get(username=form.cleaned_data["utilisateur"])
    #             champions = Champion.objects.filters(uploader_id__in=user.id)#C'est là que ça marche pas
    #         except User.DoesNotExist:
    #             if form.cleaned_data["utilisateur"] != '':
    #                 message='Utiilisateur non trouvé !'
    #             champions =  Champion.objects.all().order_by("-date")
    # else:
    form = Filter_User() 
    champions =  Champion.objects.all().order_by("-date")
    return render(request,'game/champions.html',context={'champions':champions,'form':form,'message':message})

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
                return redirect(match_detail, m.id_match)
                # message="Match ajouté"#Si le match a bien été ajouté
            except Champion.DoesNotExist:
                message='Nom non trouvé !'
    else:
        form = Add_Match() 
    return render(request,'game/add_match.html',context={'form':form,'message':message})