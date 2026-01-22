from django.urls import path
from . import views
from django.views.generic import TemplateView

app_name = 'research'

urlpatterns = [
    path("", TemplateView.as_view(template_name="research/home.html"), name="home"),
    path("about/", TemplateView.as_view(template_name="research/about.html"), name="about"),
    path("research/", views.IndexView.as_view(), name="index"),
    path("research/strand/<str:strand>/<str:design>/", views.StrandDesignFilteredView.as_view(), name="strand_design"),
    path("research/strand/<str:strand>/", views.StrandFilteredView.as_view(), name="strand"),
    path("research/<int:pk>/", views.DetailView.as_view(), name="detail"),
    path("terms/", TemplateView.as_view(template_name="research/terms.html"), name="terms"),
    path("privacy-policy/", TemplateView.as_view(template_name="research/privacy_policy.html"), name="privacy_policy"),
    path("search/", views.SearchView.as_view(), name="search"),
    
    # Admin Dashboard
    path("research-dashboard/", views.AdminDashboardView.as_view(), name="admin_dashboard"),
    path("research-dashboard/upload/", views.ResearchPaperCreateView.as_view(), name="upload_paper"),
    path("research-dashboard/edit/<int:pk>/", views.ResearchPaperUpdateView.as_view(), name="edit_paper"),
    path("research-dashboard/delete/<int:pk>/", views.ResearchPaperDeleteView.as_view(), name="delete_paper"),
    path("research-dashboard/authors/", views.ManageAuthorsView.as_view(), name="manage_authors"),
    path("research-dashboard/keywords/", views.KeywordManageView.as_view(), name="manage_keywords"),
    
    # AJAX Endpoints
    path("ajax/authors-by-batch/", views.GetAuthorsByBatchView.as_view(), name="get_authors_by_batch"),
    path("ajax/add-author/", views.AddAuthorAjaxView.as_view(), name="add_author_ajax"),
    path("ajax/add-keyword/", views.AddKeywordAjaxView.as_view(), name="add_keyword_ajax"),
    path("ajax/get-all-keywords/", views.GetAllKeywordsView.as_view(), name="get_all_keywords"), 
    path("ajax/add-award/", views.AddAwardAjaxView.as_view(), name="add_award_ajax"),

    path('test-404/', TemplateView.as_view(template_name='404.html'), name='test_404'),
]