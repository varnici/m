FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY notifications ./notifications
COPY manage.py .

ENV DJANGO_SETTINGS_MODULE=notifications.settings
EXPOSE 8010

CMD ["python", "manage.py", "runserver", "0.0.0.0:8010"]

