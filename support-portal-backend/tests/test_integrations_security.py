import pytest
import json
from src.core.security import (
    generate_api_key, verify_api_key,
    generate_webhook_signature, verify_webhook_signature,
    hash_token
)


# ─── API Key Tests ────────────────────────────────────────────────────────────

def test_generate_api_key_format():
    plain_key, hashed_key = generate_api_key()
    assert plain_key.startswith("sd_live_")
    assert len(plain_key) > 12
    assert len(hashed_key) == 64  # SHA-256 hex digest


def test_api_key_prefix_length():
    plain_key, _ = generate_api_key()
    prefix = plain_key[:12]
    assert prefix == "sd_live_" + plain_key[8:12]


def test_verify_api_key_correct():
    plain_key, hashed_key = generate_api_key()
    assert verify_api_key(plain_key, hashed_key) is True


def test_verify_api_key_wrong():
    plain_key, hashed_key = generate_api_key()
    assert verify_api_key("sd_live_wrongkey1234", hashed_key) is False


def test_two_keys_are_unique():
    key1, _ = generate_api_key()
    key2, _ = generate_api_key()
    assert key1 != key2


# ─── Webhook Signature Tests ──────────────────────────────────────────────────

def test_webhook_signature_format():
    sig = generate_webhook_signature('{"test": "payload"}', "mysecret")
    assert sig.startswith("sha256=")
    assert len(sig) == 71  # "sha256=" + 64-char hex


def test_webhook_signature_verification_correct():
    payload = json.dumps({"event": "ticket.created", "ticket_id": "123"})
    secret = "whsec_test_secret_abc123"
    sig = generate_webhook_signature(payload, secret)
    assert verify_webhook_signature(payload, sig, secret) is True


def test_webhook_signature_verification_wrong_secret():
    payload = json.dumps({"event": "ticket.created"})
    sig = generate_webhook_signature(payload, "correct_secret")
    assert verify_webhook_signature(payload, sig, "wrong_secret") is False


def test_webhook_signature_tampered_payload():
    secret = "my_signing_secret"
    original_payload = json.dumps({"amount": 100})
    sig = generate_webhook_signature(original_payload, secret)
    tampered_payload = json.dumps({"amount": 9999})
    assert verify_webhook_signature(tampered_payload, sig, secret) is False


def test_webhook_different_secrets_produce_different_sigs():
    payload = '{"test": 1}'
    sig1 = generate_webhook_signature(payload, "secret1")
    sig2 = generate_webhook_signature(payload, "secret2")
    assert sig1 != sig2
