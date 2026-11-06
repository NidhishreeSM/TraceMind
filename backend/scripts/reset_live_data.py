#!/usr/bin/env python3
"""
TraceMind Live Data Reset Utility
Safely removes only live (non-demo) test incidents and their corresponding Hindsight documents.
Preserves all synthetic seed data (INC-DEMO-*) in both database and Hindsight memory bank.

Usage:
    python3 backend/scripts/reset_live_data.py          # Dry-run: lists what would be deleted
    python3 backend/scripts/reset_live_data.py --yes    # Executes deletion
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from backend.app.core.config import settings
from backend.app.models.database import SessionLocal, Incident, Resolution, Analysis, Feedback, init_db
from backend.app.services.hindsight_service import hindsight_service
from backend.app.services.incident_service import generate_next_incident_id


def reset_live_data(execute: bool = False) -> bool:
    print("=" * 80)
    print(" TRACEMIND LIVE DATA RESET UTILITY ")
    print("=" * 80)
    print(f"Target Hindsight Bank: {settings.HINDSIGHT_BANK_ID}")
    print(f"Execution Mode:        {'EXECUTE (--yes)' if execute else 'DRY RUN (preview only)'}")
    print("=" * 80)

    init_db()
    db = SessionLocal()

    # 1. Inspect Hindsight documents
    async def _fetch_docs(client):
        res = await client.documents.list_documents(bank_id=hindsight_service.bank_id, limit=200)
        docs = getattr(res, "items", getattr(res, "documents", []))
        return [
            {
                "id": getattr(d, "id", None),
                "created_at": getattr(d, "created_at", None),
                "units": getattr(d, "memory_unit_count", 0)
            }
            for d in docs
        ]

    all_hindsight_docs = hindsight_service._run_client(_fetch_docs) if hindsight_service.is_configured() else []
    docs_to_delete = [d for d in all_hindsight_docs if d["id"] and not str(d["id"]).startswith("INC-DEMO-")]
    docs_to_preserve = [d for d in all_hindsight_docs if d["id"] and str(d["id"]).startswith("INC-DEMO-")]

    # 2. Inspect Database records
    live_incidents = db.query(Incident).filter(Incident.is_demo == False).all()
    live_ids = [inc.id for inc in live_incidents]
    live_resolutions = db.query(Resolution).filter(Resolution.incident_id.in_(live_ids)).all() if live_ids else []
    live_analyses = db.query(Analysis).filter(Analysis.incident_id.in_(live_ids)).all() if live_ids else []
    live_feedbacks = db.query(Feedback).filter(Feedback.incident_id.in_(live_ids)).all() if live_ids else []

    demo_incidents_count = db.query(Incident).filter(Incident.is_demo == True).count()

    print("\n--- INVENTORY OF ITEMS TO REMOVE ---")
    print(f"Hindsight documents to delete: {len(docs_to_delete)}")
    for d in docs_to_delete:
        print(f"  [Hindsight] Document ID: {d['id']} (units: {d['units']}, created: {d['created_at']})")

    print(f"\nDatabase live incidents to delete: {len(live_incidents)}")
    for inc in live_incidents:
        print(f"  [Database] Incident: {inc.id} | {inc.service} | \"{inc.title}\"")

    print(f"Database live resolutions to delete: {len(live_resolutions)}")
    print(f"Database live analyses to delete:    {len(live_analyses)}")
    print(f"Database live feedbacks to delete:   {len(live_feedbacks)}")

    print("\n--- PRESERVED BENCHMARK SEED DATA ---")
    print(f"Preserved Hindsight demo documents (INC-DEMO-*): {len(docs_to_preserve)}")
    print(f"Preserved Database demo incidents (INC-DEMO-*):  {demo_incidents_count}")

    if not execute:
        print("\n[!] DRY RUN COMPLETE: No changes were made.")
        print("    To perform actual deletion, run with the --yes flag:")
        print("    python3 backend/scripts/reset_live_data.py --yes\n")
        db.close()
        return False

    print("\n" + "=" * 40 + " EXECUTING RESET " + "=" * 40)

    # 3. Delete non-demo documents from Hindsight
    if hindsight_service.is_configured() and docs_to_delete:
        print(f"Deleting {len(docs_to_delete)} document(s) from Hindsight bank '{hindsight_service.bank_id}'...")
        async def _delete_docs(client):
            deleted = []
            for d in docs_to_delete:
                doc_id = d["id"]
                try:
                    await client.documents.delete_document(
                        bank_id=hindsight_service.bank_id,
                        document_id=doc_id
                    )
                    deleted.append(doc_id)
                    print(f"  ✓ Deleted Hindsight document: {doc_id}")
                except Exception as e:
                    print(f"  ✗ Failed to delete Hindsight document {doc_id}: {e}")
            return deleted

        hindsight_service._run_client(_delete_docs)

    # 4. Delete live records from Database
    print(f"\nDeleting live records from database...")
    if live_feedbacks:
        for f in live_feedbacks:
            db.delete(f)
    if live_analyses:
        for a in live_analyses:
            db.delete(a)
    if live_resolutions:
        for r in live_resolutions:
            db.delete(r)
    if live_incidents:
        for inc in live_incidents:
            db.delete(inc)

    db.commit()
    print("  ✓ Database live rows removed successfully.")

    # 5. Verify reset state
    next_id = generate_next_incident_id(db)
    print(f"\nSequence Reset Check: Next incident ID will be: {next_id}")

    stats = hindsight_service.get_memory_stats()
    doc_count = stats.get("total_documents", "N/A")
    print(f"Hindsight Bank Document Count: {doc_count}")

    print("\n" + "=" * 80)
    print(" RESET COMPLETE: Live demo state is now pristine. ")
    print(f" Remaining Hindsight Documents: {doc_count} (Expected: 25)")
    print(f" Next Incident ID:               {next_id} (Expected: INC-001)")
    print("=" * 80)

    db.close()
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset TraceMind live demo data while preserving seed benchmark data.")
    parser.add_argument("--yes", "-y", action="store_true", help="Confirm execution of deletion.")
    args = parser.parse_args()

    reset_live_data(execute=args.yes)

