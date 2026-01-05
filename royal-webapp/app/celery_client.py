# royal-webapp/app/celery_client.py
from celery import Celery

# ⚠️ Survivor Reminder: This points to the Docker container we just launched.
# localhost:6379 is the standard Redis port.
BROKER_URL = "redis://localhost:6379/0"
BACKEND_URL = "redis://localhost:6379/0"

# This initializes the background worker.
# We call it "zombie_worker" so we can identify it in logs.
celery_app = Celery(
    "zombie_worker",
    broker=BROKER_URL,
    backend=BACKEND_URL
)

# We tell Celery to use json so the data is readable.
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# ⚠️ Vital for Windows Survivors:
# Windows doesn't support the standard "fork" process.
# When we run this later, we MUST use '--pool=solo'.