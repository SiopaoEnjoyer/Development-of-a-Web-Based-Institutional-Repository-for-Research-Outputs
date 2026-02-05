from django.urls import path
from . import views

app_name = 'research'

urlpatterns = [
    path('healthcheck/', views.healthcheck, name='healthcheck'),
    path("", views.HomeView.as_view(), name="home"),
    path("about/", views.AboutView.as_view(), name="about"),
    path("research/", views.IndexView.as_view(), name="index"),
    path("research/strand/<str:strand>/<str:design>/", views.StrandDesignFilteredView.as_view(), name="strand_design"),
    path("research/strand/<str:strand>/", views.StrandFilteredView.as_view(), name="strand"),
    path("research/<int:pk>/", views.DetailView.as_view(), name="detail"),
    path("terms/", views.TermsView.as_view(), name="terms"),
    path("privacy-policy/", views.PrivacyPolicyView.as_view(), name="privacy_policy"),
    path("search/", views.SearchView.as_view(), name="search"),
    
    path("research-dashboard/", views.AdminDashboardView.as_view(), name="admin_dashboard"),
    path("research-dashboard/upload/", views.ResearchPaperCreateView.as_view(), name="upload_paper"),
    path("research-dashboard/edit/<int:pk>/", views.ResearchPaperUpdateView.as_view(), name="edit_paper"),
    path("research-dashboard/delete/<int:pk>/", views.ResearchPaperDeleteView.as_view(), name="delete_paper"),
    path("research-dashboard/authors/", views.ManageAuthorsView.as_view(), name="manage_authors"),
    path("research-dashboard/keywords/", views.KeywordManageView.as_view(), name="manage_keywords"),
    
    path("ajax/authors-by-batch/", views.GetAuthorsByBatchView.as_view(), name="get_authors_by_batch"),
    path("ajax/add-author/", views.AddAuthorAjaxView.as_view(), name="add_author_ajax"),
    path("ajax/add-keyword/", views.AddKeywordAjaxView.as_view(), name="add_keyword_ajax"),
    path("ajax/get-all-keywords/", views.GetAllKeywordsView.as_view(), name="get_all_keywords"), 
    path("ajax/add-award/", views.AddAwardAjaxView.as_view(), name="add_award_ajax"),
]