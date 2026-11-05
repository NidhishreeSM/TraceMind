import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import groq
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.analysis import AIHypothesis, RecalledMemoryItem


ANALYSIS_SYSTEM_PROMPT = """You are TraceMind's expert AI incident response investigator.
Tagline: "Every incident teaches. Every resolution makes us smarter."

Your job is to analyze live system incidents and synthesize hypotheses, diagnostic steps, and recommendations.
CRITICAL RULES:
1. Every hypothesis MUST be treated and clearly identified as an "AI hypothesis", NEVER as an established or confirmed root cause.
2. If past institutional memories are provided, synthesize those exact historical lessons to avoid repeating past mistakes.
3. If no memories are provided, perform zero-shot first-principles engineering triage.
4. Always provide actionable, safe investigation steps. NEVER recommend dangerous or unverified automatic actions.
5. You MUST respond with a single valid JSON object strictly matching this schema:
{
  "hypotheses": [
    {
      "description": "AI hypothesis: ...",
      "confidence": "high" | "medium" | "low",
      "rationale": "..."
    }
  ],
  "investigation_steps": [
    "Step 1...",
    "Step 2..."
  ],
  "recommendation": "...",
  "uncertainty_note": "..."
}
"""


class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.primary_model = settings.GROQ_MODEL
        self.fallback_model = settings.GROQ_FALLBACK_MODEL
        self._client: Optional[groq.Groq] = None

    def _get_client(self) -> groq.Groq:
        if self._client is None:
            if not self.api_key or self.api_key.startswith("your_"):
                raise ValueError("GROQ_API_KEY is not configured in environment")
            self._client = groq.Groq(api_key=self.api_key, timeout=45.0)
        return self._client

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))

    def _clean_json_response(self, raw_text: str) -> Dict[str, Any]:
        """Robust parser that extracts JSON even if surrounded by markdown or commentary."""
        raw_text = raw_text.strip()
        # Strip code fences if present
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            # Try to locate first '{' and last '}'
            match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            raise

    def analyze_incident(
        self,
        incident_id: str,
        title: str,
        service: str,
        environment: str,
        severity: str,
        symptoms: str,
        error_logs: Optional[str] = None,
        recalled_memories: Optional[List[RecalledMemoryItem]] = None,
        use_memory: bool = True
    ) -> Tuple[Dict[str, Any], str, int]:
        """
        Calls Groq with incident details and optional recalled memories.
        Returns: (parsed_result_dict, model_used, latency_ms)
        """
        start_time = time.time()
        client = self._get_client()

        # Build prompt
        user_prompt_lines = [
            f"Analyze Incident {incident_id}:",
            f"- Title: {title}",
            f"- Service: {service}",
            f"- Environment: {environment}",
            f"- Severity: {severity}",
            f"- Symptoms: {symptoms}",
        ]
        if error_logs:
            user_prompt_lines.append(f"- Observed Error Logs:\n{error_logs}")

        if use_memory and recalled_memories:
            user_prompt_lines.append("\n--- RECALLED INSTITUTIONAL MEMORIES FROM HINDSIGHT ---")
            user_prompt_lines.append("TraceMind has retrieved the following lessons from past incident resolutions:")
            for idx, mem in enumerate(recalled_memories, start=1):
                user_prompt_lines.append(f"Memory #{idx} (Type: {mem.type or 'lesson'}):")
                user_prompt_lines.append(f"  {mem.text}")
                if mem.metadata:
                    user_prompt_lines.append(f"  Metadata: {json.dumps(mem.metadata)}")
            user_prompt_lines.append("\nUse these recalled patterns to inform your hypotheses and recommendations.")
        elif use_memory and not recalled_memories:
            user_prompt_lines.append("\n[Hindsight Memory Note]: No matching past incident memories were found for these symptoms.")
        else:
            user_prompt_lines.append("\n[Memory Disabled]: Analyzing from first principles without institutional memory.")

        user_content = "\n".join(user_prompt_lines)

        messages = [
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ]

        # Try primary model, retry with fallback on failure
        models_to_try = [self.primary_model, self.fallback_model]
        last_error = None

        for model in models_to_try:
            try:
                logger.info(f"Dispatching incident analysis to Groq model: {model}")
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=2048
                )
                raw_content = response.choices[0].message.content or "{}"
                parsed = self._clean_json_response(raw_content)

                # Validate required structure
                hypotheses_raw = parsed.get("hypotheses", [])
                hypotheses = []
                for h in hypotheses_raw:
                    desc = h.get("description", "")
                    if not desc.lower().startswith("ai hypothesis"):
                        desc = f"AI hypothesis: {desc}"
                    hypotheses.append({
                        "description": desc,
                        "confidence": str(h.get("confidence", "medium")).lower(),
                        "rationale": h.get("rationale", "Observed symptom pattern")
                    })

                validated = {
                    "hypotheses": hypotheses or [{
                        "description": "AI hypothesis: Potential runtime exception or resource saturation",
                        "confidence": "medium",
                        "rationale": "Inferred from stated symptoms"
                    }],
                    "investigation_steps": parsed.get("investigation_steps", [
                        "Examine component telemetry and active connections",
                        "Correlate failure timestamps with recent deployments"
                    ]),
                    "recommendation": parsed.get("recommendation", "Review component telemetry before taking remediation action."),
                    "uncertainty_note": parsed.get("uncertainty_note", "Preliminary AI hypothesis; verify with live metrics.")
                }

                latency_ms = int((time.time() - start_time) * 1000)
                return validated, model, latency_ms

            except Exception as e:
                logger.warning(f"Groq call with model {model} failed: {e}. Trying fallback if available.")
                last_error = e

        # If both models fail, degrade gracefully instead of crashing
        latency_ms = int((time.time() - start_time) * 1000)
        logger.error(f"All Groq models failed. Last error: {last_error}")
        return {
            "hypotheses": [{
                "description": "AI hypothesis: Automated analysis degraded due to upstream LLM unavailability",
                "confidence": "low",
                "rationale": f"Groq inference failed: {str(last_error)}"
            }],
            "investigation_steps": [
                "Verify Groq API quota and network access",
                "Check system monitoring dashboards directly"
            ],
            "recommendation": "Perform manual runbook triage while AI connectivity is restored.",
            "uncertainty_note": "AI model was unable to complete full synthesis."
        }, self.primary_model, latency_ms


groq_service = GroqService()
