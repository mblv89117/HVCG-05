"""ASGI application: GET /health and POST /dispatch."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from .auth import BaAuthError, authenticate_request
from .config import BaServiceConfig, load_config
from .dispatch import dispatch_request, new_correlation_id

log = logging.getLogger("atlas_ba_service")


def _correlation(request: Request, body: dict[str, Any] | None = None) -> str:
    header = request.headers.get("x-correlation-id") or request.headers.get("x-request-id")
    if header and header.strip():
        return header.strip()[:128]
    if body and isinstance(body.get("correlationId"), str) and body["correlationId"].strip():
        return body["correlationId"].strip()[:128]
    return new_correlation_id()


def _json_error(status_code: int, status: str, message: str, correlation_id: str, **extra: Any) -> JSONResponse:
    payload = {"ok": False, "status": status, "message": message, "correlationId": correlation_id, **extra}
    return JSONResponse(payload, status_code=status_code, headers={"x-correlation-id": correlation_id})


async def health(request: Request) -> Response:
    cfg: BaServiceConfig = request.app.state.cfg
    return JSONResponse(
        {
            "ok": True,
            "service": "atlas-business-analyst",
            "runtime": "cpython-3.11",
            "environment": cfg.atlas_env,
            "persistenceWrites": cfg.persist_writes,
            "localAi": {"enabled": False, "available": False},
            "qbo": {"enabled": False, "available": False},
        }
    )


async def dispatch(request: Request) -> Response:
    cfg: BaServiceConfig = request.app.state.cfg
    correlation = _correlation(request)
    try:
        authenticate_request(
            cfg,
            authorization=request.headers.get("authorization"),
            extra_headers=dict(request.headers),
        )
    except BaAuthError as exc:
        log.info("ba_auth_denied correlation=%s code=%s", correlation, exc.message)
        status = "UNAUTHORIZED" if exc.status_code in (401, 503) else "FORBIDDEN"
        if exc.status_code == 503:
            status = "BA_AUTH_NOT_CONFIGURED"
        return _json_error(exc.status_code, status, exc.message, correlation)

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > cfg.max_body_bytes:
                return _json_error(413, "FORBIDDEN", "request body too large", correlation)
        except ValueError:
            return _json_error(400, "FORBIDDEN", "malformed content-length", correlation)

    raw = await request.body()
    if len(raw) > cfg.max_body_bytes:
        return _json_error(413, "FORBIDDEN", "request body too large", correlation)
    if not raw:
        return _json_error(400, "FORBIDDEN", "malformed_json", correlation)
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _json_error(400, "FORBIDDEN", "malformed_json", correlation)
    if not isinstance(body, dict):
        return _json_error(400, "FORBIDDEN", "malformed_json", correlation)

    correlation = _correlation(request, body)
    try:
        result = await asyncio.to_thread(dispatch_request, cfg, body, correlation)
    except TimeoutError:
        log.info("ba_timeout correlation=%s", correlation)
        return _json_error(504, "BA_TIMEOUT", "dispatch timeout", correlation)
    except Exception:
        log.info("ba_dispatch_error correlation=%s", correlation)
        return _json_error(500, "FORBIDDEN", "internal_error", correlation)

    status_code = 200 if result.get("ok") else 403
    engine_status = str(result.get("status") or "")
    if engine_status in ("UNAUTHORIZED", "MISSING_CONTEXT"):
        status_code = 401
    elif engine_status == "PRODUCTION_GATED":
        status_code = 403
    elif engine_status == "NEEDS_HUMAN":
        status_code = 202
    return JSONResponse(result, status_code=status_code, headers={"x-correlation-id": correlation})


async def _timed_dispatch(request: Request) -> Response:
    cfg: BaServiceConfig = request.app.state.cfg
    try:
        return await asyncio.wait_for(dispatch(request), timeout=cfg.dispatch_timeout_sec)
    except TimeoutError:
        correlation = _correlation(request)
        log.info("ba_timeout correlation=%s", correlation)
        return _json_error(504, "BA_TIMEOUT", "dispatch timeout", correlation)


def create_app(cfg: BaServiceConfig | None = None) -> Starlette:
    resolved = cfg or load_config()
    app = Starlette(
        routes=[
            Route("/health", health, methods=["GET"]),
            Route("/dispatch", _timed_dispatch, methods=["POST"]),
        ]
    )
    app.state.cfg = resolved
    return app