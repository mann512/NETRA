"""
Suspicious pattern detection engine.
Detects: communication burst, financial splitting, circular flow, shared identity.
"""
import re
from collections import defaultdict


def detect_alerts(case_id, entities, relationships):
    """
    Return list of alert dicts:
    {type, severity, title, description, involved}
    """
    alerts = []

    # Group entities by type
    by_type = defaultdict(list)
    for e in entities:
        by_type[e["type"]].append(e["value"])

    # =============== 1. FINANCIAL SPLITTING ===============
    # Multiple amounts of same value (round numbers) → splitting
    amounts = by_type.get("Amount", [])
    if len(amounts) >= 3:
        # normalize
        norm = defaultdict(int)
        for a in amounts:
            try:
                v = float(str(a).replace(",", ""))
                norm[int(v)] += 1
            except Exception:
                pass
        for amt, count in norm.items():
            if count >= 3 and amt >= 10000:
                alerts.append({
                    "type": "FINANCIAL_SPLITTING",
                    "severity": "HIGH",
                    "title": f"Repeated amount ₹{amt:,} detected {count} times",
                    "description": (
                        f"Same amount ₹{amt:,} appears {count} times in this case. "
                        f"Possible structuring / smurfing to avoid reporting thresholds."
                    ),
                    "involved": [f"Amount: {amt}"],
                })

    # =============== 2. CIRCULAR FINANCIAL FLOW ===============
    # Account A → B → C → A
    account_edges = []
    for r in relationships:
        if r["source_type"] == "BankAccount" and r["target_type"] == "BankAccount":
            account_edges.append((r["source_value"], r["target_value"]))

    if len(account_edges) >= 3:
        # Build adjacency
        adj = defaultdict(set)
        for s, t in account_edges:
            adj[s].add(t)

        # Find cycles of length 3-4
        cycles = []
        for a in adj:
            for b in adj[a]:
                for c in adj[b]:
                    if c in adj and a in adj[c] and a != b and b != c and a != c:
                        trip = tuple(sorted([a, b, c]))
                        if trip not in [tuple(sorted(x)) for x in cycles]:
                            cycles.append([a, b, c])

        for cyc in cycles[:3]:
            alerts.append({
                "type": "CIRCULAR_FLOW",
                "severity": "HIGH",
                "title": f"Circular financial flow detected",
                "description": (
                    f"Funds circulating in a loop: {' → '.join(cyc)} → {cyc[0]}. "
                    f"Classic money laundering pattern."
                ),
                "involved": [f"BankAccount: {c}" for c in cyc],
            })

    # =============== 3. SHARED IDENTITY ===============
    # Same Phone/Aadhaar/Vehicle attached to multiple Persons
    for id_type in ["Phone", "Aadhaar", "Vehicle", "BankAccount"]:
        for r in relationships:
            pass  # individual relationships checked below

    # Count how many Persons each identifier connects to
    id_to_persons = defaultdict(set)
    for r in relationships:
        if r["source_type"] == "Person" and r["target_type"] in ("Phone", "Aadhaar", "Vehicle", "BankAccount"):
            id_to_persons[(r["target_type"], r["target_value"])].add(r["source_value"])
        elif r["target_type"] == "Person" and r["source_type"] in ("Phone", "Aadhaar", "Vehicle", "BankAccount"):
            id_to_persons[(r["source_type"], r["source_value"])].add(r["target_value"])

    for (id_type, id_val), persons in id_to_persons.items():
        if len(persons) >= 2:
            alerts.append({
                "type": "SHARED_IDENTITY",
                "severity": "MEDIUM",
                "title": f"{id_type} {id_val} shared by {len(persons)} persons",
                "description": (
                    f"{id_type} '{id_val}' is linked to multiple persons: "
                    f"{', '.join(persons)}. Possible identity fraud or shared resource."
                ),
                "involved": [f"{id_type}: {id_val}"] + [f"Person: {p}" for p in persons],
            })

    # =============== 4. COMMUNICATION BURST ===============
    # High number of Phone entities per case (proxy for burst)
    phones = by_type.get("Phone", [])
    if len(phones) >= 5:
        # Count relationships to phones
        phone_connections = defaultdict(int)
        for r in relationships:
            if r["target_type"] == "Phone":
                phone_connections[r["target_value"]] += 1
            if r["source_type"] == "Phone":
                phone_connections[r["source_value"]] += 1

        for ph, count in phone_connections.items():
            if count >= 5:
                alerts.append({
                    "type": "COMMUNICATION_BURST",
                    "severity": "MEDIUM",
                    "title": f"Phone {ph} has {count} connections",
                    "description": (
                        f"Phone number {ph} is linked to {count} different entities. "
                        f"Possible coordination hub."
                    ),
                    "involved": [f"Phone: {ph}"],
                })

    # =============== 5. BRIDGE / HUB PERSON ===============
    # Person connecting many different entity types
    person_links = defaultdict(set)
    for r in relationships:
        if r["source_type"] == "Person":
            person_links[r["source_value"]].add(r["target_type"])
        if r["target_type"] == "Person":
            person_links[r["target_value"]].add(r["source_type"])

    for person, types in person_links.items():
        if len(types) >= 5:
            alerts.append({
                "type": "BRIDGE_PERSON",
                "severity": "HIGH",
                "title": f"{person} connects {len(types)} different data types",
                "description": (
                    f"{person} is linked to: {', '.join(sorted(types))}. "
                    f"Structurally important — possible kingpin or coordinator."
                ),
                "involved": [f"Person: {person}"],
            })

    # =============== 6. WEAPON + PERSON CO-OCCURRENCE ===============
    weapons = by_type.get("Weapon", [])
    if weapons:
        for r in relationships:
            if (r["source_type"] == "Weapon" and r["target_type"] == "Person") or \
               (r["target_type"] == "Weapon" and r["source_type"] == "Person"):
                alerts.append({
                    "type": "WEAPON_INVOLVEMENT",
                    "severity": "HIGH",
                    "title": f"Weapon linked to person",
                    "description": (
                        f"Weapon '{r['source_value'] if r['source_type']=='Weapon' else r['target_value']}' "
                        f"associated with "
                        f"{r['target_value'] if r['target_type']=='Person' else r['source_value']}."
                    ),
                    "involved": [f"Weapon & Person in same evidence"],
                })

    # Deduplicate similar alerts
    seen = set()
    unique = []
    for a in alerts:
        key = (a["type"], a["title"])
        if key not in seen:
            seen.add(key)
            unique.append(a)

    return unique