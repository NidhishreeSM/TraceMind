import logging
import re
import sys
from typing import Any

# Patterns to sanitize in log outputs
SENSITIVE_PATTERNS = [
    (re.compile(r'(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*["\']?([^"\'\s&]+)["\']?'), r'\1="***REDACTED***"'),
    (re.compile(r'gsk_[a-zA-Z0-9_-]+'), 'gsk_***REDACTED***'),
    (re.compile(r'hs_[a-zA-Z0-9_-]+'), 'hs_***REDACTED***'),
    (re.compile(r'postgresql:\/\/[^:]+:([^@]+)@'), 'postgresql://***:***@'),
]


class RedactingFormatter(logging.Formatter):
    """Custom logging formatter that strips API keys, tokens, and passwords."""

    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        sanitized = original
        for pattern, replacement in SENSITIVE_PATTERNS:
            sanitized = pattern.sub(replacement, sanitized)
        return sanitized


def setup_logger(name: str = "tracemind", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        formatter = RedactingFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.propagate = False
    return logger


logger = setup_logger()
