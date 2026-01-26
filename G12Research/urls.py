"""
URL configuration for G12Research project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
from django.urls import path, include
from django.views.generic.base import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import serve_pdf
from django.contrib.sitemaps.views import sitemap
from django.contrib.sitemaps import GenericSitemap, Sitemap
from research.models import ResearchPaper

# Define sitemaps
class StaticViewSitemap(Sitemap):
    priority = 0.8
    changefreq = 'weekly'
    
    def items(self):
        return ['home', 'about', 'privacy-policy', 'terms', 'research', 'search']
    
    def location(self, item):
        if item == 'home':
            return '/'
        elif item == 'research':
            return '/research/'
        elif item == 'search':
            return '/search/'
        else:
            return f'/{item}/'

# Sitemap for research papers
research_dict = {
    'queryset': ResearchPaper.objects.all().order_by('-publication_date'),
    'date_field': 'publication_date',
}

sitemaps = {
    'static': StaticViewSitemap,
    'research': GenericSitemap(research_dict, priority=0.9, changefreq='monthly'),
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('research.urls')),
    path('accounts/', include(('accounts.urls','accounts'), namespace='accounts')),
    path('favicon.ico', RedirectView.as_view(url='/static/research/img/trinity.ico')),
    path('robots.txt', RedirectView.as_view(url='/static/robots.txt', permanent=True)),
    path('media/<path:path>', serve_pdf, name='serve_pdf'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)