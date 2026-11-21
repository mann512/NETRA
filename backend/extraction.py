import re

# ==================== UNIVERSAL ENTITY PATTERNS ====================

PATTERNS = {
    # ---- People & Identity ----
    "Person": r'\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3}\b',
    "Alias": r'\b(?:alias|aka|also known as|urff?)\s+["\']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["\']?',
    "Aadhaar": r'\b\d{4}\s?\d{4}\s?\d{4}\b',
    "PAN": r'\b[A-Z]{5}\d{4}[A-Z]\b',
    "Passport": r'\b[A-Z]\d{7}\b',
    "VoterID": r'\b[A-Z]{3}\d{7}\b',
    "DrivingLicense": r'\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}\b',

    # ---- Communication ----
    "Phone": r'\b(?:\+91[\s-]?)?[6-9]\d{9}\b',
    "Landline": r'\b0\d{2,4}[\s-]?\d{6,8}\b',
    "IMEI": r'\b\d{15}\b',
    "IMSI": r'\b\d{15}\b',
    "SIM": r'\b(?:SIM|sim)\s*[:\-]?\s*(\d{15,20})\b',
    "Email": r'\b[\w\.\-]+@[\w\.\-]+\.\w+\b',
    "IPAddress": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
    "MACAddress": r'\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b',
    "SocialHandle": r'@[A-Za-z0-9_\.]{3,30}',

    # ---- Finance ----
    "BankAccount": r'\b\d{9,18}\b',
    "IFSC": r'\b[A-Z]{4}0[A-Z0-9]{6}\b',
    "UPI": r'\b[\w\.\-]{3,50}@(?:upi|okaxis|okhdfcbank|okicici|oksbi|ybl|paytm|apl)\b',
    "CreditCard": r'\b(?:\d{4}[\s-]?){3}\d{4}\b',
    "TransactionID": r'\b(?:TXN|UPI|NEFT|RTGS|IMPS)[A-Z0-9]{8,20}\b',

    # ---- Vehicles ----
    "Vehicle": r'\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b',
    "ChassisNo": r'\b[A-HJ-NPR-Z0-9]{17}\b',
    "EngineNo": r'\b[A-Z0-9]{8,20}\b',

    # ---- Weapons ----
    "Weapon": r'\b(?:pistol|revolver|rifle|gun|AK-?47|country[-\s]?made|katta|tamancha|knife|sword|bomb|IED|grenade|cartridge|bullet)\b',
    "WeaponSerial": r'\b(?:serial|SN|sr\.?\s*no)\s*[:\-]?\s*([A-Z0-9\-]{5,20})\b',

    # ---- Location ----
    "Location": r'\b(?:Delhi|Mumbai|Punjab|Haryana|Kerala|Bangalore|Bengaluru|Chennai|Kolkata|Pune|Hyderabad|Jaipur|Lucknow|Chandigarh|Amritsar|Gurgaon|Gurugram|Noida|Faridabad|Patna|Bhopal|Indore|Nagpur|Surat|Ahmedabad|Kanpur|Varanasi|Agra|Meerut|Ludhiana|Jalandhar|Thane|Navi Mumbai|Goa|Kochi|Coimbatore|Madurai|Vizag|Visakhapatnam|Ranchi|Raipur|Dehradun|Shimla|Srinagar|Jammu|Guwahati|Bhubaneswar|Trivandrum)\b',
    "State": r'\b(?:Punjab|Haryana|Delhi|Uttar Pradesh|Bihar|Maharashtra|Karnataka|Tamil Nadu|Kerala|Gujarat|Rajasthan|Madhya Pradesh|West Bengal|Odisha|Assam|Jharkhand|Chhattisgarh|Uttarakhand|Himachal Pradesh|Goa|Telangana|Andhra Pradesh)\b',
    "Pincode": r'\b[1-9]\d{5}\b',
    "GPS": r'\b-?\d{1,3}\.\d{4,8}\s*,\s*-?\d{1,3}\.\d{4,8}\b',

    # ---- Organization ----
    "Bank": r'\b(?:SBI|HDFC|ICICI|Axis|Kotak|PNB|Canara|Bank of Baroda|BOB|Union Bank|Yes Bank|IndusInd|IDBI|Federal Bank|RBL|Bank of India|Central Bank|UCO Bank|Punjab National Bank)\b',
    "Organization": r'\b(?:Ltd|Limited|Pvt|Private|Inc|Corp|Corporation|Company|Trust|Foundation|Society)\b',

    # ---- Time ----
    "Date": r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b',
    "Time": r'\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s?(?:AM|PM|am|pm)?\b',
    "Year": r'\b(?:19|20)\d{2}\b',

    # ---- Case / Legal ----
    "FIRNumber": r'\b(?:FIR|F\.I\.R|Case|CR|Crime)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*(\d+[\s/-]?\d*[/-]?\d*)\b',
    "Section": r'\b(?:IPC|BNS|CrPC|NDPS|IT Act|POCSO|Section)\s*(?:\d+[A-Z]?|\d+\(\d+\))\b',
    "PoliceStation": r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+Police\s+Station\b',
    "CourtName": r'\b(?:Sessions Court|District Court|High Court|Supreme Court|Magistrate Court)\b',

    # ---- Money ----
    "Amount": r'(?:Rs\.?|₹|INR)\s?([\d,]+(?:\.\d{1,2})?)',
    "Cryptocurrency": r'\b(?:BTC|ETH|USDT|Bitcoin|Ethereum)\b',
    "WalletAddress": r'\b0x[a-fA-F0-9]{40}\b|\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b',

    # ---- Crime Types ----
    "CrimeType": r'\b(?:theft|robbery|murder|kidnapping|extortion|fraud|cheating|assault|rape|dacoity|burglary|cybercrime|phishing|hacking|drugs|smuggling|human trafficking|money laundering|forgery|bribery|corruption|arms act|NDPS|POCSO)\b',

    # ---- Digital Evidence ----
    "Device": r'\b(?:iPhone|Samsung|Xiaomi|Redmi|OnePlus|Vivo|Oppo|Realme|Nokia|Motorola|Lava|Micromax|Android|Windows|MacBook|Laptop|Desktop|Tablet)\b',
    "App": r'\b(?:WhatsApp|Telegram|Signal|Instagram|Facebook|Snapchat|Twitter|X|TikTok|YouTube|Gmail|Paytm|PhonePe|Google Pay|GPay)\b',
}

# ==================== EXTRACT FUNCTION ====================

def extract_entities(text: str):
    """Extract all types of entities from raw text."""
    entities = {}

    for etype, pattern in PATTERNS.items():
        try:
            matches = re.findall(pattern, text, re.IGNORECASE)
            cleaned = set()
            for m in matches:
                # Handle tuple results from capture groups
                val = m if isinstance(m, str) else m[0]
                val = val.strip()
                if val and len(val) >= 2:
                    cleaned.add(val)
            if cleaned:
                entities[etype] = list(cleaned)
        except Exception:
            continue

    # Filter false positives for Person
    if "Person" in entities:
        stopwords = {
            "FIR No", "Police Station", "Case No", "Bank Of", "Bank Name",
            "Date Of", "Time Of", "District Court", "High Court", "Supreme Court",
            "Section Of", "Act Of", "Name Of", "Address Of"
        }
        entities["Person"] = [
            p for p in entities["Person"]
            if p not in stopwords and not p.startswith(("The ", "A ", "An "))
        ]
        if not entities["Person"]:
            del entities["Person"]

    # Remove overlaps: Aadhaar-like numbers shouldn't be BankAccount too
    if "Aadhaar" in entities and "BankAccount" in entities:
        aadhaar_set = {a.replace(" ", "") for a in entities["Aadhaar"]}
        entities["BankAccount"] = [
            b for b in entities["BankAccount"] if b not in aadhaar_set
        ]
        if not entities["BankAccount"]:
            del entities["BankAccount"]

    return entities


def extract_relationships(text: str, entities: dict):
    """Link entities that appear in same sentence/line."""
    rels = []
    lines = re.split(r'[.\n]', text)

    for line in lines:
        present = []
        for etype, vals in entities.items():
            for v in vals:
                if v in line:
                    present.append((etype, v))

        # Dedupe within line
        seen = set()
        unique_present = []
        for p in present:
            if p not in seen:
                seen.add(p)
                unique_present.append(p)

        # Link every pair in same line (max 15 to avoid explosion)
        for i in range(min(len(unique_present), 15)):
            for j in range(i + 1, min(len(unique_present), 15)):
                rels.append({
                    "source_type": unique_present[i][0],
                    "source_value": unique_present[i][1],
                    "target_type": unique_present[j][0],
                    "target_value": unique_present[j][1],
                    "relation": "co_occurs_with"
                })

    return rels


# ==================== ENTITY CATEGORIES ====================

ENTITY_CATEGORIES = {
    "People": ["Person", "Alias"],
    "Identity": ["Aadhaar", "PAN", "Passport", "VoterID", "DrivingLicense"],
    "Communication": ["Phone", "Landline", "IMEI", "IMSI", "SIM", "Email", "IPAddress", "MACAddress", "SocialHandle"],
    "Finance": ["BankAccount", "IFSC", "UPI", "CreditCard", "TransactionID", "Bank", "Amount", "Cryptocurrency", "WalletAddress"],
    "Vehicles": ["Vehicle", "ChassisNo", "EngineNo"],
    "Weapons": ["Weapon", "WeaponSerial"],
    "Location": ["Location", "State", "Pincode", "GPS"],
    "Time": ["Date", "Time", "Year"],
    "Legal": ["FIRNumber", "Section", "PoliceStation", "CourtName", "CrimeType"],
    "Digital": ["Device", "App"],
    "Organization": ["Organization"],
}

ALL_ENTITY_TYPES = []
for cat, types in ENTITY_CATEGORIES.items():
    ALL_ENTITY_TYPES.extend(types)