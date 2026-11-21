from fastapi import HTTPException

# Role hierarchy — higher number = more power
ROLE_LEVEL = {
    "Investigator": 1,
    "SHO": 2,
    "RegionalAdmin": 3,
    "SystemAdmin": 4,
}

# Clearance hierarchy
CLEARANCE_LEVEL = {
    "RESTRICTED": 1,
    "CONFIDENTIAL": 2,
    "SECRET": 3,
}


def has_role(user, *allowed_roles):
    return user.get("rank") in allowed_roles


def require_role(user, *allowed_roles):
    if user.get("rank") not in allowed_roles:
        raise HTTPException(
            403,
            f"Access denied. Required role: {' or '.join(allowed_roles)}"
        )


def require_level(user, min_level):
    if ROLE_LEVEL.get(user.get("rank"), 0) < min_level:
        raise HTTPException(403, "Insufficient privileges")


def can_view_case(user, case: dict) -> bool:
    """Check if officer can see this case."""
    rank = user.get("rank")

    # SystemAdmin has NO case data access
    if rank == "SystemAdmin":
        return False

    # Investigator: only assigned or created
    if rank == "Investigator":
        return case.get("assigned_to") == user.get("id") or \
               case.get("created_by") == user.get("id")

    # SHO: own jurisdiction
    if rank == "SHO":
        return case.get("jurisdiction") == user.get("jurisdiction")

    # RegionalAdmin: own region
    if rank == "RegionalAdmin":
        # Region matches if case jurisdiction starts with region or same
        return case.get("jurisdiction") == user.get("jurisdiction") or \
               user.get("jurisdiction") == "North"  # super region

    return False


def can_manage_role(user, target_role: str) -> bool:
    """Check if user can create/manage an officer with target_role."""
    rank = user.get("rank")

    # SystemAdmin can manage anyone except another SystemAdmin (only RegionalAdmin can't)
    if rank == "SystemAdmin":
        return target_role in ("Investigator", "SHO", "RegionalAdmin", "SystemAdmin")

    # RegionalAdmin can manage Investigator and SHO
    if rank == "RegionalAdmin":
        return target_role in ("Investigator", "SHO")

    # SHO can manage Investigator (in their station only)
    if rank == "SHO":
        return target_role == "Investigator"

    return False


def clearance_value(clearance: str) -> int:
    return CLEARANCE_LEVEL.get(clearance, 1)