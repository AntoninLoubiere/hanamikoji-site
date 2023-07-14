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
    #path('', authentication.views.login_page, name='login'),
    #path('logout/',authentication.views.logout_user,name='logout'),
    path('home/',game.views.home,name='home'),
    path('signup/', authentication.views.signup_page, name='signup'),
    path('upload/', game.views.champion_upload, name='champion_upload'),
    path('matchs/',game.views.matchs, name='matchs'),
    path('champions/',game.views.champions, name='champions'),
    path('matchs/<int:id>',game.views.match_detail, name='match_detail'),
    path('add_match/',game.views.add_match,name='add_match')
]
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)