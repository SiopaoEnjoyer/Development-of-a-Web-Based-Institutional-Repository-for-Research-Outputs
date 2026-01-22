from django import forms
from .models import ResearchPaper, Author, Keyword, Award
from django.core.exceptions import ValidationError


class ResearchPaperForm(forms.ModelForm):
    class Meta:
        model = ResearchPaper
        fields = [
            'title',
            'abstract',
            'grade_level',
            'strand',
            'research_design',  # CHANGED from 'specialization'
            'school_year',
            'publication_date',
            'author',
            'keywords',
            'awards',
            'pdf_file',
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter research paper title'
            }),
            'abstract': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 6,
                'placeholder': 'Enter abstract'
            }),
            'grade_level': forms.Select(attrs={
                'class': 'form-control',
                'id': 'id_grade_level'
            }),
            'strand': forms.Select(attrs={
                'class': 'form-control',
                'id': 'id_strand'
            }),
            'research_design': forms.Select(attrs={
                'class': 'form-control',
                'id': 'id_research_design'
            }),
            'school_year': forms.Select(attrs={
                'class': 'form-control',
                'id': 'id_school_year'
            }),
            'publication_date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'author': forms.SelectMultiple(attrs={
                'class': 'form-control',
                'id': 'id_author',
                'size': '8'
            }),
            'keywords': forms.SelectMultiple(attrs={
                'class': 'form-control',
                'size': '8'
            }),
            'awards': forms.SelectMultiple(attrs={
                'class': 'form-control',
                'size': '5'
            }),
            'pdf_file': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'application/pdf'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Set initial querysets
        self.fields['author'].queryset = Author.objects.none()
        self.fields['keywords'].queryset = Keyword.objects.all().order_by('word')
        self.fields['awards'].queryset = Award.objects.all().order_by('name')
        
        # Dynamic research design filtering
        if 'grade_level' in self.data and 'strand' in self.data:
            try:
                grade_level = int(self.data.get('grade_level'))
                strand = self.data.get('strand')
                allowed_designs = ResearchPaper.get_allowed_research_designs(
                    grade_level, 
                    strand
                )
                self.fields['research_design'].choices = allowed_designs
            except (ValueError, TypeError):
                pass
        elif self.instance.pk:
            # For existing papers, show allowed designs for their grade/strand
            allowed_designs = ResearchPaper.get_allowed_research_designs(
                self.instance.grade_level,
                self.instance.strand
            )
            self.fields['research_design'].choices = allowed_designs

        # Load authors if editing existing paper
        if self.instance.pk:
            if self.instance.grade_level == 11:
                self.fields['author'].queryset = Author.objects.filter(
                    G11_Batch=self.instance.school_year
                ).order_by('last_name', 'first_name')
            elif self.instance.grade_level == 12:
                self.fields['author'].queryset = Author.objects.filter(
                    G12_Batch=self.instance.school_year
                ).order_by('last_name', 'first_name')
        
        # Load authors if grade, strand, and school year are in POST data
        if 'grade_level' in self.data and 'school_year' in self.data:
            try:
                grade_level = self.data.get('grade_level')
                school_year = self.data.get('school_year')
                
                if grade_level == '11':
                    self.fields['author'].queryset = Author.objects.filter(
                        G11_Batch=school_year
                    ).order_by('last_name', 'first_name')
                elif grade_level == '12':
                    self.fields['author'].queryset = Author.objects.filter(
                        G12_Batch=school_year
                    ).order_by('last_name', 'first_name')
            except (ValueError, TypeError):
                pass

    def clean(self):
        cleaned_data = super().clean()
        grade_level = cleaned_data.get('grade_level')
        strand = cleaned_data.get('strand')
        research_design = cleaned_data.get('research_design')

        # Validate research design based on rules
        if grade_level and strand and research_design:
            allowed = dict(ResearchPaper.get_allowed_research_designs(
                grade_level, 
                strand
            )).keys()
            
            if research_design not in allowed:
                raise forms.ValidationError(
                    f"Invalid research design for Grade {grade_level} {strand}."
                )

        return cleaned_data

    def save(self, commit=True):
        paper = super().save(commit=False)

        if commit:
            paper.save()
            self.save_m2m()

            # Create keyword AFTER save
            kw = self.cleaned_data.get("new_keyword")
            if kw:
                keyword = Keyword.objects.create(word=kw)
                paper.keywords.add(keyword)

            # Create author AFTER save
            first = self.cleaned_data.get("new_author_first")
            last = self.cleaned_data.get("new_author_last")
            if first and last:
                author = Author.objects.create(
                    first_name=first,
                    last_name=last
                )
                paper.author.add(author)

        return paper
