import asyncio
from concurrent.futures import ThreadPoolExecutor
import re
import time
from typing import Any, Callable, Coroutine, Dict, List, Optional
import hindsight_client
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.analysis import RecalledMemoryItem


def parse_source_incident_id(metadata: Optional[Dict[str, Any]], document_id: Optional[str], text: str) -> Optional[str]:
    """Extracts original incident ID from memory document_id, metadata, or memory text."""
    if document_id and document_id.startswith("INC-"):
        return document_id
    if metadata and isinstance(metadata, dict):
        if metadata.get("incident_id"):
            return str(metadata["incident_id"])
        if metadata.get("document_id") and str(metadata["document_id"]).startswith("INC-"):
            return str(metadata["document_id"])
    match = re.search(r"\b(INC-[A-Za-z0-9\-]+)\b", text or "")
    if match:
        return match.group(1)
    return None


def deduplicate_memories(items: List[RecalledMemoryItem], max_items: int = 8) -> List[RecalledMemoryItem]:
    """Deduplicates memories (e.g., near-identical observation vs fact text), ranks by score descending, returns top max_items."""
    sorted_items = sorted(items, key=lambda x: getattr(x, "score", 0.0) or 0.0, reverse=True)
    deduped: List[RecalledMemoryItem] = []
    seen_normalized: List[str] = []

    for item in sorted_items:
        text = (item.text or "").strip()
        norm = re.sub(r"[^a-z0-9]", "", text.lower())
        if not norm or len(norm) < 10:
            continue

        is_dup = False
        for seen in seen_normalized:
            if norm == seen or norm in seen or seen in norm:
                min_len = min(len(norm), len(seen))
                max_len = max(len(norm), len(seen))
                if min_len / max_len > 0.70:
                    is_dup = True
                    break
        if not is_dup:
            seen_normalized.append(norm)
            deduped.append(item)
            if len(deduped) >= max_items:
                break

    return deduped


class HindsightService:
    """Wrapper around official hindsight-client for TraceMind memory bank operations."""

    def __init__(self):
        self.base_url = settings.HINDSIGHT_BASE_URL.rstrip("/")
        self.api_key = settings.HINDSIGHT_API_KEY
        self.bank_id = settings.HINDSIGHT_BANK_ID

    def is_configured(self) -> bool:
        """Checks if real API key and base URL are configured."""
        return bool(self.api_key and not self.api_key.startswith("your_"))

    def _run_client(self, async_fn: Callable[[hindsight_client.Hindsight], Coroutine[Any, Any, Any]]) -> Any:
        """Runs an async operation against Hindsight using a freshly scoped client in its own event loop.
        Ensures aiohttp client sessions are never cross-polluted across threads or loops."""
        async def _wrapper():
            client = hindsight_client.Hindsight(
                base_url=self.base_url,
                api_key=self.api_key if self.is_configured() else None,
                timeout=60.0
            )
            try:
                return await async_fn(client)
            finally:
                await client.aclose()

        def _in_thread():
            return asyncio.run(_wrapper())

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(_in_thread).result()
        else:
            return asyncio.run(_wrapper())

    def check_health(self) -> Dict[str, Any]:
        """Validates connection to the Hindsight service and bank accessibility."""
        try:
            async def _check(client: hindsight_client.Hindsight):
                version_info = await client.aget_version()
                version_str = getattr(version_info, "api_version", "unknown")

                if not self.is_configured():
                    return {
                        "status": "degraded",
                        "bank_id": self.bank_id,
                        "message": "Hindsight API reachable, but HINDSIGHT_API_KEY is not configured",
                        "version": version_str
                    }

                try:
                    await client.aget_bank_config(self.bank_id)
                    return {
                        "status": "healthy",
                        "bank_id": self.bank_id,
                        "message": "Connected to Hindsight engine and bank is accessible",
                        "version": version_str
                    }
                except Exception as bank_err:
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

            return self._run_client(_check)
        except Exception as e:
            return {
                "status": "unhealthy",
                "bank_id": self.bank_id,
                "message": f"Cannot connect to Hindsight service at {self.base_url}: {str(e)}"
            }

    def list_banks(self) -> List[Dict[str, Any]]:
        """Lists all memory banks visible to the configured API key."""
        if not self.is_configured():
            return []

        async def _list(client: hindsight_client.Hindsight):
            res = await client.banks.list_banks()
            banks_list = []
            for b in getattr(res, "banks", []):
                banks_list.append({
                    "bank_id": getattr(b, "bank_id", ""),
                    "name": getattr(b, "name", "")
                })
            return banks_list

        return self._run_client(_list)

    def ensure_bank(self) -> Dict[str, Any]:
        """Provisions or verifies the memory bank with TraceMind mission & configuration."""
        if not self.is_configured():
            raise ValueError("HINDSIGHT_API_KEY is not configured in environment")

        mission = (
            "TraceMind incident intelligence memory bank. Remember symptoms, system architecture, "
            "error traces, confirmed root causes, investigation dead ends, and verified resolutions "
            "to accelerate future incident mitigation and eliminate recurring outages."
        )

        async def _ensure(client: hindsight_client.Hindsight):
            try:
                await client.acreate_bank(
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
                try:
                    await client.aget_bank_config(self.bank_id)
                    return {"status": "exists", "bank_id": self.bank_id}
                except Exception:
                    raise

        return self._run_client(_ensure)

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

        async def _retain(client: hindsight_client.Hindsight):
            response = await client.aretain(
                bank_id=self.bank_id,
                content=full_content,
                document_id=incident_id,
                metadata=metadata,
                retain_async=False
            )

            is_async = getattr(response, "var_async", False)
            op_id = getattr(response, "operation_id", None)

            if is_async and op_id:
                start = time.time()
                while (time.time() - start) < 25.0:
                    try:
                        op_status = await client.operations.get_operation_status(
                            bank_id=self.bank_id,
                            operation_id=op_id
                        )
                        status_str = getattr(op_status, "status", "").lower()
                        if status_str in ("completed", "done", "success"):
                            break
                        if status_str in ("failed", "error"):
                            logger.warning(f"Async operation {op_id} reported failed status")
                            break
                    except Exception:
                        pass
                    await asyncio.sleep(1.0)

            return {
                "success": getattr(response, "success", True),
                "bank_id": self.bank_id,
                "document_id": incident_id,
                "is_async": is_async,
                "operation_id": op_id
            }

        return self._run_client(_retain)

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

        async def _recall(client: hindsight_client.Hindsight):
            response = await client.arecall(
                bank_id=self.bank_id,
                query=query,
                types=types,
                budget=budget,
                max_tokens=max_tokens
            )

            results: List[RecalledMemoryItem] = []
            for item in getattr(response, "results", []):
                raw_scores = getattr(item, "scores", None)
                final_score = None
                scores_dict = None
                if raw_scores is not None:
                    if hasattr(raw_scores, "final"):
                        final_score = getattr(raw_scores, "final", None)
                        scores_dict = {
                            "final": getattr(raw_scores, "final", None),
                            "semantic": getattr(raw_scores, "semantic", None),
                            "keyword": getattr(raw_scores, "keyword", None),
                            "reranker": getattr(raw_scores, "reranker", None),
                        }
                    elif isinstance(raw_scores, dict):
                        final_score = raw_scores.get("final")
                        scores_dict = raw_scores
                    elif isinstance(raw_scores, (int, float)):
                        final_score = float(raw_scores)

                doc_id = getattr(item, "document_id", None)
                metadata_val = getattr(item, "metadata", None)
                text_val = getattr(item, "text", "")
                src_inc_id = parse_source_incident_id(metadata_val, doc_id, text_val)

                results.append(
                    RecalledMemoryItem(
                        id=getattr(item, "id", None),
                        text=text_val,
                        type=getattr(item, "type", None),
                        source_incident_id=src_inc_id,
                        metadata=metadata_val,
                        score=final_score,
                        scores=scores_dict
                    )
                )
            return results

        return self._run_client(_recall)

    def reflect(self, query: str) -> Optional[str]:
        """Synthesizes high-level reasoning across stored memories."""
        if not self.is_configured():
            return None

        async def _reflect(client: hindsight_client.Hindsight):
            try:
                response = await client.areflect(
                    bank_id=self.bank_id,
                    query=query,
                    budget="low"
                )
                return getattr(response, "text", None) or str(response)
            except Exception as e:
                logger.error(f"Hindsight reflect error: {e}")
                return None

        return self._run_client(_reflect)

    def get_memory_stats(self) -> Dict[str, Any]:
        """Retrieves authentic memory bank statistics from Hindsight API."""
        if not self.is_configured():
            return {"source": "unconfigured"}

        async def _stats(client: hindsight_client.Hindsight):
            raw_stats = await client.banks.get_agent_stats(bank_id=self.bank_id)
            return {
                "source": "hindsight",
                "bank_id": self.bank_id,
                "total_documents": getattr(raw_stats, "total_documents", 0),
                "total_nodes": getattr(raw_stats, "total_nodes", 0),
                "total_observations": getattr(raw_stats, "total_observations", 0),
                "nodes_by_fact_type": getattr(raw_stats, "nodes_by_fact_type", {}),
                "total_links": getattr(raw_stats, "total_links", 0),
                "links_by_link_type": getattr(raw_stats, "links_by_link_type", {}),
                "pending_operations": getattr(raw_stats, "pending_operations", 0),
                "failed_operations": getattr(raw_stats, "failed_operations", 0),
                "last_consolidated_at": getattr(raw_stats, "last_consolidated_at", None),
                "last_memory_write_at": getattr(raw_stats, "last_memory_write_at", None),
            }

        return self._run_client(_stats)

    def close(self):
        """No persistent sessions need closing with the scoped client pattern."""
        pass


hindsight_service = HindsightService()
