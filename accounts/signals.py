from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.apps import apps
from django.conf import settings
from django.db.models import Q


# -------------------------
# Lazy model accessors
# -------------------------

def User():
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    return apps.get_model(app_label, model_name)

def UserProfile():
    return apps.get_model("accounts", "UserProfile")

def Author():
    return apps.get_model("research", "Author")

def ResearchPaper():
    return apps.get_model("research", "ResearchPaper")


# -------------------------
# Helpers
# -------------------------

def normalize(value):
    return value.strip().upper() if value else None


def blank_or_null(field):
    """Match empty string OR NULL"""
    return Q(**{f"{field}__isnull": True}) | Q(**{field: ""})


def is_shs_eligible(profile):
    """Check if user is SHS student or Alumni who took SHS"""
    user = profile.user
    
    # SHS students are eligible
    if user.role == "shs_student":
        return True
    
    # Alumni who took SHS are eligible
    if user.role == "alumni" and profile.took_shs:
        return True
    
    return False


# -------------------------
# UserProfile creation
# -------------------------

@receiver(post_save, sender=User())
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile().objects.create(user=instance)


# -------------------------
# Assigned papers syncing
# -------------------------

def update_user_assigned_papers(profile):
    if getattr(profile, "_updating_papers", False):
        return

    profile._updating_papers = True
    authors = profile.author_profile.all()
    papers = ResearchPaper().objects.filter(author__in=authors).distinct()
    profile.assigned_papers.set(papers)
    profile.save(update_fields=[])
    profile._updating_papers = False


@receiver(m2m_changed, sender=UserProfile().author_profile.through)
def sync_papers_on_author_change(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        update_user_assigned_papers(instance)


@receiver(m2m_changed, sender=ResearchPaper().author.through)
def sync_papers_on_paper_author_change(sender, instance, action, **kwargs):
    if action not in ["post_add", "post_remove", "post_clear"]:
        return

    for author in instance.author.all():
        for profile in UserProfile().objects.filter(author_profile=author):
            update_user_assigned_papers(profile)


# -------------------------
# Author creation / claiming
# -------------------------

@receiver(post_save, sender=UserProfile())
def create_author_on_approval(sender, instance, **kwargs):
    if not instance.is_approved:
        return

    # ✅ Check if user is SHS student or Alumni who took SHS
    if not is_shs_eligible(instance):
        return

    # ✅ user already has an author
    existing = Author().objects.filter(user=instance.user).first()
    if existing:
        instance.author_profile.add(existing)
        return

    if instance.author_profile.exists():
        return

    if getattr(instance, "_creating_author", False):
        return

    if not instance.pending_first_name or not instance.pending_last_name:
        return

    instance._creating_author = True

    first = instance.pending_first_name.strip().title()
    last = instance.pending_last_name.strip().title()
    middle = normalize(instance.pending_middle_initial)
    suffix = normalize(instance.pending_suffix)

    qs = Author().objects.filter(
        first_name=first,
        last_name=last,
        user__isnull=True,
    )

    # 🔑 Match middle initial and suffix
    if middle:
        qs = qs.filter(middle_initial=middle)
    else:
        qs = qs.filter(blank_or_null("middle_initial"))

    if suffix:
        qs = qs.filter(suffix=suffix)
    else:
        qs = qs.filter(blank_or_null("suffix"))

    author = qs.first()

    if author:
        author.user = instance.user
        author.G11_Batch = instance.pending_G11
        author.G12_Batch = instance.pending_G12
        author.save()
    else:
        author = Author().objects.create(
            user=instance.user,
            first_name=first,
            last_name=last,
            middle_initial=middle,
            suffix=suffix,
            G11_Batch=instance.pending_G11,
            G12_Batch=instance.pending_G12,
        )

    instance.author_profile.add(author)
    update_user_assigned_papers(instance)
    instance._creating_author = False