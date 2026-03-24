from django.db import models


class SmsMessage(models.Model):
    to_phone = models.CharField(max_length=32)
    body = models.TextField()
    status = models.CharField(max_length=32, default="queued")
    created_at = models.DateTimeField(auto_now_add=True)

