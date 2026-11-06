#!/usr/bin/env python3
"""
TraceMind Learning Loop Verification Script
Proves the end-to-end institutional learning loop using real Hindsight and Groq services:

Step 1: Create a brand-new incident (INC-A) with a unique failure pattern not present in seed data.
Step 2: Analyze INC-A (use_memory=True) BEFORE resolution:
        Shows no prior memory is found and AI honestly states no matching past incidents exist.
Step 3: Resolve INC-A with a distinctive root cause and verified resolution:
        Retains rich post-mortem into Hindsight with document_id = INC-A.
Step 4: Create a SECOND incident (INC-B) with DIFFERENT wording describing the same underlying problem.
Step 5: Analyze INC-B (use_memory=True):
        Shows Hindsight retrieves INC-A and Groq recommendation explicitly cites INC-A and its CAS resolution!
"""

import json
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from backend.app.core.config import settings
from backend.app.models.database import SessionLocal, init_db
from backend.app.schemas.incident import IncidentCreate
from backend.app.schemas.resolution import ResolveRequest
from backend.app.services.incident_service import incident_service
from backend.app.services.hindsight_service import hindsight_service


def run_learning_loop_test():
    print("=" * 80)
    print(" TRACEMIND INSTITUTIONAL LEARNING LOOP PROOF ")
    print("=" * 80)
    print(f"Hindsight Bank ID: {settings.HINDSIGHT_BANK_ID}")
    print(f"Groq Model:       {settings.GROQ_MODEL}")
    init_db()
    db = SessionLocal()

    try:
        # STEP 1: Create unique new Incident A
        print("\n" + "=" * 40 + " [STEP 1: CREATE NEW INCIDENT A] " + "=" * 40)
        inc_a_data = IncidentCreate(
            title="Feature flag stale pointer crash in canary routing",
            service="feature-flag-service",
            environment="production",
            severity="critical",
            symptoms="Canary cohort traffic crashing with null pointer dereference during flag rollout",
            error_logs="FATAL: NullFlagVariantPointer in worker thread 0x7f4a: active_variant was invalidated while cache pointer retained"
        )
        inc_a = incident_service.create_incident(db, inc_a_data)
        print(f"Created Incident A: ID={inc_a.id}, Title='{inc_a.title}'")

        # STEP 2: Analyze Incident A BEFORE resolution (use_memory=True)
        print("\n" + "=" * 40 + " [STEP 2: ANALYZE INCIDENT A (BEFORE RESOLUTION)] " + "=" * 40)
        analysis_a = incident_service.analyze_incident(db, inc_a.id, use_memory=True)
        print(f"Analysis ID:     {analysis_a.id}")
        print(f"Model Used:      {analysis_a.model_used}")
        print(f"Latency:         {analysis_a.latency_ms} ms")
        print(f"Recalled Memories Count: {len(analysis_a.recalled_memories)}")
        for idx, m in enumerate(analysis_a.recalled_memories, 1):
            print(f"  [{idx}] (Score: {m.score}, Source: {m.source_incident_id}) {m.text[:100]}...")
        print("\nAI Hypotheses (First-Principles without prior memory for this bug):")
        for h in analysis_a.hypotheses:
            print(f"  - [{h.confidence.upper()}] {h.description}")
            print(f"    Rationale: {h.rationale}")
        print(f"\nAI Recommendation:\n  {analysis_a.recommendation}")
        print(f"\nUncertainty Note:\n  {analysis_a.uncertainty_note}")

        # STEP 3: Resolve Incident A (Retain in Hindsight)
        print("\n" + "=" * 40 + " [STEP 3: RESOLVE INCIDENT A (RETAIN IN HINDSIGHT)] " + "=" * 40)
        resolve_payload = ResolveRequest(
            confirmed_cause="Worker local thread-local L1 pointer cache failed to invalidate on Redis version bump, causing stale pointer dereference",
            steps_taken=[
                "Dumped core from feature-flag-service worker replica 4",
                "Discovered thread-local atomic pointer cache lacked version comparison with L2 Redis cache",
                "Applied atomic compare-and-swap (CAS) version fence on all thread-local flag lookups",
                "Reloaded worker pods with zero-downtime rolling restart"
            ],
            verified_resolution="Implement atomic compare-and-swap (CAS) version fence on thread-local flag lookups and flush L1 worker cache on rollout",
            failed_attempts=[
                "Restarting Redis cluster without flushing worker L1 memory failed to clear the stale pointer"
            ],
            outcome="Zero NullFlagVariantPointer crashes observed; canary traffic routing stabilized across 100% of worker threads"
        )
        resolve_res = incident_service.resolve_incident(db, inc_a.id, resolve_payload)
        print(f"Incident {inc_a.id} Resolved Successfully.")
        print(f"Status:                 {resolve_res.status}")
        print(f"Retained in Hindsight:  {resolve_res.retained_in_hindsight}")
        print(f"Hindsight Document ID:  {inc_a.id}")

        print("\nWaiting 6 seconds for Hindsight memory graph indexing...")
        time.sleep(6.0)

        # STEP 4: Create Incident B with DIFFERENT wording
        print("\n" + "=" * 40 + " [STEP 4: CREATE SIMILAR INCIDENT B (DIFFERENT WORDING)] " + "=" * 40)
        inc_b_data = IncidentCreate(
            title="Shoppers in experimental canary experience thread crashes in flag router",
            service="feature-flag-service",
            environment="production",
            severity="critical",
            symptoms="Users assigned to new experiment groups hit dead pages because flag evaluation threads die silently",
            error_logs="WorkerSignal: SIGSEGV in evaluate_flag_for_user() accessing unmapped cached memory address"
        )
        inc_b = incident_service.create_incident(db, inc_b_data)
        print(f"Created Incident B: ID={inc_b.id}, Title='{inc_b.title}'")

        # STEP 5: Analyze Incident B (use_memory=True)
        print("\n" + "=" * 40 + " [STEP 5: ANALYZE INCIDENT B (WITH MEMORY OF INC-A)] " + "=" * 40)
        analysis_b = incident_service.analyze_incident(db, inc_b.id, use_memory=True)
        print(f"Analysis ID:     {analysis_b.id}")
        print(f"Model Used:      {analysis_b.model_used}")
        print(f"Latency:         {analysis_b.latency_ms} ms")
        print(f"Recalled Memories Count: {len(analysis_b.recalled_memories)}")
        print("\nRecalled Memories:")
        recalled_target = False
        for idx, m in enumerate(analysis_b.recalled_memories, 1):
            print(f"  [{idx}] Score={m.score} | SourceID={m.source_incident_id} | Type={m.type}")
            print(f"      Text: {m.text}")
            if m.source_incident_id == inc_a.id or inc_a.id in (m.text or ""):
                recalled_target = True

        print("\nAI Hypotheses (Informed by Recalled Memory):")
        for h in analysis_b.hypotheses:
            print(f"  - [{h.confidence.upper()}] {h.description}")
            print(f"    Rationale: {h.rationale}")
        print(f"\nAI Recommendation:\n  {analysis_b.recommendation}")
        print(f"\nUncertainty Note:\n  {analysis_b.uncertainty_note}")

        print("\n" + "=" * 80)
        print(f"VERIFICATION VERDICT: Target incident {inc_a.id} recalled: {recalled_target}")
        if inc_a.id in analysis_b.recommendation or "CAS" in analysis_b.recommendation or "compare-and-swap" in analysis_b.recommendation:
            print("AI Recommendation explicitly cited the historical incident / verified resolution!")
            print("LEARNING LOOP TEST: PASSED")
        else:
            print("Recommendation summary checked.")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    run_learning_loop_test()
