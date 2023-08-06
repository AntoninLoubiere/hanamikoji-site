"""
URL configuration for website project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView, PasswordChangeView, PasswordChangeDoneView
import authentication.views
import game.views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.contrib.staticfiles.storage import staticfiles_storage

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', LoginView.as_view(
            template_name='authentication/login.html',
            redirect_authenticated_user=True),
        name='login'),
    path('logout/',LogoutView.as_view(),name='logout'),
    path('change-password/', PasswordChangeView.as_view(
        template_name='authentication/password_change_form.html'),
         name='password_change'
         ),
    path('change-password-done/', PasswordChangeDoneView.as_view(
        template_name='authentication/password_change_done.html'),
         name='password_change_done'
         ),
    path('home/',game.views.home,name='home'),
    path('signup/', authentication.views.signup_page, name='signup'),
    path('upload/', game.views.champion_upload, name='champion_upload'),
    path('matchs/',game.views.matchs, name='matchs'),
    path('champions/',game.views.champions, name='champions'),
    path('matchs/<int:id>/',game.views.match_detail, name='match_detail'),
    path('add_match/',game.views.add_match,name='add_match'),
    path('delete/<str:name>/',game.views.delete_champion,name='delete_champion'),
    path('matchs/<int:id>/out/<int:nb>/',game.views.redirection_out,name='redirection_out'),
    path('champions/code/<str:name>/',game.views.redirection_code,name='redirection_code'),
    path('champions/<str:name>/',game.views.champion_detail,name='champion_detail'),
    path('tournois/', game.views.tournois,name='tournois'),
    path('tournois/ajouter/',game.views.add_tournoi,name='add_tournoi'),
    path('tournois/<int:id>/',game.views.tournoi_detail,name='tournoi_detail'),
    path('tournois/<int:id>/change',game.views.update_tournoi,name='update_tournoi'),
    path('tournois/<int:id>/<str:nom>/delete',game.views.delete_champion_tournoi,name='delete_champion_tournoi'),
    path('favicon.ico', RedirectView.as_view(url=staticfiles_storage.url('favicon.ico')))
]
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)