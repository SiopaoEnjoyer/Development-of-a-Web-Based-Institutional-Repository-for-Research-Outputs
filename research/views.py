from django.shortcuts import redirect, get_object_or_404
from django.views import generic
from django.db.models import Q, Prefetch
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.contrib import messages
from django.core.cache import cache
from .models import ResearchPaper, Author, Keyword, Award
from .forms import ResearchPaperForm
from accounts.decorators import is_research_teacher_only
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView
from django.shortcuts import redirect, render
from django.contrib import messages
from django.db.models import Value
from django.db.models.functions import Replace
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.http import HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import cache_page
from storage import SupabaseStorage
import mimetypes
from datetime import datetime
from django.core.cache import cache
from django.db import connection, models
from django_ratelimit.decorators import ratelimit, Ratelimited
from django.views.decorators.vary import vary_on_cookie

@method_decorator(vary_on_cookie, name='dispatch')
@method_decorator(cache_page(60 * 60 * 24), name='dispatch')
class StaticPageView(generic.TemplateView):
    pass

class HomeView(StaticPageView):
    template_name = "research/home.html"

class AboutView(StaticPageView):
    template_name = "research/about.html"

class TermsView(StaticPageView):
    template_name = "research/terms.html"

class PrivacyPolicyView(StaticPageView):
    template_name = "research/privacy_policy.html"

@login_required
def serve_pdf(request, path):
    """Serve PDF files from Supabase storage with authentication"""
    try:
        storage = SupabaseStorage()
        
        if path.startswith('research_papers/'):
            file_content = storage.get_file_content(path)
            
        elif path.startswith('parental_consents/'):
            path_parts = path.split('/')
            if len(path_parts) >= 2:
                file_user_id = path_parts[1]
                if str(request.user.id) != file_user_id and not request.user.is_staff:
                    raise Http404("You don't have permission to view this file")
            
            file_content = storage.get_file_content(path)
        else:
            raise Http404("File not found")
        
        content_type, _ = mimetypes.guess_type(path)
        if not content_type:
            content_type = 'application/pdf'
        
        response = HttpResponse(file_content, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{path.split("/")[-1]}"'
        return response
        
    except Exception as e:
        raise Http404(f"File not found: {str(e)}")

def get_cached_awards():
    """Get all awards (cached for 1 hour)"""
    cache_key = 'all_awards'
    awards = cache.get(cache_key)
    if awards is None:
        awards = list(Award.objects.only('id', 'name').order_by('name'))
        cache.set(cache_key, awards, 60 * 60)
    return awards

def get_cached_school_years():
    """Get all distinct school years (cached for 1 hour) - OPTIMIZED"""
    cache_key = 'all_school_years'
    school_years = cache.get(cache_key)
    if school_years is None:
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT DISTINCT school_year FROM research_researchpaper "
                    "WHERE school_year IS NOT NULL ORDER BY school_year"
                )
                school_years = [row[0] for row in cursor.fetchall()]
        else:
            school_years = list(
                ResearchPaper.objects.values_list("school_year", flat=True)
                .distinct().order_by("school_year")
            )
        cache.set(cache_key, school_years, 60 * 60) 
    return school_years


def get_cached_strands():
    """Get all distinct strands (cached for 1 hour) - OPTIMIZED"""
    cache_key = 'all_strands'
    strands = cache.get(cache_key)
    if strands is None:
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT DISTINCT strand FROM research_researchpaper "
                    "WHERE strand IS NOT NULL ORDER BY strand"
                )
                strands = [row[0] for row in cursor.fetchall()]
        else:
            strands = list(
                ResearchPaper.objects.values_list("strand", flat=True).distinct()
            )
        cache.set(cache_key, strands, 60 * 60) 
    return strands


def get_cached_grade_levels():
    """Get all distinct grade levels (cached for 1 hour) - OPTIMIZED"""
    cache_key = 'all_grade_levels'
    grade_levels = cache.get(cache_key)
    if grade_levels is None:
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT DISTINCT grade_level FROM research_researchpaper "
                    "WHERE grade_level IS NOT NULL ORDER BY grade_level"
                )
                grade_levels = [row[0] for row in cursor.fetchall()]
        else:
            grade_levels = list(
                ResearchPaper.objects.values_list("grade_level", flat=True).distinct()
            )
        cache.set(cache_key, grade_levels, 60 * 60) 
    return grade_levels

def get_cached_all_batches():
    """Get all author batches (cached for 1 hour) - OPTIMIZED"""
    cache_key = 'all_author_batches'
    batches = cache.get(cache_key)
    if batches is None:
        batch_pairs = Author.objects.filter(
            Q(G11_Batch__isnull=False) | Q(G12_Batch__isnull=False)
        ).values_list('G11_Batch', 'G12_Batch')
        
        all_batches = set()
        for g11, g12 in batch_pairs:
            if g11:
                all_batches.add(g11)
            if g12:
                all_batches.add(g12)
        
        batches = sorted(all_batches)
        cache.set(cache_key, batches, 60 * 60)  
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
    """Invalidate author caches - but be selective"""
    cache.delete('all_author_batches')
    
    current_year = datetime.now().year
    
    for year_offset in range(-2, 3):  
        year1 = current_year + year_offset
        year2 = year1 + 1
        sy = f"{year1}-{year2}"
        cache.delete(f'authors_grade_11_year_{sy}')
        cache.delete(f'authors_grade_12_year_{sy}')

@csrf_exempt
def healthcheck(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    
    allowed = ['uptimerobot', 'pingdom', 'statuspage']
    if not any(service in user_agent for service in allowed):
        return HttpResponse("Forbidden", status=403)
    
    return HttpResponse("OK", content_type="text/plain")

# Rate → seconds map (match whatever rates you use in your decorators)
RATE_SECONDS = {
    'h': 3600,
    'm': 60,
    's': 1,
    'd': 86400,
}

def ratelimit_blocked(request, exception=None):
    wait_seconds = 3600  # default: 1 hour

    if isinstance(exception, Ratelimited):
        rate = getattr(exception, 'rate', None)  # e.g. "1/h", "60/m"
        if rate:
            try:
                _, period = rate.split('/')
                period = period.strip()
                unit = period[-1]          # h, m, s, d
                count = int(period[:-1]) if len(period) > 1 else 1
                wait_seconds = RATE_SECONDS.get(unit, 3600) * count
            except Exception:
                pass

    return render(request, 'research/429.html', {'wait_seconds': wait_seconds}, status=429)

class LoginRequiredMessageMixin(LoginRequiredMixin):
    redirect_field_name = None

    def handle_no_permission(self):
        if not self.request.user.is_authenticated:
            return render(self.request, 'research/no_access.html', status=403)
        messages.error(self.request, "You must be logged in to access this page.")
        return redirect("/accounts/no-access/")

class TeacherRequiredMixin:
    """Mixin for research teachers only (and admins)"""
    @classmethod
    def as_view(cls, **initkwargs):
        view = super().as_view(**initkwargs)
        return is_research_teacher_only(view)

@method_decorator(ratelimit(key='ip', rate='100/h', method='GET'), name='dispatch')
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
        ).defer('pdf_file').order_by('-publication_date')  
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

@method_decorator(ratelimit(key='ip', rate='60/h', method='GET'), name='dispatch')
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

@method_decorator(ratelimit(key='ip', rate='100/h', method='GET'), name='dispatch')
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
        ).defer("pdf_file")

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
                Q(author__last_name__icontains=q) |
                Q(
                    author__first_name__icontains=q,
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
            qs = qs.filter(author__id__in=author_ids).distinct()
        if keyword_ids:
            qs = qs.filter(keywords__id__in=keyword_ids).distinct()

        return qs

    # ── Ajax quick-search for the navbar search bar ──────────────────────
    def get(self, request, *args, **kwargs):
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            queryset = self.get_queryset()
            total = queryset.count()

            results = []
            for paper in queryset[:8]:          # cap at 8 quick results
                authors = [
                    a.display_name_public()
                    for a in paper.get_authors_alphabetically()
                ]
                results.append({
                    'id':       paper.id,
                    'title':    paper.title,
                    'strand':   paper.strand or '',
                    'design':   paper.get_research_design_display() if paper.research_design else '',
                    'authors':  authors,
                    'keywords': [kw.word for kw in paper.keywords.all()[:6]],
                })

            return JsonResponse({'results': results, 'total': total})

        # Normal HTML render
        return super().get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            "query":           self.request.GET.get("q", ""),
            "school_year":     self.request.GET.get("school_year", ""),
            "strand":          self.request.GET.get("strand", ""),
            "research_design": self.request.GET.get("research_design", ""),
            "grade_level":     self.request.GET.get("grade_level", ""),
            "selected_award":  self.request.GET.get("award", ""),
            "awards":          get_cached_awards(),
            "authors":         [],
            "school_years":    get_cached_school_years(),
            "research_designs": ResearchPaper.RESEARCH_DESIGN_CHOICES,
        })
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
        ).defer('pdf_file')
        
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
        else:  
            qs = qs.order_by("-publication_date")

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        request = self.request

        grade_level = request.GET.get("grade_level")
        school_year = request.GET.get("school_year")

        authors = Author.objects.none()
        if grade_level and school_year:
            if grade_level == "11":
                authors = Author.objects.filter(G11_Batch=school_year).only('id', 'first_name', 'last_name')
            elif grade_level == "12":
                authors = Author.objects.filter(G12_Batch=school_year).only('id', 'first_name', 'last_name')

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
        invalidate_paper_caches()
        return super().form_valid(form)
    
    def form_invalid(self, form):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"=== PAPER UPLOAD FAILED ===")
        logger.error(f"Form errors: {form.errors}")
        logger.error(f"Form data: {form.data}")
        logger.error(f"Selected authors: {form.data.getlist('author')}")
        
        # Show error to user
        messages.error(self.request, f"Upload failed. Check the form for errors.")
        return super().form_invalid(form)

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
        invalidate_paper_caches()
        return super().form_valid(form)

class ResearchPaperDeleteView(TeacherRequiredMixin, generic.DeleteView):
    model = ResearchPaper
    success_url = reverse_lazy("research:admin_dashboard")

    def delete(self, request, *args, **kwargs):
        paper = self.get_object()
        messages.success(request, f"'{paper.title}' deleted successfully.")
        invalidate_paper_caches()
        return super().delete(request, *args, **kwargs)

    def get(self, request, pk):
        messages.warning(request, "Use the delete button to confirm deletion.")
        return redirect('research:admin_dashboard')

class KeywordManageView(TeacherRequiredMixin, generic.ListView):
    template_name = "research/keyword_form.html"
    context_object_name = "keywords"
    paginate_by = 10

    def get_queryset(self):
        qs = Keyword.objects.annotate(
            usage_count=models.Count('researchpaper', distinct=True)
        ).prefetch_related(
            Prefetch(
                'researchpaper_set',
                queryset=ResearchPaper.objects.only('id', 'title')
            )
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
        return super().get_context_data(**kwargs)

    def post(self, request, *args, **kwargs):
        action = request.POST.get("action", "").strip()

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
            invalidate_keyword_caches()

            if is_ajax:
                return JsonResponse({"success": True, "message": f"Keyword '{keyword_name}' added successfully."})

            messages.success(request, f"Keyword '{keyword_name}' added successfully.")
            return redirect("research:manage_keywords")

        elif action == "edit" or "edit_keyword" in request.POST:
            keyword_id   = request.POST.get("keyword_id")
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
                invalidate_keyword_caches()

                if usage_count > 0:
                    messages.warning(
                        request,
                        f"Keyword '{keyword_name}' deleted. It was removed from {usage_count} paper(s)."
                    )
                else:
                    messages.success(request, f"Keyword '{keyword_name}' deleted successfully.")
            except Keyword.DoesNotExist:
                messages.error(request, "Keyword not found.")

            return redirect("research:manage_keywords")

        return super().get(request, *args, **kwargs)

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

        context["all_batches"] = get_cached_all_batches()
        context["selected_grade_level"] = self.request.GET.get("grade_level", "")
        context["selected_school_year"] = self.request.GET.get("school_year", "")
        context["selected_sort"] = self.request.GET.get("sort_by", "alphabetical")

        return context

    def post(self, request, *args, **kwargs):
        action = request.POST.get("action")
        
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
                
                invalidate_author_caches()
                
                messages.success(request, f"Author '{first_name} {last_name}' added successfully.")
            
            return redirect("research:manage_authors")
        
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
            
            invalidate_author_caches()
            
            messages.success(request, "Author deleted successfully.")
            return redirect("research:manage_authors")

        return super().get(request, *args, **kwargs)

@method_decorator(csrf_protect, name='dispatch')
class GetAuthorsByBatchView(View):
    def get(self, request, *args, **kwargs):
        grade = request.GET.get("grade")
        school_year = request.GET.get("school_year")

        if not grade or not school_year:
            return JsonResponse([], safe=False)

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
            
            cache.set(cache_key, data, 60 * 60)

        return JsonResponse(data, safe=False)

@method_decorator(csrf_protect, name='dispatch')
class GetAllKeywordsView(View):
    """Return all keywords for the keyword dropdown"""
    def get(self, request, *args, **kwargs):
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
            
            cache.set(cache_key, data, 60 * 60)
        
        return JsonResponse(data, safe=False)

@method_decorator(csrf_protect, name='dispatch')
class AddKeywordAjaxView(View):
    def post(self, request, *args, **kwargs):
        try:
            keyword_text = request.POST.get("name", "").strip()
            kw, created = Keyword.objects.get_or_create(word=keyword_text)
            
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

@method_decorator(csrf_protect, name='dispatch')
class AddAuthorAjaxView(LoginRequiredMixin, TeacherRequiredMixin, View):
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
            
            invalidate_author_caches()
            
            return JsonResponse({"id": a.id, "name": str(a)})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@method_decorator(csrf_protect, name='dispatch')
class AddAwardAjaxView(View):
    def post(self, request, *args, **kwargs):
        try:
            award_name = request.POST.get("name", "").strip()
            award, created = Award.objects.get_or_create(name=award_name)
            
            if created:
                invalidate_award_caches()
            
            return JsonResponse({"id": award.id, "name": award.name})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)