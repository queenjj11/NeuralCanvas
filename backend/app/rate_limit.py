"""Shared slowapi limiter (PRD 8.6: ~30 req/min/IP on /predict)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
