#!/usr/bin/env python3
"""
TraceMind Hindsight Real Service Smoke Test
Validates connection, retain, and recall operations against the real Hindsight memory service.

Step 1 [RETAIN]: Retains INC-DEMO-001 (Payment API, Production; connection pool exhaustion)
Step 2 [RECALL]: Queries with different semantic wording to prove associative memory retrieval
"""

import os
import sys
import json
from pathlib import Path

# Add project root to PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.hindsight_service import hindsight_service


def run_smoke_test():
    print("=" * 80)
    print(" TRACEMIND HINDSIGHT REAL SERVICE SMOKE TEST ")
    print("=" * 80)
    print(f"Target Hindsight Base URL: {settings.HINDSIGHT_BASE_URL}")
    print(f"Target Memory Bank ID:     {settings.HINDSIGHT_BANK_ID}")

    # Check credentials
    if not settings.HINDSIGHT_API_KEY or settings.HINDSIGHT_API_KEY.startswith("your_"):
        print("\n[!] FATAL CREDENTIAL ERROR: HINDSIGHT_API_KEY is missing or set to placeholder.")
        print("    To run this smoke test against the live Hindsight service:")
        print("    1. Create a .env file in the repository root (copied from .env.example)")
        print("    2. Set HINDSIGHT_API_KEY to your valid Vectorize / Hindsight API key")
        print("    3. Re-run: python3 backend/scripts/hindsight_smoke_test.py\n")
        sys.exit(1)

    print(f"API Key detected:          {settings.HINDSIGHT_API_KEY[:4]}...{settings.HINDSIGHT_API_KEY[-4:]}")

    # 1. Health check & version
    print("\n--- [PRE-FLIGHT] Checking Hindsight Connectivity ---")
    health = hindsight_service.check_health()
    print("Health Status:", json.dumps(health, indent=2))
    if health.get("status") == "unhealthy":
        print(f"\n[!] Cannot reach Hindsight service: {health.get('message')}")
        sys.exit(2)

    # 2. Provision Bank
    print("\n--- [STEP 0] Ensuring Memory Bank Exists ---")
    try:
        bank_res = hindsight_service.ensure_bank()
        print(f"Bank ensured: {bank_res}")
    except Exception as e:
        print(f"[!] Bank initialization failed: {e}")
        sys.exit(3)

    # 3. Retain sample incident
    print("\n" + "=" * 40 + " [STEP 1: RETAIN] " + "=" * 40)
    incident_id = "INC-SMOKE-001"
    print(f"Retaining sample incident: {incident_id}")
    print("  Service:             payment-api")
    print("  Environment:         production")
    print("  Symptoms:            DB connection pool exhausted, connection timeouts")
    print("  Confirmed Cause:     incorrect connection cleanup in payment processing transactions")
    print("  Verified Resolution: fix cleanup logic with robust context managers and adjust pool max_overflow and pool_size config")
    print("  Label:               SAMPLE/DEMO DATA (is_demo=True)")

    try:
        retain_result = hindsight_service.retain_incident(
            incident_id=incident_id,
            title="Payment API connection pool exhausted under checkout traffic",
            service="payment-api",
            environment="production",
            symptoms="DB connection pool exhausted, connection timeouts, HTTP 504 on checkout",
            confirmed_cause="Incorrect connection cleanup: transaction rollback branch leaked open connections",
            verified_resolution="Fix cleanup logic using explicit context managers and adjust pool max_overflow to 20 and pool_size to 30",
            steps_taken=[
                "Inspected database active connections using pg_stat_activity",
                "Identified leaked sessions in payment processing transaction handler",
                "Wrapped DB session acquisition in try...finally context manager",
                "Adjusted connection pool configuration to tolerate burst traffic"
            ],
            error_logs="ERROR: sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00",
            failed_attempts=[
                "Restarted payment pod replicas (connections exhausted again in 3 minutes)"
            ],
            outcome="Connection count stabilized below 12; zero connection timeout errors observed",
            is_demo=True
        )
        print("\n[STEP 1: RETAIN SUCCESSFUL]")
        print("Retain Output Data:")
        print(json.dumps(retain_result, indent=2))
    except Exception as e:
        print(f"\n[!] [STEP 1: RETAIN FAILED]: {e}")
        sys.exit(4)

    # 4. Recall with DIFFERENT wording
    print("\n" + "=" * 40 + " [STEP 2: RECALL] " + "=" * 40)
    query = "Payment requests are failing because database connections remain unavailable. Have we seen a similar service issue, and what fixed it?"
    print(f"Recall Query: '{query}'")

    try:
        recalled_items = hindsight_service.recall(query=query, budget="mid", max_tokens=2048)
        print(f"\n[STEP 2: RECALL SUCCESSFUL] Found {len(recalled_items)} matching memory items:")

        for i, item in enumerate(recalled_items, start=1):
            print(f"\n--- Result #{i} ---")
            print(f"Memory ID:   {item.id}")
            print(f"Memory Type: {item.type}")
            print(f"Score:       {item.score}")
            print(f"Metadata:    {json.dumps(item.metadata, indent=2)}")
            print("Extracted Memory Text:")
            print(f"  {item.text}")

        if not recalled_items:
            print("\n[NOTE] Recall query returned 0 items. In asynchronous extraction mode, Hindsight background")
            print("       consolidation may take a brief moment. Please wait ~5 seconds and re-run.")
    except Exception as e:
        print(f"\n[!] [STEP 2: RECALL FAILED]: {e}")
        sys.exit(5)

    print("\n" + "=" * 80)
    print(" SMOKE TEST COMPLETE ")
    print("=" * 80)
    hindsight_service.close()


if __name__ == "__main__":
    run_smoke_test()

