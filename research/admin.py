from django.contrib import admin
from .models import Author, ResearchPaper, Keyword, Award, PaperCitation

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = [
        'last_name',
        'first_name', 
        'middle_initial',
        'suffix',
        'birthdate',
        'age',
        'has_user_account',
        'G11_Batch',
        'G12_Batch'
    ]
    list_filter = ['G11_Batch', 'G12_Batch']
    search_fields = ['first_name', 'last_name', 'user__email']
    readonly_fields = ['age', 'display_name_public']
    
    fieldsets = (
        ('Name Information', {
            'fields': (
                'first_name',
                'middle_initial',
                'last_name',
                'suffix',
                'display_name_public',
            )
        }),
        ('Personal Information', {
            'fields': ('birthdate', 'age')
        }),
        ('Academic Information', {
            'fields': ('G11_Batch', 'G12_Batch')
        }),
        ('User Account', {
            'fields': ('user',),
            'description': 'Link to user account if this author has registered'
        }),
    )
    
    def has_user_account(self, obj):
        return obj.user is not None
    has_user_account.boolean = True
    has_user_account.short_description = 'Has Account'


@admin.register(ResearchPaper)
class ResearchPaperAdmin(admin.ModelAdmin):
    list_display = ['title', 'strand', 'research_design', 'grade_level', 'school_year', 'publication_date']
    list_filter = ['strand', 'grade_level', 'school_year', 'research_design']  # CHANGED
    search_fields = ['title', 'abstract', 'author__first_name', 'author__last_name']
    filter_horizontal = ['author', 'keywords', 'awards']
    date_hierarchy = 'publication_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'abstract', 'publication_date')
        }),
        ('Academic Classification', {
            'fields': ('grade_level', 'strand', 'research_design', 'school_year'),  # CHANGED
            'description': (
                'Research Design rules:\n'
                '• Grade 11 (all strands): Qualitative only\n'
                '• Grade 12 STEM: Survey, Experimental, or Capstone\n'
                '• Grade 12 HUMSS/ABM: Survey only'
            )
        }),
        ('Authors & Keywords', {
            'fields': ('author', 'keywords', 'awards')
        }),
        ('File', {
            'fields': ('pdf_file',)
        }),
    )


@admin.register(Keyword)
class KeywordAdmin(admin.ModelAdmin):
    list_display = ['word']
    search_fields = ['word']


@admin.register(Award)
class AwardAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(PaperCitation)
class PaperCitationAdmin(admin.ModelAdmin):
    list_display = ['paper', 'cited_by_paper', 'cited_by_external', 'citation_date']
    list_filter = ['citation_date']
    search_fields = ['paper__title', 'cited_by_paper__title', 'cited_by_external']
    autocomplete_fields = ['paper', 'cited_by_paper']
    date_hierarchy = 'citation_date'
    
    fieldsets = (
        ('Citation Information', {
            'fields': ('paper', 'citation_date')
        }),
        ('Cited By', {
            'fields': ('cited_by_paper', 'cited_by_external'),
            'description': 'Either select an internal paper or enter external citation source'
        }),
        ('Additional Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )