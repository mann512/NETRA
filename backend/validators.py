import re

# ==================== VALIDATION RULES ====================
# Har entity type ke liye: (regex_pattern, error_message, example)

VALIDATORS = {
    # ---- People ----
    "Person": (
        r'^[A-Za-z][A-Za-z\.\s]{1,60}$',
        'Only letters and spaces allowed (2-60 chars)',
        'Rahul Sharma',
    ),
    "Alias": (
        r'^[A-Za-z][A-Za-z\.\s]{1,40}$',
        'Only letters and spaces allowed',
        'Rocky',
    ),

    # ---- Identity ----
    "Aadhaar": (
        r'^\d{4}\s?\d{4}\s?\d{4}$',
        'Must be 12 digits (e.g. 1234 5678 9012)',
        '1234 5678 9012',
    ),
    "PAN": (
        r'^[A-Z]{5}\d{4}[A-Z]$',
        'Format: 5 letters + 4 digits + 1 letter (ABCDE1234F)',
        'ABCDE1234F',
    ),
    "Passport": (
        r'^[A-Z]\d{7}$',
        'Format: 1 letter + 7 digits (A1234567)',
        'A1234567',
    ),
    "VoterID": (
        r'^[A-Z]{3}\d{7}$',
        'Format: 3 letters + 7 digits (ABC1234567)',
        'ABC1234567',
    ),
    "DrivingLicense": (
        r'^[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}$',
        'Format: DL01 2020 1234567',
        'DL0120201234567',
    ),

    # ---- Communication ----
    "Phone": (
        r'^(?:\+91[\s-]?)?[6-9]\d{9}$',
        'Must be 10 digits starting with 6-9',
        '9811234567',
    ),
    "Landline": (
        r'^0\d{2,4}[\s-]?\d{6,8}$',
        'Must start with 0 (e.g. 011-23456789)',
        '011-23456789',
    ),
    "IMEI": (
        r'^\d{15}$',
        'Must be exactly 15 digits',
        '123456789012345',
    ),
    "IMSI": (
        r'^\d{15}$',
        'Must be exactly 15 digits',
        '404101234567890',
    ),
    "SIM": (
        r'^\d{15,20}$',
        'Must be 15-20 digits',
        '8991012345678901234',
    ),
    "Email": (
        r'^[\w\.\-]+@[\w\.\-]+\.\w+$',
        'Invalid email format',
        'user@example.com',
    ),
    "IPAddress": (
        r'^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$',
        'Invalid IP address',
        '192.168.1.1',
    ),
    "MACAddress": (
        r'^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$',
        'Format: AA:BB:CC:DD:EE:FF',
        'AA:BB:CC:DD:EE:FF',
    ),
    "SocialHandle": (
        r'^@[A-Za-z0-9_\.]{3,30}$',
        'Must start with @ (3-30 chars)',
        '@username',
    ),

    # ---- Finance ----
    "BankAccount": (
        r'^\d{9,18}$',
        'Must be 9-18 digits',
        '123456789012',
    ),
    "IFSC": (
        r'^[A-Z]{4}0[A-Z0-9]{6}$',
        'Format: 4 letters + 0 + 6 alphanumeric (HDFC0001234)',
        'HDFC0001234',
    ),
    "UPI": (
        r'^[\w\.\-]{3,50}@[a-zA-Z]{3,20}$',
        'Format: username@bank (e.g. rahul@okhdfcbank)',
        'rahul@okhdfcbank',
    ),
    "CreditCard": (
        r'^(?:\d{4}[\s-]?){3}\d{4}$',
        'Must be 16 digits',
        '4111 1111 1111 1111',
    ),
    "TransactionID": (
        r'^[A-Z0-9]{8,25}$',
        'Must be 8-25 alphanumeric characters',
        'TXN12345678ABCD',
    ),
    "Bank": (
        r'^[A-Za-z\s]{3,40}$',
        'Only letters and spaces',
        'HDFC Bank',
    ),
    "Amount": (
        r'^[\d,]+(?:\.\d{1,2})?$',
        'Only digits and commas',
        '500000',
    ),
    "Cryptocurrency": (
        r'^(BTC|ETH|USDT|Bitcoin|Ethereum)$',
        'Must be one of: BTC, ETH, USDT, Bitcoin, Ethereum',
        'BTC',
    ),
    "WalletAddress": (
        r'^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$',
        'Invalid wallet address format',
        '0x1234...',
    ),

    # ---- Vehicles ----
    "Vehicle": (
        r'^[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}$',
        'Format: DL-01-AB-1234 or DL01AB1234',
        'DL-01-AB-1234',
    ),
    "ChassisNo": (
        r'^[A-HJ-NPR-Z0-9]{17}$',
        'Must be exactly 17 alphanumeric chars (no I, O, Q)',
        'MA3EYD32S00123456',
    ),
    "EngineNo": (
        r'^[A-Z0-9]{8,20}$',
        'Must be 8-20 alphanumeric chars',
        'ENG12345678',
    ),

    # ---- Weapons ----
    "Weapon": (
        r'^[A-Za-z\s\-0-9]{2,40}$',
        'Only letters, numbers, spaces',
        'Country-made pistol',
    ),
    "WeaponSerial": (
        r'^[A-Z0-9\-]{5,25}$',
        'Must be 5-25 alphanumeric chars',
        'CP-2026-889',
    ),

    # ---- Location ----
    "Location": (
        r'^[A-Za-z][A-Za-z\s\.\-]{1,60}$',
        'Only letters and spaces',
        'Delhi',
    ),
    "State": (
        r'^[A-Za-z][A-Za-z\s]{2,40}$',
        'Only letters and spaces',
        'Punjab',
    ),
    "Pincode": (
        r'^[1-9]\d{5}$',
        'Must be 6 digits (not starting with 0)',
        '110001',
    ),
    "GPS": (
        r'^-?\d{1,3}\.\d{4,8}\s*,\s*-?\d{1,3}\.\d{4,8}$',
        'Format: latitude,longitude (e.g. 28.6139,77.2090)',
        '28.6139,77.2090',
    ),

    # ---- Time ----
    "Date": (
        r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$',
        'Format: DD/MM/YYYY or DD-MM-YYYY',
        '15/03/2026',
    ),
    "Time": (
        r'^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s?(?:AM|PM|am|pm)?$',
        'Format: HH:MM or HH:MM:SS',
        '14:30',
    ),
    "Year": (
        r'^(19|20)\d{2}$',
        'Must be a 4-digit year (1900-2099)',
        '2026',
    ),

    # ---- Legal ----
    "FIRNumber": (
        r'^\d{1,6}(?:[/-]\d{2,4})?$',
        'Format: 1042/2026 or just 1042',
        '1042/2026',
    ),
    "Section": (
        r'^[A-Za-z0-9\(\)\s\.\-]{2,60}$',
        'Only letters, numbers, brackets',
        'IPC 384',
    ),
    "PoliceStation": (
        r'^[A-Za-z][A-Za-z\s\.\-]{2,60}$',
        'Only letters and spaces',
        'Delhi Central',
    ),
    "CourtName": (
        r'^[A-Za-z][A-Za-z\s\.\-]{2,60}$',
        'Only letters and spaces',
        'District Court',
    ),
    "CrimeType": (
        r'^[A-Za-z][A-Za-z\s]{2,40}$',
        'Only letters and spaces',
        'extortion',
    ),

    # ---- Digital ----
    "Device": (
        r'^[A-Za-z][A-Za-z0-9\s\-\.]{1,40}$',
        'Only letters and numbers',
        'iPhone 14',
    ),
    "App": (
        r'^[A-Za-z][A-Za-z0-9\s\.\-]{1,30}$',
        'Only letters and numbers',
        'WhatsApp',
    ),

    # ---- Organization ----
    "Organization": (
        r'^[A-Za-z][A-Za-z0-9\s\.\-&]{2,80}$',
        'Only letters, numbers, spaces',
        'ABC Pvt Ltd',
    ),
}


def validate_entity(etype: str, value: str):
    """
    Returns (is_valid: bool, error_message: str)
    """
    if not value or not value.strip():
        return False, 'Value cannot be empty'

    value = value.strip()

    if len(value) < 2:
        return False, 'Value too short (min 2 chars)'

    if len(value) > 200:
        return False, 'Value too long (max 200 chars)'

    validator = VALIDATORS.get(etype)
    if not validator:
        # Unknown type — only check length
        return True, ''

    pattern, err_msg, example = validator

    if not re.match(pattern, value):
        return False, f'{err_msg} — example: {example}'

    return True, ''