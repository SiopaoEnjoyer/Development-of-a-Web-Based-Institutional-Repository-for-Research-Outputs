from django import template

from django.utils.safestring import mark_safe
import re

register = template.Library()

@register.filter
def add_class(field, css):
    return field.as_widget(attrs={"class": css})

@register.filter(name='format_italics')
def format_italics(text):
    """Convert *text* to <i>text</i> for HTML display"""
    if not text:
        return ''
    formatted = re.sub(r'\*([^*]+)\*', r'<i>\1</i>', text)
    return mark_safe(formatted)