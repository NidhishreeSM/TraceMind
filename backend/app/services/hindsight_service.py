import time
from typing import Any, Dict, List, Optional
import hindsight_client
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.analysis import RecalledMemoryItem


class HindsightService:
    """Wrapper around official hindsight-client for TraceMind memory bank operations."""

    def __init__(self):
        self.base_url = settings.HINDSIGHT_BASE_URL.rstrip("/")
        self.api_key = settings.HINDSIGHT_API_KEY
        self.bank_id = settings.HINDSIGHT_BANK_ID
        self._client: Optional[hindsight_client.Hindsight] = None

    def _get_client(self) -> hindsight_client.Hindsight:
        """Instantiates or returns cached Hindsight client."""
        if self._client is None:
            self._client = hindsight_client.Hindsight(
                base_url=self.base_url,
                api_key=self.api_key if self.api_key and not self.api_key.startswith("your_") else None,
                timeout=60.0
            )
        return self._client

    def is_configured(self) -> bool:
        """Checks if real API key and base URL are configured."""
        return bool(self.api_key and not self.api_key.startswith("your_"))

    def check_health(self) -> Dict[str, Any]:
        """Validates connection to the Hindsight service and bank accessibility."""
        try:
            client = self._get_client()
            version_info = client.get_version()
            version_str = getattr(version_info, "api_version", "unknown")

            if not self.is_configured():
                return {
                    "status": "degraded",
                    "bank_id": self.bank_id,
                    "message": "Hindsight API reachable, but HINDSIGHT_API_KEY is not configured",
                    "version": version_str
                }

            # If configured, test bank config access
            try:
                client.get_bank_config(self.bank_id)
                return {
                    "status": "healthy",
                    "bank_id": self.bank_id,
                    "message": "Connected to Hindsight engine and bank is accessible",
                    "version": version_str
                }
            except Exception as bank_err:
                # 404 or missing bank is recoverable (bank will be auto-created)
                if "404" in str(bank_err) or "not found" in str(bank_err).lower():
                    return {
                        "status": "healthy",
                        "bank_id": self.bank_id,
                        "message": f"Hindsight reachable; bank {self.bank_id} will be auto-provisioned",
                        "version": version_str
                    }
                return {
                    "status": "degraded",
                    "bank_id": self.bank_id,
                    "message": f"Hindsight reachable, but bank access check failed: {str(bank_err)}"
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "bank_id": self.bank_id,
                "message": f"Cannot connect to Hindsight service at {self.base_url}: {str(e)}"
            }

    def ensure_bank(self) -> Dict[str, Any]:
        """Provisions or verifies the memory bank with TraceMind mission & configuration."""
        if not self.is_configured():
            raise ValueError("HINDSIGHT_API_KEY is not configured in environment")

        client = self._get_client()
        mission = (
            "TraceMind incident intelligence memory bank. Remember symptoms, system architecture, "
            "error traces, confirmed root causes, investigation dead ends, and verified resolutions "
            "to accelerate future incident mitigation and eliminate recurring outages."
        )

        try:
            profile = client.create_bank(
                bank_id=self.bank_id,
                name="TraceMind Incidents",
                mission=mission,
                disposition_skepticism=3,
                disposition_literalism=4,
                disposition_empathy=2,
                enable_observations=True
            )
            logger.info(f"Successfully created Hindsight bank '{self.bank_id}'")
            return {"status": "created", "bank_id": self.bank_id}
        except Exception as e:
            err_msg = str(e)
            if "already exists" in err_msg.lower() or "409" in err_msg:
                logger.info(f"Hindsight bank '{self.bank_id}' already exists")
                return {"status": "exists", "bank_id": self.bank_id}
            logger.warning(f"Failed to create bank '{self.bank_id}': {err_msg}")
            # Try get_bank_config to verify existing bank
            try:
                client.get_bank_config(self.bank_id)
                return {"status": "exists", "bank_id": self.bank_id}
            except Exception:
                raise

    def _poll_operation(self, operation_id: str, timeout_sec: float = 30.0, poll_interval: float = 1.0) -> None:
        """Polls async operation status until completed, failed, or timed out."""
        client = self._get_client()
        start = time.time()
        logger.info(f"Polling async Hindsight operation {operation_id} (timeout={timeout_sec}s)...")

        while (time.time() - start) < timeout_sec:
            try:
                op_status = client.operations.get_operation_status(
                    bank_id=self.bank_id,
                    operation_id=operation_id
                )
                status_str = getattr(op_status, "status", "").lower()
                if status_str in ("completed", "done", "success"):
                    logger.info(f"Async operation {operation_id} completed successfully.")
                    return
                if status_str in ("failed", "error"):
                    err = getattr(op_status, "error_message", "Unknown error")
                    logger.warning(f"Async operation {operation_id} failed: {err}")
                    return
            except Exception as poll_err:
                logger.debug(f"Error checking operation {operation_id}: {poll_err}")

            time.sleep(poll_interval)

        logger.warning(f"Async operation {operation_id} did not finalize within {timeout_sec}s; proceeding.")

    def retain_incident(
        self,
        incident_id: str,
        title: str,
        service: str,
        environment: str,
        symptoms: str,
        confirmed_cause: str,
        verified_resolution: str,
        steps_taken: List[str],
        error_logs: Optional[str] = None,
        failed_attempts: Optional[List[str]] = None,
        outcome: Optional[str] = None,
        is_demo: bool = False
    ) -> Dict[str, Any]:
        """Retains rich post-mortem resolution into Hindsight memory bank."""
        if not self.is_configured():
            raise ValueError("HINDSIGHT_API_KEY is not configured in environment")

        client = self._get_client()

        # Build rich structured document
        content_parts = [
            f"INCIDENT REPORT: {incident_id}",
            f"Title: {title}",
            f"Service: {service} ({environment})",
            f"Symptoms: {symptoms}",
        ]
        if error_logs:
            content_parts.append(f"Observed Logs / Stack Trace:\n{error_logs}")
        content_parts.append(f"Confirmed Root Cause: {confirmed_cause}")
        content_parts.append("Resolution Steps Taken:\n" + "\n".join(f"- {s}" for s in steps_taken))
        content_parts.append(f"Verified Permanent Resolution: {verified_resolution}")

        if failed_attempts:
            content_parts.append("Failed Investigation Attempts / Dead Ends:\n" + "\n".join(f"- {f}" for f in failed_attempts))

        if outcome:
            content_parts.append(f"Observed Post-Resolution Outcome: {outcome}")

        if is_demo:
            content_parts.append("Note: This is verified institutional knowledge from a synthetic demo incident.")

        full_content = "\n\n".join(content_parts)

        metadata = {
            "incident_id": incident_id,
            "service": service,
            "environment": environment,
            "is_demo": str(is_demo).lower(),
            "source": "tracemind"
        }

        # Send to Hindsight retain
        response = client.retain(
            bank_id=self.bank_id,
            content=full_content,
            document_id=incident_id,
            metadata=metadata,
            retain_async=False
        )

        # Check if retain returned async operation
        is_async = getattr(response, "var_async", False)
        op_id = getattr(response, "operation_id", None)
        if is_async and op_id:
            self._poll_operation(op_id, timeout_sec=25.0)

        return {
            "success": getattr(response, "success", True),
            "bank_id": self.bank_id,
            "document_id": incident_id,
            "is_async": is_async,
            "operation_id": op_id
        }

    def recall(
        self,
        query: str,
        types: Optional[List[str]] = None,
        budget: str = "mid",
        max_tokens: int = 4096
    ) -> List[RecalledMemoryItem]:
        """Queries Hindsight memory bank using multi-strategy retrieval."""
        if not self.is_configured():
            logger.warning("Hindsight is not configured; returning empty recall results.")
            return []

        client = self._get_client()

        try:
            response = client.recall(
                bank_id=self.bank_id,
                query=query,
                types=types,
                budget=budget,
                max_tokens=max_tokens
            )

            results: List[RecalledMemoryItem] = []
            for item in getattr(response, "results", []):
                results.append(
                    RecalledMemoryItem(
                        id=getattr(item, "id", None),
                        text=getattr(item, "text", ""),
                        type=getattr(item, "type", None),
                        metadata=getattr(item, "metadata", None),
                        score=getattr(item, "scores", None)
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Hindsight recall error: {e}")
            raise

    def reflect(self, query: str) -> Optional[str]:
        """Synthesizes high-level reasoning across stored memories."""
        if not self.is_configured():
            return None

        client = self._get_client()
        try:
            response = client.reflect(
                bank_id=self.bank_id,
                query=query,
                budget="low"
            )
            return getattr(response, "text", None) or str(response)
        except Exception as e:
            logger.error(f"Hindsight reflect error: {e}")
            return None

    def close(self):
        """Closes HTTP client sessions cleanly."""
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None


hindsight_service = HindsightService()
