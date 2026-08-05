import json
import uuid
import structlog
import requests
from datetime import datetime, timedelta

from src.core.celery_app import celery_app
from src.core.database import SessionLocal
from src.core.security import generate_webhook_signature
from src.models import EventLog, WebhookEndpoint, WebhookDelivery

logger = structlog.get_logger()

# Constants
MAX_RETRIES = 5
TIMEOUT_SECONDS = 10

@celery_app.task(bind=True, max_retries=MAX_RETRIES)
def deliver_webhook_task(self, event_id_str: str):
    """
    Looks up the event, finds subscribed endpoints, and creates delivery jobs.
    """
    db = SessionLocal()
    try:
        event = db.query(EventLog).filter(EventLog.id == event_id_str).first()
        if not event:
            logger.warning("Event not found for webhook delivery", event_id=event_id_str)
            return

        endpoints = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.organization_id == event.organization_id,
            WebhookEndpoint.is_active == True
        ).all()

        for endpoint in endpoints:
            # Check if subscribed (empty list means all, or explicitly matching)
            if not endpoint.subscribed_events or event.event_type in endpoint.subscribed_events:
                
                # Create the delivery record
                delivery = WebhookDelivery(
                    endpoint_id=endpoint.id,
                    event_id=str(event.id),
                    event_type=event.event_type,
                    payload_json=event.payload_json,
                    delivery_status="PENDING"
                )
                db.add(delivery)
                db.commit()
                db.refresh(delivery)
                
                # Dispatch individual request task
                execute_webhook_delivery.delay(str(delivery.id))
                
    except Exception as e:
        logger.error("Failed to process event for webhooks", error=str(e), event_id=event_id_str)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=MAX_RETRIES)
def execute_webhook_delivery(self, delivery_id_str: str):
    """
    Executes the HTTP POST request to the webhook endpoint with HMAC signature.
    Implements exponential backoff on failure.
    """
    db = SessionLocal()
    try:
        delivery = db.query(WebhookDelivery).filter(WebhookDelivery.id == delivery_id_str).first()
        if not delivery:
            return
            
        endpoint = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == delivery.endpoint_id).first()
        if not endpoint or not endpoint.is_active:
            delivery.delivery_status = "FAILED"
            delivery.response_body = "Endpoint deleted or deactivated"
            db.commit()
            return
            
        # Prepare payload and signature
        payload_str = json.dumps(delivery.payload_json)
        signature = generate_webhook_signature(payload_str, endpoint.hmac_secret)
        
        headers = {
            "Content-Type": "application/json",
            "X-SupportDesk-Event": delivery.event_type,
            "X-SupportDesk-Delivery": str(delivery.id),
            "X-SupportDesk-Signature": signature,
            "User-Agent": "SupportDesk-Webhook-Agent/1.0"
        }
        
        try:
            response = requests.post(endpoint.url, data=payload_str, headers=headers, timeout=TIMEOUT_SECONDS)
            delivery.status_code = response.status_code
            delivery.response_body = response.text[:1000] # Truncate large responses
            
            if 200 <= response.status_code < 300:
                delivery.delivery_status = "SUCCESS"
            else:
                raise Exception(f"HTTP {response.status_code}")
                
        except Exception as e:
            delivery.status_code = delivery.status_code or 0
            delivery.response_body = str(e)
            
            if self.request.retries >= self.max_retries:
                delivery.delivery_status = "FAILED"
            else:
                delivery.delivery_status = "PENDING"
                delivery.retry_count += 1
                backoff = 2 ** self.request.retries
                delivery.next_retry_at = datetime.utcnow() + timedelta(seconds=backoff * 10)
                db.commit()
                raise self.retry(exc=e, countdown=backoff * 10)
                
        finally:
            db.commit()
            
    except Exception as e:
        logger.error("Webhook delivery exception", error=str(e), delivery_id=delivery_id_str)
    finally:
        db.close()
