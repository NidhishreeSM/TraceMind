import json
from typing import Dict
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

        # 2. Breakdowns
        severity_rows = db.execute(
            select(Incident.severity, func.count(Incident.id)).group_by(Incident.severity)
        ).all()
        severity_breakdown = {row[0]: row[1] for row in severity_rows}

        service_rows = db.execute(
            select(Incident.service, func.count(Incident.id)).group_by(Incident.service)
        ).all()
        service_breakdown = {row[0]: row[1] for row in service_rows}

        # 3. MTTR & Memory Impact calculation
        # Fetch all resolved incidents with created_at and resolved_at
        resolved_list = db.scalars(
            select(Incident).where(
                Incident.status == "resolved",
                Incident.resolved_at.is_not(None)
            )
        ).all()

        mttr_with_memory = []
        mttr_without_memory = []

        for inc in resolved_list:
            if not inc.resolved_at or not inc.created_at:
                continue
            duration_mins = max(1.0, (inc.resolved_at - inc.created_at).total_seconds() / 60.0)

            # Check if incident had an analysis with use_memory=True
            had_memory_analysis = False
            for an in inc.analyses:
                if an.use_memory:
                    had_memory_analysis = True
                    break

            if had_memory_analysis:
                mttr_with_memory.append(duration_mins)
            else:
                mttr_without_memory.append(duration_mins)

        avg_with = round(sum(mttr_with_memory) / len(mttr_with_memory), 2) if mttr_with_memory else 0.0
        avg_without = round(sum(mttr_without_memory) / len(mttr_without_memory), 2) if mttr_without_memory else 0.0

        time_saved = 0.0
        if avg_without > 0 and avg_with > 0:
            time_saved = round(((avg_without - avg_with) / avg_without) * 100.0, 2)
            if time_saved < 0:
                time_saved = 0.0

        # 4. Recall Hit Rate
        memory_analyses = db.scalars(
            select(Analysis).where(Analysis.use_memory == True)
        ).all()

        recall_hits = 0
        for an in memory_analyses:
            try:
                memories = json.loads(an.recalled_memories_json or "[]")
                if len(memories) > 0:
                    recall_hits += 1
            except Exception:
                pass

        recall_hit_rate = round(recall_hits / len(memory_analyses), 2) if memory_analyses else 0.0

        # 5. Feedback Accept Rate
        total_feedbacks = db.scalar(select(func.count(Feedback.id))) or 0
        accepted_feedbacks = db.scalar(
            select(func.count(Feedback.id)).where(Feedback.feedback_type == "accept")
        ) or 0
        feedback_accept_rate = round(accepted_feedbacks / total_feedbacks, 2) if total_feedbacks > 0 else 0.0

        return AnalyticsSummaryResponse(
            total_incidents=total_incidents,
            open_incidents=open_incidents,
            resolved_incidents=resolved_incidents,
            memory_impact=MemoryImpactMetrics(
                avg_minutes_to_resolve_with_memory=avg_with,
                avg_minutes_to_resolve_without_memory=avg_without,
                time_saved_percentage=time_saved,
                recall_hit_rate=recall_hit_rate,
                feedback_accept_rate=feedback_accept_rate
            ),
            severity_breakdown=severity_breakdown,
            service_breakdown=service_breakdown
        )


analytics_service = AnalyticsService()

