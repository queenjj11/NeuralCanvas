"""NeuralCanvas API.

All routes live under /api. Errors share one shape:
    { "error": { "code": str, "message": str, "details": any } }
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import db
from .config import get_settings
from .model import get_model
from .rate_limit import limiter
from .routes import datasets, health, history, model, predict

settings = get_settings()

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("neuralcanvas")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    get_model()  # fail fast if artifacts are missing
    log.info("model loaded, database ready")
    yield


app = FastAPI(
    title="NeuralCanvas API",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_log(request: Request, call_next):
    request_id = uuid.uuid4().hex[:8]
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - started) * 1000
    log.info(
        "%s %s %s %s %.1fms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    response.headers["X-Request-Id"] = request_id
    return response


def error(status: int, code: str, message: str, details=None) -> JSONResponse:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    # Pydantic puts the original exception object in `ctx`, which is not JSON
    # serialisable, so only the field-level essentials are forwarded.
    details = [
        {
            "loc": [str(part) for part in err.get("loc", [])],
            "msg": err.get("msg", ""),
            "type": err.get("type", ""),
        }
        for err in exc.errors()
    ]
    return error(422, "validation_error", "One or more inputs are invalid.", details)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    codes = {404: "not_found", 422: "validation_error", 405: "method_not_allowed"}
    return error(exc.status_code, codes.get(exc.status_code, "error"), str(exc.detail))


@app.exception_handler(RateLimitExceeded)
async def rate_limited(_: Request, exc: RateLimitExceeded):
    return error(429, "rate_limited", "Too many inferences. Try again in a moment.")


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    log.exception("unhandled error", exc_info=exc)
    return error(500, "internal_error", "Something went wrong on the server.")


for router in (health.router, model.router, predict.router, history.router, datasets.router):
    app.include_router(router, prefix="/api")
