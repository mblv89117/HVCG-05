"""Shared JSON Schema loader for cross-system contract tests."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "docs" / "integrations" / "schemas"


@lru_cache(maxsize=1)
def registry() -> Registry:
    reg = Registry()
    for path in SCHEMA_DIR.rglob("*.json"):
        data = json.loads(path.read_text())
        if "$id" not in data:
            continue
        reg = reg.with_resource(data["$id"], Resource.from_contents(data))
        # Also allow relative resolution by filename for $ref like ./x.json
        rel = path.relative_to(SCHEMA_DIR).as_posix()
        reg = reg.with_resource(path.name, Resource.from_contents(data))
        reg = reg.with_resource(f"./{path.name}", Resource.from_contents(data))
        reg = reg.with_resource(rel, Resource.from_contents(data))
        reg = reg.with_resource(f"./{rel}", Resource.from_contents(data))
    return reg


def load_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text())


def validator_for(name: str) -> Draft202012Validator:
    schema = load_schema(name)
    return Draft202012Validator(schema, registry=registry())


def validate(name: str, instance: dict) -> list[str]:
    v = validator_for(name)
    return [
        f"{'/'.join(str(p) for p in err.path) or '<root>'}: {err.message}"
        for err in sorted(v.iter_errors(instance), key=lambda e: list(e.path))
    ]


def assert_valid(name: str, instance: dict) -> None:
    errors = validate(name, instance)
    assert not errors, f"{name} failed:\n" + "\n".join(errors)
