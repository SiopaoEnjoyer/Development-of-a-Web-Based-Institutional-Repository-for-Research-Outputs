# research/templatetags/custom_filters.py
from django import template

register = template.Library()

@register.filter
def join_authors(authors):
    """Join all author names into a single string."""
    if hasattr(authors, "all"):
        author_list = []
        for a in authors.all():
            name = f"{a.first_name} "
            if a.middle_initial:
                name += f"{a.middle_initial}. "
            name += a.last_name
            author_list.append(name.strip())
        return ", ".join(author_list)
    return ""

@register.filter
def join_keywords(keywords):
    """Join all keyword words into a single string."""
    if hasattr(keywords, "all"):
        return ", ".join(k.word for k in keywords.all())
    return ""

