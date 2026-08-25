"""Production entrypoint: uvicorn atlas_ba_service.app:app

Do not use Python's stdlib http.server.
"""

from __future__ import annotations

import logging
import os

from .config import BaServiceConfigError, load_config


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    try:
        cfg = load_config()
    except BaServiceConfigError as exc:
        raise SystemExit(f"ba_service_config_error: {exc}") from exc

    import uvicorn

    from .app import create_app

    uvicorn.run(
        create_app(cfg),
        host=cfg.host,
        port=cfg.port,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    if os.environ.get("BA_ATLAS_ENV", "").lower() in ("production", "prod"):
        logging.getLogger("atlas_ba_service").info("starting atlas-business-analyst-service")
    main()
