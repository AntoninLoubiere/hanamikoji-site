from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from . import forms

@login_required
def home(request):
    return render(request, 'game/home.html')

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