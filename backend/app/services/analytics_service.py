import json
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.app.models.database import Incident, Analysis, Feedback
from backend.app.schemas.analytics import AnalyticsSummaryResponse, MemoryImpactMetrics


class AnalyticsService:

    def get_summary(self, db: Session) -> AnalyticsSummaryResponse:
        """Computes live analytics summary strictly derived from actual database records."""
        # 1. Incident Counts
        total_incidents = db.scalar(select(func.count(Incident.id))) or 0
        resolved_incidents = db.scalar(
            select(func.count(Incident.id)).where(Incident.status == "resolved")
        ) or 0
        open_incidents = total_incidents - resolved_incidents

        live_incidents = db.scalar(
            select(func.count(Incident.id)).where(Incident.is_demo == False)
        ) or 0
        demo_incidents = db.scalar(
            select(func.count(Incident.id)).where(Incident.is_demo == True)
        ) or 0

        # 2. Breakdowns
        severity_rows = db.execute(
            select(Incident.severity, func.count(Incident.id)).group_by(Incident.severity)
        ).all()
        severity_breakdown = {row[0]: row[1] for row in severity_rows}

        service_rows = db.execute(
            select(Incident.service, func.count(Incident.id)).group_by(Incident.service)
        ).all()
        service_breakdown = {row[0]: row[1] for row in service_rows}

        # 3. Live MTTR & Memory Impact (LIVE RUNS ONLY: is_demo=False)
        resolved_live = db.scalars(
            select(Incident).where(
                Incident.is_demo == False,
                Incident.status == "resolved",
                Incident.resolved_at.is_not(None)
            )
        ).all()

        live_mttr_with: List[float] = []
        live_mttr_without: List[float] = []

        for inc in resolved_live:
            if not inc.resolved_at or not inc.created_at:
                continue
            duration_mins = max(0.5, (inc.resolved_at - inc.created_at).total_seconds() / 60.0)

            had_memory_analysis = any(a.use_memory for a in inc.analyses)
            if had_memory_analysis:
                live_mttr_with.append(duration_mins)
            else:
                live_mttr_without.append(duration_mins)

        avg_with = round(sum(live_mttr_with) / len(live_mttr_with), 2) if live_mttr_with else None
        avg_without = round(sum(live_mttr_without) / len(live_mttr_without), 2) if live_mttr_without else None

        # Do not compute time_saved_percentage unless BOTH sides have live samples
        time_saved = None
        if avg_with is not None and avg_without is not None and avg_without > 0:
            time_saved = round(((avg_without - avg_with) / avg_without) * 100.0, 2)

        basis = "live_runs" if (live_mttr_with or live_mttr_without) else "insufficient_live_data"

        # 4. Recall Hit Rate (REAL ANALYSES ONLY: use_memory=True)
        memory_analyses = db.scalars(
            select(Analysis).where(Analysis.use_memory == True)
        ).all()

        recall_hit_rate = None
        if memory_analyses:
            hits = 0
            for an in memory_analyses:
                try:
                    memories = json.loads(an.recalled_memories_json or "[]")
                    if len(memories) > 0:
                        hits += 1
                except Exception:
                    pass
            recall_hit_rate = round(hits / len(memory_analyses), 2)
            recall_hit_rate_note = f"Computed from {len(memory_analyses)} live memory analysis call(s) ({hits} hits)"
        else:
            recall_hit_rate_note = "No live memory analyses recorded yet"

        # 5. Feedback Accept Rate
        total_feedbacks = db.scalar(select(func.count(Feedback.id))) or 0
        if total_feedbacks > 0:
            accepted_feedbacks = db.scalar(
                select(func.count(Feedback.id)).where(Feedback.feedback_type == "accept")
            ) or 0
            feedback_accept_rate = round(accepted_feedbacks / total_feedbacks, 2)
        else:
            feedback_accept_rate = None

        # 6. Demo Sample Benchmark (Separated)
        demo_benchmark = None
        if demo_incidents > 0:
            resolved_demo = db.scalars(
                select(Incident).where(
                    Incident.is_demo == True,
                    Incident.status == "resolved",
                    Incident.resolved_at.is_not(None)
                )
            ).all()
            demo_durations = [
                max(1.0, (inc.resolved_at - inc.created_at).total_seconds() / 60.0)
                for inc in resolved_demo if inc.resolved_at and inc.created_at
            ]
            avg_demo = round(sum(demo_durations) / len(demo_durations), 2) if demo_durations else 0.0
            demo_benchmark = {
                "basis": "seeded_sample",
                "total_sample_incidents": demo_incidents,
                "resolved_sample_incidents": len(resolved_demo),
                "avg_sample_resolution_minutes": avg_demo
            }

        return AnalyticsSummaryResponse(
            total_incidents=total_incidents,
            open_incidents=open_incidents,
            resolved_incidents=resolved_incidents,
            live_incidents=live_incidents,
            demo_incidents=demo_incidents,
            memory_impact=MemoryImpactMetrics(
                avg_minutes_to_resolve_with_memory=avg_with,
                avg_minutes_to_resolve_without_memory=avg_without,
                time_saved_percentage=time_saved,
                recall_hit_rate=recall_hit_rate,
                recall_hit_rate_note=recall_hit_rate_note,
                feedback_accept_rate=feedback_accept_rate,
                basis=basis,
                demo_benchmark=demo_benchmark
            ),
            severity_breakdown=severity_breakdown,
            service_breakdown=service_breakdown
        )


analytics_service = AnalyticsService()
