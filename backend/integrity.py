import hashlib

def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def verify_integrity(data: bytes, expected_hash: str) -> bool:
    return sha256_of_bytes(data) == expected_hash