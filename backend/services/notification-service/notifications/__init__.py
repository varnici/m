from __future__ import annotations

import os
from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "notifications.settings")

celery_app = Celery("notifications")
celery_app.config_from_object("django.conf:settings", namespace="CELERY")
celery_app.autodiscover_tasks()

__all__ = ["celery_app"]

