from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from datetime import date
from django.contrib.auth.models import User
from storage import SupabaseStorage

class Keyword(models.Model):
    word = models.CharField(max_length=100, unique=True)

    def save(self, *args, **kwargs):
        if self.word:
            self.word = self.word.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.word

    @property
    def name(self):
        """Alias for compatibility with code that uses 'name' instead of 'word'"""
        return self.word
    
    def get_formatted_html(self):
        """Convert *text* to <i>text</i> for HTML display"""
        return self.word.replace('*', '<i>', 1).replace('*', '</i>', 1) if '*' in self.word else self.word
    
    class Meta:
        ordering = ['word']
        indexes = [
            models.Index(fields=['word']),  # For search/filtering
        ]

class Author(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="author_account"
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    middle_initial = models.CharField(max_length=1, blank=True)
    suffix = models.CharField(max_length=10, blank=True)

    birthdate = models.DateField(null=True, blank=True)

    G11_Batch = models.CharField(
        max_length=9, blank=True, null=True,
        validators=[RegexValidator(regex=r"^\d{4}-\d{4}$")]
    )
    G12_Batch = models.CharField(
        max_length=9, blank=True, null=True,
        validators=[RegexValidator(regex=r"^\d{4}-\d{4}$")]
    )

    class Meta:
        unique_together = (
            "first_name",
            "middle_initial",
            "last_name",
            "suffix",
        )
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(user__isnull=False),
                name="one_author_per_user"
            )
        ]

        indexes = [
            models.Index(fields=['last_name', 'first_name']),  # For sorting/filtering
            models.Index(fields=['G11_Batch']),  # For batch filtering
            models.Index(fields=['G12_Batch']),  # For batch filtering
        ]

    def save(self, *args, **kwargs):
        self.first_name = self.first_name.strip().title()
        self.last_name = self.last_name.strip().title()
        
        if self.middle_initial:
            self.middle_initial = self.middle_initial.strip().upper()
        else:
            self.middle_initial = ""
        
        if self.suffix:
            self.suffix = self.suffix.strip()
        else:
            self.suffix = ""
        
        super().save(*args, **kwargs)

    @property
    def age(self):
        """Calculate age from birthdate"""
        if not self.birthdate:
            return None
        today = date.today()
        return today.year - self.birthdate.year - ((today.month, today.day) < (self.birthdate.month, self.birthdate.day))

    def __str__(self):
        """Full name for internal use"""
        mid = f" {self.middle_initial}." if self.middle_initial else ""
        suf = f", {self.suffix}" if self.suffix else ""
        return f"{self.first_name}{mid} {self.last_name}{suf}"

    def display_name_public(self):
        if self.user and hasattr(self.user, 'userprofile'):
            profile = self.user.userprofile
            if profile.consent_status == 'consented':
                return str(self)
        
        first_names = self.first_name.strip().split()
        first_initials = " ".join(f"{name[0].upper()}." for name in first_names if name)
        parts = [f"{self.last_name},", first_initials]
        
        if self.middle_initial:
            parts.append(self.middle_initial + ".")
        
        name = " ".join(parts)
        
        if self.suffix:
            name += f" {self.suffix}"
        
        return name
    

class ResearchPaper(models.Model):
    STRAND_CHOICES = [
        ("STEM", "STEM"),
        ("HUMSS", "HUMSS"),
        ("ABM", "ABM"),
    ]

    # NEW: Research Design choices based on grade level and strand
    RESEARCH_DESIGN_CHOICES = [
        ("QUALITATIVE", "Qualitative"),
        ("SURVEY", "Survey"),
        ("EXPERIMENTAL", "Experimental"),
        ("CAPSTONE", "Capstone"),
    ]

    GRADE_LEVEL = [(11, "Grade 11"), (12, "Grade 12")]

    title = models.CharField(max_length=200)
    abstract = models.TextField()
    publication_date = models.DateField()

    author = models.ManyToManyField(Author)
    keywords = models.ManyToManyField(Keyword, blank=True)

    grade_level = models.IntegerField(choices=GRADE_LEVEL)
    strand = models.CharField(max_length=10, choices=STRAND_CHOICES)
    
    # CHANGED: From specialization to research_design
    research_design = models.CharField(
        max_length=50, 
        choices=RESEARCH_DESIGN_CHOICES,
        verbose_name="Research Design"
    )

    school_year = models.CharField(
        max_length=9,
        validators=[RegexValidator(regex=r"^\d{4}-\d{4}$")]
    )

    pdf_file = models.FileField(
    upload_to="research_papers/",
    storage=SupabaseStorage
)

    awards = models.ManyToManyField(
        'Award', blank=True, related_name='research_papers'
    )

    class Meta:
        indexes = [
            models.Index(fields=['-publication_date']),  # For default ordering
            models.Index(fields=['strand']),  # For strand filtering
            models.Index(fields=['grade_level']),  # For grade filtering
            models.Index(fields=['school_year']),  # For year filtering
            models.Index(fields=['research_design']),  # For design filtering
            models.Index(fields=['strand', 'research_design']),  # Composite index
            models.Index(fields=['title']),  # For search
        ]
 
    def clean(self):
        """
        Validation rules for research design based on grade level and strand:
        - Grade 11: QUALITATIVE only (all strands)
        - Grade 12 STEM: SURVEY, EXPERIMENTAL, or CAPSTONE
        - Grade 12 non-STEM: SURVEY only
        """
        if self.grade_level == 11:
            # Grade 11 must be QUALITATIVE
            if self.research_design != 'QUALITATIVE':
                raise ValidationError({
                    'research_design': 'Grade 11 papers must use Qualitative research design.'
                })
        
        elif self.grade_level == 12:
            if self.strand == 'STEM':
                # Grade 12 STEM: SURVEY, EXPERIMENTAL, or CAPSTONE
                allowed = ['SURVEY', 'EXPERIMENTAL', 'CAPSTONE']
                if self.research_design not in allowed:
                    raise ValidationError({
                        'research_design': 'Grade 12 STEM papers must use Survey, Experimental, or Capstone research design.'
                    })
            else:
                # Grade 12 non-STEM: SURVEY only
                if self.research_design != 'SURVEY':
                    raise ValidationError({
                        'research_design': 'Grade 12 HUMSS/ABM papers must use Survey research design.'
                    })

    @staticmethod
    def get_allowed_research_designs(grade_level, strand):
        """
        Helper method to get allowed research designs for a given grade/strand.
        Useful for dynamically filtering form choices.
        """
        if grade_level == 11:
            return [('QUALITATIVE', 'Qualitative')]
        elif grade_level == 12:
            if strand == 'STEM':
                return [
                    ('SURVEY', 'Survey'),
                    ('EXPERIMENTAL', 'Experimental'),
                    ('CAPSTONE', 'Capstone'),
                ]
            else:  # HUMSS or ABM
                return [('SURVEY', 'Survey')]
        return []

    def get_absolute_url(self):
        """Return the URL for this research paper"""
        from django.urls import reverse
        return reverse('research:detail', kwargs={'pk': self.pk})

    def get_citation_count(self):
        '''Get total citation count'''
        return self.citations.count()

    def __str__(self):
        return self.title


class Award(models.Model):
    name = models.CharField(max_length=200, unique=True)
    
    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().title()
        super().save(*args, **kwargs)   

    def __str__(self):
        return self.name


class PaperCitation(models.Model):
    """Track citations of papers"""
    paper = models.ForeignKey('ResearchPaper', on_delete=models.CASCADE, related_name='citations')
    cited_by_paper = models.ForeignKey('ResearchPaper', on_delete=models.CASCADE, null=True, blank=True, related_name='cites')
    cited_by_external = models.CharField(max_length=500, null=True, blank=True)  # External citation source
    citation_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Paper Citation"
        verbose_name_plural = "Paper Citations"
    
    def __str__(self):
        if self.cited_by_paper:
            return f"{self.paper.title} cited by {self.cited_by_paper.title}"
        return f"{self.paper.title} cited by {self.cited_by_external}"