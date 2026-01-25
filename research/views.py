from django.shortcuts import redirect, get_object_or_404
from django.views import generic
from django.db.models import Q, Count, Prefetch
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.contrib import messages
from django.core.cache import cache
from .models import ResearchPaper, Author, Keyword, Award
from .forms import ResearchPaperForm
from accounts.decorators import is_teacher, is_student
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView
from django.shortcuts import redirect, render
from django.contrib import messages
from django.db.models import Value
from django.db.models.functions import Replace
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@cache_page(60 * 5)  # Cache for 5 minutes
def healthcheck(request):
    """
    Lightweight endpoint for uptime monitoring.
    Doesn't touch the database to avoid connection overhead.
    """
    return JsonResponse({
        "status": "ok",
        "message": "Server is alive"
    })

# =========================
# CACHE HELPER FUNCTIONS
# =========================

def get_cached_awards():
    """Get all awards (cached for 1 hour)"""
    cache_key = 'all_awards'
    awards = cache.get(cache_key)
    if awards is None:
        awards = list(Award.objects.only('id', 'name').order_by('name'))
        cache.set(cache_key, awards, 60 * 60)  # 1 hour
    return awards

def get_cached_school_years():
    """Get all distinct school years (cached for 1 hour)"""
    cache_key = 'all_school_years'
    school_years = cache.get(cache_key)
    if school_years is None:
        school_years = list(
            ResearchPaper.objects.values_list("school_year", flat=True)
            .distinct().order_by("school_year")
        )
        cache.set(cache_key, school_years, 60 * 60)  # 1 hour
    return school_years

def get_cached_strands():
    """Get all distinct strands (cached for 1 hour)"""
    cache_key = 'all_strands'
    strands = cache.get(cache_key)
    if strands is None:
        strands = list(
            ResearchPaper.objects.values_list("strand", flat=True).distinct()
        )
        cache.set(cache_key, strands, 60 * 60)  # 1 hour
    return strands

def get_cached_grade_levels():
    """Get all distinct grade levels (cached for 1 hour)"""
    cache_key = 'all_grade_levels'
    grade_levels = cache.get(cache_key)
    if grade_levels is None:
        grade_levels = list(
            ResearchPaper.objects.values_list("grade_level", flat=True).distinct()
        )
        cache.set(cache_key, grade_levels, 60 * 60)  # 1 hour
    return grade_levels

def get_cached_all_batches():
    """Get all author batches (cached for 1 hour)"""
    cache_key = 'all_author_batches'
    batches = cache.get(cache_key)
    if batches is None:
        batches = sorted({
            b for b in (
                list(Author.objects.values_list("G11_Batch", flat=True)) +
                list(Author.objects.values_list("G12_Batch", flat=True))
            ) if b
        })
        cache.set(cache_key, batches, 60 * 60)  # 1 hour
    return batches

def invalidate_paper_caches():
    """Invalidate all research paper related caches"""
    cache.delete('all_school_years')
    cache.delete('all_strands')
    cache.delete('all_grade_levels')

def invalidate_award_caches():
    """Invalidate award caches"""
    cache.delete('all_awards')

def invalidate_keyword_caches():
    """Invalidate keyword caches"""
    cache.delete('all_keywords')
    cache.delete('keywords_with_count')

def invalidate_author_caches():
    """Invalidate author caches"""
    cache.delete('all_author_batches')
    school_years = ResearchPaper.objects.values_list("school_year", flat=True).distinct()
    for year in school_years:
        cache.delete(f'authors_grade_11_year_{year}')
        cache.delete(f'authors_grade_12_year_{year}')

# =========================
# MIXINS
# =========================

class LoginRequiredMessageMixin(LoginRequiredMixin):
    redirect_field_name = None

    def handle_no_permission(self):
        if not self.request.user.is_authenticated:
            return render(self.request, 'research/no_access.html', status=403)
        messages.error(self.request, "You must be logged in to access this page.")
        return redirect("/accounts/no-access/")

class TeacherRequiredMixin:
    """Mixin for @is_teacher decorator compatibility"""
    @classmethod
    def as_view(cls, **initkwargs):
        view = super().as_view(**initkwargs)
        return is_teacher(view)

# =========================
# PUBLIC VIEWS
# =========================

class IndexView(generic.ListView):
    model = ResearchPaper
    template_name = "research/index.html"
    context_object_name = "latest_research_list"
    ordering = ["-publication_date"]
    paginate_by = 6
    
    def get_queryset(self):
        return ResearchPaper.objects.prefetch_related(
            Prefetch(
                'author',
                queryset=Author.objects.only('id', 'first_name', 'last_name', 'middle_initial', 'suffix')
            ),
            Prefetch(
                'keywords',
                queryset=Keyword.objects.only('id', 'word')
            )
        ).order_by('-publication_date')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['latest_research_list'] = list(context['latest_research_list'])
        return context

class DetailView(generic.DetailView):
    model = ResearchPaper
    template_name = "research/detail.html"
    
    def get_queryset(self):
        return ResearchPaper.objects.prefetch_related(
            Prefetch(
                'author',
                queryset=Author.objects.select_related('user__userprofile').only(
                    'id', 'first_name', 'last_name', 'middle_initial', 'suffix', 'user'
                )
            ),
            Prefetch(
                'keywords',
                queryset=Keyword.objects.only('id', 'word')
            ),
            Prefetch(
                'awards',
                queryset=Award.objects.only('id', 'name')
            )
        )
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        paper = self.get_object()
        
        citation_count = paper.get_citation_count()
        
        context.update({
            'citation_count': citation_count,
            'authors': list(paper.author.all()),
            'keywords': list(paper.keywords.all()),
            'awards': list(paper.awards.all()),
        })
        
        return context

class SearchView(generic.ListView):
    model = ResearchPaper
    template_name = "research/search.html"
    context_object_name = "papers"
    paginate_by = 6

    def get_queryset(self):
        qs = ResearchPaper.objects.prefetch_related(
            Prefetch(
                'author',
                queryset=Author.objects.select_related('user__userprofile').only(
                    'id', 'first_name', 'last_name', 'middle_initial', 'suffix', 'user'
                )
            ),
            Prefetch(
                'keywords',
                queryset=Keyword.objects.only('id', 'word')
            ),
            Prefetch(
                'awards',
                queryset=Award.objects.only('id', 'name')
            )
        )
        
        request = self.request

        q = request.GET.get("q")
        school_year = request.GET.get("school_year")
        strand = request.GET.get("strand")
        research_design = request.GET.get("research_design")
        grade_level = request.GET.get("grade_level")
        award = request.GET.get("award")
        author_ids = request.GET.getlist("authors")
        keyword_ids = request.GET.getlist("keywords")

        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(keywords__word__icontains=q) |
                Q(
                    author__first_name__icontains=q,
                    author__user__userprofile__consent_status='consented'
                ) |
                Q(
                    author__last_name__icontains=q,
                    author__user__userprofile__consent_status='consented'
                ) |
                Q(
                    author__middle_initial__icontains=q,
                    author__user__userprofile__consent_status='consented'
                ) |
                Q(
                    author__suffix__icontains=q,
                    author__user__userprofile__consent_status='consented'
                )
            ).distinct()

        if school_year:
            qs = qs.filter(school_year=school_year)

        if strand:
            qs = qs.filter(strand=strand)

        if research_design:
            qs = qs.filter(research_design=research_design)

        if grade_level:
            qs = qs.filter(grade_level=grade_level)

        if award:
            qs = qs.filter(awards__id=award)

        if author_ids:
            qs = qs.filter(
                author__id__in=author_ids,
                author__user__userprofile__consent_status='consented'
            ).distinct()

        if keyword_ids:
            qs = qs.filter(keywords__id__in=keyword_ids).distinct()

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # ✅ USE CACHED DATA
        context.update({
            "query": self.request.GET.get("q", ""),
            "school_year": self.request.GET.get("school_year", ""),
            "strand": self.request.GET.get("strand", ""),
            "research_design": self.request.GET.get("research_design", ""),
            "grade_level": self.request.GET.get("grade_level", ""),
            "selected_award": self.request.GET.get("award", ""),
            "awards": get_cached_awards(),
            "authors": [],  # Load via AJAX only - more efficient
            "school_years": get_cached_school_years(),
            "research_designs": ResearchPaper.RESEARCH_DESIGN_CHOICES,
        })
        
        context['papers'] = list(context['papers'])

        return context
    
class StrandFilteredView(generic.ListView):
    model = ResearchPaper
    template_name = "research/index.html"
    context_object_name = "latest_research_list"
    paginate_by = 6

    def get_queryset(self):
        return ResearchPaper.objects.filter(
            strand=self.kwargs["strand"]
        ).prefetch_related(
            'author',
            'keywords'
        ).order_by("-publication_date")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["selected_strand"] = self.kwargs["strand"]
        return ctx
    
class StrandDesignFilteredView(generic.ListView):
    """Filter papers by both strand AND research design"""
    model = ResearchPaper
    template_name = "research/index.html"
    context_object_name = "latest_research_list"
    paginate_by = 6

    def get_queryset(self):
        return ResearchPaper.objects.filter(
            strand=self.kwargs["strand"],
            research_design=self.kwargs["design"]
        ).prefetch_related(
            'author',
            'keywords'
        ).order_by("-publication_date")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["selected_strand"] = self.kwargs["strand"]
        ctx["selected_design"] = self.kwargs["design"]
        design_dict = dict(ResearchPaper.RESEARCH_DESIGN_CHOICES)
        ctx["selected_design_display"] = design_dict.get(self.kwargs["design"], self.kwargs["design"])
        return ctx

# =========================
# ADMIN / TEACHER VIEWS
# =========================

class AdminDashboardView(TeacherRequiredMixin, generic.ListView):
    model = ResearchPaper
    template_name = "research/admin_dashboard.html"
    context_object_name = "papers"
    paginate_by = 10

    def get_queryset(self):
        qs = ResearchPaper.objects.prefetch_related(
            'author',
            'keywords',
            'awards'
        )
        
        request = self.request

        q = request.GET.get("q")
        strand = request.GET.get("strand")
        grade_level = request.GET.get("grade_level")
        school_year = request.GET.get("school_year")
        selected_authors = request.GET.getlist("authors")
        research_design = request.GET.get("research_design")
        award = request.GET.get("award")
        keyword_ids = request.GET.getlist("keywords")

        sort_by = request.GET.get("sort_by", "latest")

        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(author__first_name__icontains=q) |
                Q(author__last_name__icontains=q) |
                Q(author__middle_initial__icontains=q) |
                Q(author__suffix__icontains=q) |
                Q(keywords__word__icontains=q)
            ).distinct()

        if strand:
            qs = qs.filter(strand=strand)

        if grade_level:
            qs = qs.filter(grade_level=grade_level)

        if school_year:
            qs = qs.filter(school_year=school_year)

        if selected_authors:
            qs = qs.filter(author__id__in=selected_authors).distinct()

        if research_design:
            qs = qs.filter(research_design=research_design)

        if award:
            qs = qs.filter(awards__id=award)

        if keyword_ids:
            qs = qs.filter(keywords__id__in=keyword_ids).distinct()

        # SORTING 
        if sort_by == "alphabetical":
            qs = qs.annotate(
                clean_title=Replace('title', Value('*'), Value(''))
            ).order_by("clean_title")
        elif sort_by == "reverse_alphabetical":
            qs = qs.annotate(
                clean_title=Replace('title', Value('*'), Value(''))
            ).order_by("-clean_title")
        elif sort_by == "oldest":
            qs = qs.order_by("publication_date")
        else:  # "latest" or anything else
            qs = qs.order_by("-publication_date")

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        request = self.request

        grade_level = request.GET.get("grade_level")
        school_year = request.GET.get("school_year")

        # Only load authors when needed
        authors = Author.objects.none()
        if grade_level and school_year:
            if grade_level == "11":
                authors = Author.objects.filter(G11_Batch=school_year).only('id', 'first_name', 'last_name')
            elif grade_level == "12":
                authors = Author.objects.filter(G12_Batch=school_year).only('id', 'first_name', 'last_name')

        # ✅ USE CACHED DATA
        context.update({
            "selected_authors": request.GET.getlist("authors"),
            "selected_strand": request.GET.get("strand", ""),
            "selected_grade_level": grade_level or "",
            "selected_school_year": school_year or "",
            "selected_research_design": request.GET.get("research_design", ""),
            "selected_award": request.GET.get("award", ""),
            "awards": get_cached_awards(),
            "authors": authors.order_by("last_name", "first_name"),
            "strands": get_cached_strands(),
            "grade_levels": get_cached_grade_levels(),
            "school_years": get_cached_school_years(),
            "research_designs": ResearchPaper.RESEARCH_DESIGN_CHOICES,
        })

        # Filter tokens
        filters = []

        if context["selected_strand"]:
            filters.append(("strand", "Strand", context["selected_strand"]))

        if context["selected_grade_level"]:
            filters.append(("grade_level", "Grade", context["selected_grade_level"]))

        if context["selected_school_year"]:
            filters.append(("school_year", "SY", context["selected_school_year"]))

        if context["selected_research_design"]:
            design_label = dict(ResearchPaper.RESEARCH_DESIGN_CHOICES).get(
                context["selected_research_design"],
                context["selected_research_design"]
            )
            filters.append(("research_design", "Design", design_label))

        if context["selected_authors"]:
            for author in Author.objects.filter(id__in=context["selected_authors"]).only('id', 'first_name', 'last_name'):
                filters.append(("authors", "Author", str(author)))

        context["filters"] = filters

        return context

class ResearchPaperCreateView(TeacherRequiredMixin, generic.CreateView):
    model = ResearchPaper
    form_class = ResearchPaperForm
    template_name = "research/paper_form.html"
    success_url = reverse_lazy("research:admin_dashboard")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.fields['awards'].queryset = Award.objects.only('id', 'name').order_by('name')
        return form

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["page_mode"] = "upload"
        ctx["school_years"] = get_cached_school_years()
        return ctx

    def form_valid(self, form):
        messages.success(self.request, f"'{form.instance.title}' uploaded successfully.")
        # ✅ Invalidate cache when new paper is created
        invalidate_paper_caches()
        return super().form_valid(form)

class ResearchPaperUpdateView(TeacherRequiredMixin, generic.UpdateView):
    model = ResearchPaper
    form_class = ResearchPaperForm
    template_name = "research/paper_form.html"
    success_url = reverse_lazy("research:admin_dashboard")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.fields['awards'].queryset = Award.objects.only('id', 'name').order_by('name')
        return form

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["page_mode"] = "edit"
        ctx["school_years"] = get_cached_school_years()
        return ctx

    def form_valid(self, form):
        messages.success(self.request, f"'{form.instance.title}' updated successfully.")
        # ✅ Invalidate cache when paper is updated
        invalidate_paper_caches()
        return super().form_valid(form)

class ResearchPaperDeleteView(TeacherRequiredMixin, generic.DeleteView):
    model = ResearchPaper
    success_url = reverse_lazy("research:admin_dashboard")

    def delete(self, request, *args, **kwargs):
        paper = self.get_object()
        messages.success(request, f"'{paper.title}' deleted successfully.")
        # ✅ Invalidate cache when paper is deleted
        invalidate_paper_caches()
        return super().delete(request, *args, **kwargs)


class KeywordManageView(TeacherRequiredMixin, generic.ListView):
    template_name = "research/keyword_form.html"
    context_object_name = "keywords"
    paginate_by = 10
    
    def get_queryset(self):
        from django.db import models
        
        qs = Keyword.objects.annotate(
            usage_count=models.Count('researchpaper')
        )
        
        q = self.request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(word__icontains=q)
        
        sort_by = self.request.GET.get("sort_by", "alphabetical")
        
        if sort_by == "alphabetical":
            qs = qs.annotate(
                clean_word=Replace('word', Value('*'), Value(''))
            ).order_by("clean_word")
        elif sort_by == "reverse_alphabetical":
            qs = qs.annotate(
                clean_word=Replace('word', Value('*'), Value(''))
            ).order_by("-clean_word")
        elif sort_by == "most_used":
            qs = qs.order_by("-usage_count")
        elif sort_by == "least_used":
            qs = qs.order_by("usage_count")
        else:
            qs = qs.order_by("word")
        
        return qs
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        keyword_data = []
        for keyword in context['keywords']:
            keyword_data.append({
                'id': keyword.id,
                'word': keyword.word,
                'usage_count': keyword.usage_count,
                'papers': []
            })
        
        context["keywords"] = keyword_data
        return context

    def post(self, request, *args, **kwargs):
        action = request.POST.get("action", "").strip()
        
        # ADD KEYWORD
        if action == "add" or "add_keyword" in request.POST:
            keyword_name = request.POST.get("keyword_name", "").strip()
            
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            
            if not keyword_name:
                if is_ajax:
                    return JsonResponse({"success": False, "error": "Keyword name is required."}, status=400)
                messages.error(request, "Keyword name is required.")
                return redirect("research:manage_keywords")
            
            if len(keyword_name) < 2:
                if is_ajax:
                    return JsonResponse({"success": False, "error": "Keyword must be at least 2 characters long."}, status=400)
                messages.error(request, "Keyword must be at least 2 characters long.")
                return redirect("research:manage_keywords")
            
            if Keyword.objects.filter(word__iexact=keyword_name).exists():
                if is_ajax:
                    return JsonResponse({"success": False, "error": f"The keyword '{keyword_name}' already exists."}, status=400)
                messages.error(request, f"The keyword '{keyword_name}' already exists.")
                return redirect("research:manage_keywords")
            
            Keyword.objects.create(word=keyword_name)
            
            # ✅ Invalidate keyword cache
            invalidate_keyword_caches()
            
            if is_ajax:
                return JsonResponse({"success": True, "message": f"Keyword '{keyword_name}' added successfully."})
            
            messages.success(request, f"Keyword '{keyword_name}' added successfully.")
            return redirect("research:manage_keywords")
        
        # EDIT KEYWORD
        elif action == "edit" or "edit_keyword" in request.POST:
            keyword_id = request.POST.get("keyword_id")
            keyword_name = request.POST.get("keyword_name", "").strip()
            
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            
            if not keyword_name:
                if is_ajax:
                    return JsonResponse({"success": False, "error": "Keyword name is required."}, status=400)
                messages.error(request, "Keyword name is required.")
                return redirect("research:manage_keywords")
            
            if len(keyword_name) < 2:
                if is_ajax:
                    return JsonResponse({"success": False, "error": "Keyword must be at least 2 characters long."}, status=400)
                messages.error(request, "Keyword must be at least 2 characters long.")
                return redirect("research:manage_keywords")
            
            try:
                keyword = Keyword.objects.get(id=keyword_id)
                
                if Keyword.objects.filter(word__iexact=keyword_name).exclude(id=keyword_id).exists():
                    if is_ajax:
                        return JsonResponse({"success": False, "error": f"The keyword '{keyword_name}' already exists."}, status=400)
                    messages.error(request, f"The keyword '{keyword_name}' already exists.")
                    return redirect("research:manage_keywords")
                
                old_name = keyword.word
                keyword.word = keyword_name
                keyword.save()
                
                # ✅ Invalidate keyword cache
                invalidate_keyword_caches()
                
                if is_ajax:
                    return JsonResponse({"success": True, "message": f"Keyword updated from '{old_name}' to '{keyword_name}'."})
                
                messages.success(request, f"Keyword updated from '{old_name}' to '{keyword_name}'.")
            except Keyword.DoesNotExist:
                if is_ajax:
                    return JsonResponse({"success": False, "error": "Keyword not found."}, status=404)
                messages.error(request, "Keyword not found.")
            
            return redirect("research:manage_keywords")
        
        return redirect("research:manage_keywords")


    def get(self, request, *args, **kwargs):
        delete_id = request.GET.get("delete")
        if delete_id:
            try:
                keyword = Keyword.objects.get(id=delete_id)
                usage_count = keyword.researchpaper_set.count()
                keyword_name = keyword.word
                keyword.delete()
                
                # ✅ Invalidate keyword cache
                invalidate_keyword_caches()
                
                if usage_count > 0:
                    messages.warning(
                        request, 
                        f"Keyword '{keyword_name}' deleted successfully. It was removed from {usage_count} paper(s)."
                    )
                else:
                    messages.success(request, f"Keyword '{keyword_name}' deleted successfully.")
            except Keyword.DoesNotExist:
                messages.error(request, "Keyword not found.")
            
            return redirect("research:manage_keywords")

        return super().get(request, *args, **kwargs)

# =========================
# STUDENT VIEWS
# =========================

class MyResearchView(LoginRequiredMessageMixin, generic.ListView):
    template_name = "research/my_papers.html"
    context_object_name = "papers"

    def get_queryset(self):
        profile = self.request.user.userprofile
        return ResearchPaper.objects.filter(
            author=profile.author_profile
        ).prefetch_related('keywords', 'awards')

class ManageAuthorsView(TeacherRequiredMixin, ListView):
    model = Author
    template_name = "research/author_form.html"
    context_object_name = "authors"
    ordering = ["last_name", "first_name"]
    paginate_by = 10

    def get_queryset(self):
        qs = Author.objects.select_related('user__userprofile')
        
        q = self.request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) |
                Q(middle_initial__icontains=q) |
                Q(last_name__icontains=q) |
                Q(suffix__icontains=q)
            )
        
        grade_level = self.request.GET.get("grade_level", "")
        school_year = self.request.GET.get("school_year", "")
        
        if grade_level and school_year:
            if grade_level == "11":
                qs = qs.filter(G11_Batch=school_year)
            elif grade_level == "12":
                qs = qs.filter(G12_Batch=school_year)
        elif grade_level:
            if grade_level == "11":
                qs = qs.filter(G11_Batch__isnull=False).exclude(G11_Batch="")
            elif grade_level == "12":
                qs = qs.filter(G12_Batch__isnull=False).exclude(G12_Batch="")
        elif school_year:
            qs = qs.filter(
                Q(G11_Batch=school_year) | Q(G12_Batch=school_year)
            )
        
        has_account = self.request.GET.get("has_account", "")
        if has_account == "yes":
            qs = qs.filter(user__isnull=False)
        elif has_account == "no":
            qs = qs.filter(user__isnull=True)
        
        has_consented = self.request.GET.get("has_consented", "")
        if has_consented == "yes":
            qs = qs.filter(user__isnull=False, user__userprofile__consent_status='consented')
        elif has_consented == "pending":
            qs = qs.filter(user__isnull=False, user__userprofile__consent_status='pending_approval')
        elif has_consented == "no":
            qs = qs.filter(
                Q(user__isnull=True) | 
                Q(user__userprofile__consent_status='not_consented')
            )
        
        sort_by = self.request.GET.get("sort_by", "alphabetical")

        if sort_by == "alphabetical":
            qs = qs.order_by("last_name", "first_name")
        elif sort_by == "reverse_alphabetical":
            qs = qs.order_by("-last_name", "-first_name")
        elif sort_by == "latest":
            qs = qs.order_by("-id")
        elif sort_by == "oldest":
            qs = qs.order_by("id")

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # ✅ USE CACHED DATA
        context["all_batches"] = get_cached_all_batches()
        context["selected_grade_level"] = self.request.GET.get("grade_level", "")
        context["selected_school_year"] = self.request.GET.get("school_year", "")
        context["selected_sort"] = self.request.GET.get("sort_by", "alphabetical")

        return context

    def post(self, request, *args, **kwargs):
        action = request.POST.get("action")
        
        # ADD AUTHOR
        if "add_author" in request.POST or action == "add":
            first_name = request.POST.get("first_name", "").strip()
            middle_initial = request.POST.get("middle_initial", "").strip()
            last_name = request.POST.get("last_name", "").strip()
            suffix = request.POST.get("suffix", "").strip()
            g11_batch = request.POST.get("G11_Batch", "").strip()
            g12_batch = request.POST.get("G12_Batch", "").strip()
            
            errors = []
            
            if not first_name:
                errors.append("First Name is required.")
            
            if not last_name:
                errors.append("Last Name is required.")
            
            if not g11_batch and not g12_batch:
                errors.append("At least one batch (Grade 11 or Grade 12) is required.")
            
            import re
            batch_pattern = r'^\d{4}-\d{4}$'
            if g11_batch and not re.match(batch_pattern, g11_batch):
                errors.append("Grade 11 Batch must be in format YYYY-YYYY")
            if g12_batch and not re.match(batch_pattern, g12_batch):
                errors.append("Grade 12 Batch must be in format YYYY-YYYY")
            
            if first_name and last_name:
                existing = Author.objects.filter(
                    first_name__iexact=first_name,
                    last_name__iexact=last_name,
                    middle_initial__iexact=middle_initial if middle_initial else "",
                    suffix__iexact=suffix if suffix else ""
                )
                if existing.exists():
                    errors.append(f"An author with the name '{first_name} {middle_initial} {last_name} {suffix}' already exists.")
            
            if errors:
                for error in errors:
                    messages.error(request, error)
            else:
                Author.objects.create(
                    first_name=first_name,
                    middle_initial=middle_initial if middle_initial else None,
                    last_name=last_name,
                    suffix=suffix if suffix else None,
                    G11_Batch=g11_batch if g11_batch else None,
                    G12_Batch=g12_batch if g12_batch else None,
                )
                
                # ✅ Invalidate author cache
                invalidate_author_caches()
                
                messages.success(request, f"Author '{first_name} {last_name}' added successfully.")
            
            return redirect("research:manage_authors")
        
        # EDIT AUTHOR
        elif "edit_author" in request.POST or action == "edit":
            author_id = request.POST.get("author_id")
            first_name = request.POST.get("first_name", "").strip()
            middle_initial = request.POST.get("middle_initial", "").strip()
            last_name = request.POST.get("last_name", "").strip()
            suffix = request.POST.get("suffix", "").strip()
            g11_batch = request.POST.get("G11_Batch", "").strip()
            g12_batch = request.POST.get("G12_Batch", "").strip()
            
            errors = []
            
            if not first_name:
                errors.append("First Name is required.")
            
            if not last_name:
                errors.append("Last Name is required.")
            
            if not g11_batch and not g12_batch:
                errors.append("At least one batch (Grade 11 or Grade 12) is required.")
            
            import re
            batch_pattern = r'^\d{4}-\d{4}$'
            if g11_batch and not re.match(batch_pattern, g11_batch):
                errors.append("Grade 11 Batch must be in format YYYY-YYYY")
            if g12_batch and not re.match(batch_pattern, g12_batch):
                errors.append("Grade 12 Batch must be in format YYYY-YYYY")
            
            if errors:
                for error in errors:
                    messages.error(request, error)
            else:
                try:
                    author = Author.objects.get(id=author_id)
                    author.first_name = first_name
                    author.middle_initial = middle_initial if middle_initial else None
                    author.last_name = last_name
                    author.suffix = suffix if suffix else None
                    author.G11_Batch = g11_batch if g11_batch else None
                    author.G12_Batch = g12_batch if g12_batch else None
                    author.save()
                    
                    # ✅ Invalidate author cache
                    invalidate_author_caches()
                    
                    messages.success(request, f"Author '{first_name} {last_name}' updated successfully.")
                except Author.DoesNotExist:
                    messages.error(request, "Author not found.")
            
            return redirect("research:manage_authors")

        return redirect("research:manage_authors")

    def get(self, request, *args, **kwargs):
        delete_id = request.GET.get("delete")
        if delete_id:
            Author.objects.filter(id=delete_id).delete()
            
            # ✅ Invalidate author cache
            invalidate_author_caches()
            
            messages.success(request, "Author deleted successfully.")
            return redirect("research:manage_authors")

        return super().get(request, *args, **kwargs)

# =========================
# AJAX ENDPOINTS
# =========================
class GetAuthorsByBatchView(View):
    def get(self, request, *args, **kwargs):
        grade = request.GET.get("grade")
        school_year = request.GET.get("school_year")

        if not grade or not school_year:
            return JsonResponse([], safe=False)

        # ✅ CACHE AUTHORS BY GRADE/YEAR
        cache_key = f'authors_grade_{grade}_year_{school_year}'
        data = cache.get(cache_key)
        
        if data is None:
            if grade == "11":
                authors = Author.objects.filter(G11_Batch=school_year).only(
                    'id', 'first_name', 'last_name', 'middle_initial', 'suffix'
                )
            elif grade == "12":
                authors = Author.objects.filter(G12_Batch=school_year).only(
                    'id', 'first_name', 'last_name', 'middle_initial', 'suffix'
                )
            else:
                return JsonResponse([], safe=False)

            authors = authors.order_by("last_name", "first_name")
            
            data = []
            for author in authors:
                data.append({
                    "id": author.id,
                    "name": author.display_name_public()
                })
            
            # Cache for 1 hour
            cache.set(cache_key, data, 60 * 60)

        return JsonResponse(data, safe=False)

class GetAllKeywordsView(View):
    """Return all keywords for the keyword dropdown"""
    def get(self, request, *args, **kwargs):
        # ✅ CACHE ALL KEYWORDS
        cache_key = 'all_keywords'
        data = cache.get(cache_key)
        
        if data is None:
            keywords = Keyword.objects.only('id', 'word').order_by("word")
            data = []
            for keyword in keywords:
                data.append({
                    "id": keyword.id,
                    "name": keyword.word
                })
            
            # Cache for 1 hour
            cache.set(cache_key, data, 60 * 60)
        
        return JsonResponse(data, safe=False)
    
class AddKeywordAjaxView(View):
    def post(self, request, *args, **kwargs):
        try:
            keyword_text = request.POST.get("name", "").strip()
            kw, created = Keyword.objects.get_or_create(word=keyword_text)
            
            # ✅ Invalidate keyword cache when adding
            if created:
                invalidate_keyword_caches()
            
            return JsonResponse({"id": kw.id, "name": kw.word})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

def get_authors_by_batch(request):
    grade = request.GET.get("grade")
    sy = request.GET.get("school_year")

    authors = Author.objects.none()
    if grade and sy:
        if grade.endswith("11"):
            authors = Author.objects.filter(G11_Batch=sy).only('id', 'first_name', 'last_name')
        elif grade.endswith("12"):
            authors = Author.objects.filter(G12_Batch=sy).only('id', 'first_name', 'last_name')

    return JsonResponse(
        [{"id": a.id, "name": str(a)} for a in authors],
        safe=False
    )


def fetch_authors_ajax(request):
    grade = request.GET.get("grade")
    year = request.GET.get("year")

    if grade == "11":
        qs = Author.objects.filter(G11_Batch=year).only('id', 'first_name', 'last_name')
    elif grade == "12":
        qs = Author.objects.filter(G12_Batch=year).only('id', 'first_name', 'last_name')
    else:
        qs = Author.objects.none()

    return JsonResponse({
        "authors": [{"id": a.id, "name": str(a)} for a in qs]
    })

class AddAuthorAjaxView(View):
    def post(self, request, *args, **kwargs):
        try:
            first_name = request.POST.get("first", "").strip()
            middle_initial = request.POST.get("middle", "").strip()
            last_name = request.POST.get("last", "").strip()
            suffix = request.POST.get("suffix", "").strip()
            g11_batch = request.POST.get("G11", "").strip()
            g12_batch = request.POST.get("G12", "").strip()
            
            if not first_name or not last_name:
                return JsonResponse({"error": "First name and last name are required."}, status=400)
            
            if not g11_batch and not g12_batch:
                return JsonResponse({"error": "At least one batch (Grade 11 or Grade 12) is required."}, status=400)
            
            a = Author.objects.create(
                first_name=first_name,
                middle_initial=middle_initial if middle_initial else None,
                last_name=last_name,
                suffix=suffix if suffix else None,
                G11_Batch=g11_batch if g11_batch else None,
                G12_Batch=g12_batch if g12_batch else None,
            )
            
            # ✅ Invalidate author cache
            invalidate_author_caches()
            
            return JsonResponse({"id": a.id, "name": str(a)})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
        
class AddAwardAjaxView(View):
    def post(self, request, *args, **kwargs):
        try:
            award_name = request.POST.get("name", "").strip()
            award, created = Award.objects.get_or_create(name=award_name)
            
            # ✅ Invalidate award cache when adding
            if created:
                invalidate_award_caches()
            
            return JsonResponse({"id": award.id, "name": award.name})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)