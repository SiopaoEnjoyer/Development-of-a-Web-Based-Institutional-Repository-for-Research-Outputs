"""
URL configuration for G12Research project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import serve_pdf
from django.contrib.sitemaps.views import sitemap
from django.contrib.sitemaps import Sitemap
from research.models import ResearchPaper

# Static pages sitemap
class StaticViewSitemap(Sitemap):
    priority = 0.8
    changefreq = 'weekly'
    protocol = 'https'
    
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

# Research papers sitemap
class ResearchPaperSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.9
    protocol = 'https'

    def items(self):
        return ResearchPaper.objects.all().order_by('-publication_date')

    def lastmod(self, obj):
        return obj.publication_date

sitemaps = {
    'static': StaticViewSitemap,
    'research': ResearchPaperSitemap,
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('research.urls')),
    path('accounts/', include(('accounts.urls','accounts'), namespace='accounts')),
    path('favicon.ico', RedirectView.as_view(url='/static/research/img/trinity.ico')),
    path('robots.txt', RedirectView.as_view(url='/static/robots.txt', permanent=True)),
    path('google76065d2dc7995232.html', RedirectView.as_view(url='/static/google76065d2dc7995232.html', permanent=True)),
    path('media/<path:path>', serve_pdf, name='serve_pdf'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)