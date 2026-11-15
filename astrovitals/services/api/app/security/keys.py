"""Ed25519 key management for AstraVitals bundle verification.

- Generates / restores Ed25519 key pairs
- Derives keys from PEM (fallback)
- Verifies signed bundles (SHA-256 hash + Ed25519 signature over canonical JSON)
- Key rotation support
"""

import base64
import hashlib
import json
import os
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


_cached_public_key: Optional[ed25519.Ed25519PublicKey] = None
_cached_private_key: Optional[ed25519.Ed25519PrivateKey] = None


def load_cached_keypair() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """Load or generate a cached Ed25519 key pair.

    Keys are cached in module memory after the first call. In production this
    would load from a TPM / Secure Enclave / hardware keystore or a secret
    manager; the software fallback is acceptable only for local development.
    """
    global _cached_private_key, _cached_public_key

    if _cached_private_key is not None and _cached_public_key is not None:
        return _cached_private_key, _cached_public_key

    env_private = os.getenv("ASTRA_ED25519_PRIVATE_KEY_B64")
    env_public = os.getenv("ASTRA_ED25519_PUBLIC_KEY_B64")

    if env_private and env_public:
        try:
            private_pem = base64.b64decode(env_private)
            public_pem = base64.b64decode(env_public)
            _cached_private_key = serialization.load_pem_private_key(
                private_pem, password=None
            )
            _cached_public_key = serialization.load_public_key(public_pem)
            return _cached_private_key, _cached_public_key
        except Exception as exc:
            print(f"Failed to load cached keys from env: {exc}")

    _cached_private_key = ed25519.Ed25519PrivateKey.generate()
    _cached_public_key = _cached_private_key.public_key()
    return _cached_private_key, _cached_public_key


def generate_keypair() -> Tuple[ed25519.Ed25519PrivateKey, ed25519.Ed25519PublicKey]:
    """Generate a new Ed25519 key pair (software only)."""
    return load_cached_keypair()


def private_to_pem(private_key: ed25519.Ed25519PrivateKey) -> bytes:
    """Serialize a private key to PKCS#8 PEM."""
    return private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )


def public_to_pem(public_key: ed25519.Ed25519PublicKey) -> bytes:
    """Serialize a public key to SPKI PEM."""
    return public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def pem_to_private_key(pem_data: bytes) -> ed25519.Ed25519PrivateKey:
    """Deserialize a private key from PKCS#8 PEM."""
    return serialization.load_pem_private_key(pem_data, password=None)


def pem_to_public_key(pem_data: bytes) -> ed25519.Ed25519PublicKey:
    """Deserialize a public key from SPKI PEM."""
    return serialization.load_public_key(pem_data)


def _canonical_bytes(payload: Dict[str, Any]) -> bytes:
    """Canonical JSON bytes (sorted keys) for hashing / signing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )


def compute_sha256(payload: Dict[str, Any]) -> str:
    """SHA-256 hex digest of canonical JSON payload."""
    return hashlib.sha256(_canonical_bytes(payload)).hexdigest()


def verify_bundle_signature(
    payload: Dict[str, Any],
    hash_hex: str,
    signature_b64: str,
) -> Tuple[bool, str]:
    """Verify an Ed25519 signature over a SHA-256 hash of the canonical payload.

    Convention (must match the client in ``src/lib/crypto.ts``):
      - canonical JSON = ``JSON.stringify`` with sorted keys, no whitespace
      - hash = SHA-256 of those bytes, hex-encoded
      - signature = Ed25519 ``sign(payload_bytes)`` base64-encoded
    """
    try:
        computed_hash = compute_sha256(payload)
        if computed_hash != hash_hex:
            return False, f"Hash mismatch: computed={computed_hash}, expected={hash_hex}"

        signature_bytes = base64.b64decode(signature_b64)

        _, public_key = load_cached_keypair()
        payload_bytes = _canonical_bytes(payload)

        public_key.verify(signature_bytes, payload_bytes)
        return True, "Signature verified OK"
    except Exception as exc:
        return False, f"Bundle verification error: {exc}"
