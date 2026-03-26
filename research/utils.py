# research/utils.py

# Bots blocked from /search/
BOT_USER_AGENTS = [
    'amazonbot',
    'googleother',
    'bingbot',
    'mj12bot',
    'ahrefsbot',
    'semrushbot',
    'dotbot',
    'petalbot',
    'bytespider',
    'gptbot',
    'claudebot',
    'oai-searchbot',
    'chatgpt-user',
    'anthropic-ai',
    'cohere-ai',
    'yandexbot',
    'duckduckbot',
]

# Bots explicitly allowed through /search/ (Googlebot can index it)
SEARCH_ALLOWED_BOTS = [
    'googlebot',
]


def get_real_ip(group, request):
    """
    Extract the real client IP from X-Forwarded-For, which Render's proxy sets.
    Falls back to REMOTE_ADDR.
    Used as the django-ratelimit key so every visitor gets their own bucket
    instead of all collapsing into 127.0.0.1.
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def is_disallowed_bot(request):
    """
    Returns True if the request comes from a bot that should not access /search/.
    Googlebot is explicitly allowed; everything else in BOT_USER_AGENTS is blocked.
    """
    ua = request.META.get('HTTP_USER_AGENT', '').lower()
    for allowed in SEARCH_ALLOWED_BOTS:
        if allowed in ua:
            return False
    for bot in BOT_USER_AGENTS:
        if bot in ua:
            return True
    return False