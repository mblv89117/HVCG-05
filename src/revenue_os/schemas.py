"""Validate payloads against Integration SoT and Revenue-owned schemas."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from .paths import INTEGRATION_SCHEMAS, REVENUE_SCHEMAS


@lru_cache(maxsize=1)
def registry() -> Registry:
    reg = Registry()
    for schema_dir in (INTEGRATION_SCHEMAS, REVENUE_SCHEMAS):
        if not schema_dir.exists():
            continue
        for path in schema_dir.rglob("*.json"):
            data = json.loads(path.read_text(encoding="utf-8"))
            if "$id" not in data:
                continue
            resource = Resource.from_contents(data)
            reg = reg.with_resource(data["$id"], resource)
            rel = path.relative_to(schema_dir).as_posix()
            for alias in (path.name, f"./{path.name}", rel, f"./{rel}"):
                reg = reg.with_resource(alias, resource)
    return reg


def load_schema(name: str) -> dict[str, Any]:
    for schema_dir in (INTEGRATION_SCHEMAS, REVENUE_SCHEMAS):
        candidate = schema_dir / name
        if candidate.exists():
            return json.loads(candidate.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"schema not found: {name}")


def validate(name: str, instance: dict[str, Any]) -> list[str]:
    schema = load_schema(name)
    validator = Draft202012Validator(schema, registry=registry())
    return [
        f"{'/'.join(str(p) for p in err.path) or '<root>'}: {err.message}"
        for err in sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    ]


def assert_valid(name: str, instance: dict[str, Any]) -> dict[str, Any]:
    errors = validate(name, instance)
    if errors:
        raise ValueError(f"{name} failed:\n" + "\n".join(errors))
    return instance
