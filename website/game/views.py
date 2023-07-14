from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from . import forms
from game.models import Champion, Match
from  django.db.models import Q
from game.forms import Filter_Champion

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
                form = Filter_Champion() 
                matchs =  Match.objects.all()
    else:
        form = Filter_Champion() 
        matchs =  Match.objects.all()
    return render(request,'game/matchs.html',context={'matchs':matchs,'form':form,'message':message})
