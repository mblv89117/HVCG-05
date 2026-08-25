#!/usr/bin/env python3
"""HVCG repository-backed inter-agent communications core."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

MESSAGE_TYPES = {
    "INFO",
    "REQUEST",
    "BLOCKER",
    "DECISION",
    "HANDOFF",
    "CONFLICT",
    "ACK",
    "RESOLVED",
}
PRIORITIES = {"LOW", "NORMAL", "HIGH", "CRITICAL"}
STATUSES = {"NEW", "READ", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REJECTED"}
AGENT_STATUSES = {"IDLE", "IN_PROGRESS", "BLOCKED", "READY", "OFFLINE"}
STALE_MINUTES = 30
DEFAULT_LOCK_TTL_MINUTES = 60

SECRET_PATTERNS = [
    re.compile(r"(?i)(password|passwd|secret|token|api[_-]?key|client[_-]?secret)\s*[:=]\s*\S+"),
    re.compile(r"(?i)bearer\s+[a-z0-9._\-]+"),
    re.compile(r"(?i)eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+"),
]

DEFAULT_AGENTS: Dict[str, Dict[str, Any]] = {
    "master-pm": {
        "displayName": "Master Project Manager",
        "branch": "cursor/master-pm-orchestrator",
        "worktreePath": ".worktrees/master-pm-orchestrator",
        "ownedPaths": [
            "MASTER_*.md",
            "docs/agents/",
            ".agent-comms/",
        ],
        "escalationTarget": "master-pm",
    },
    "crm": {
        "displayName": "CRM Module",
        "branch": "cursor/v1.1.0-intelligence-ai-ops",
        "worktreePath": ".",
        "ownedPaths": [
            "docs/crm/",
            "src/power-apps/crm/",
            "src/power-automate/crm/",
            "src/power-platform/solutions/",
            "scripts/Test-HVCGOpportunityCrmAcceptance.ps1",
        ],
        "escalationTarget": "master-pm",
    },
    "executive": {
        "displayName": "Executive Command Center",
        "branch": "cursor/executive-command-center",
        "worktreePath": ".worktrees/executive-command-center",
        "ownedPaths": ["docs/executive/", "src/power-apps/executive/", "src/power-automate/executive/"],
        "escalationTarget": "master-pm",
    },
    "operations": {
        "displayName": "Operations Hub",
        "branch": "cursor/operations-hub",
        "worktreePath": ".worktrees/operations-hub",
        "ownedPaths": ["docs/operations/", "src/power-apps/operations/", "src/power-automate/operations/"],
        "escalationTarget": "master-pm",
    },
    "finance": {
        "displayName": "Finance Operations",
        "branch": "cursor/finance-operations",
        "worktreePath": ".worktrees/finance-operations",
        "ownedPaths": ["docs/finance/", "src/power-apps/finance/", "src/power-automate/finance/"],
        "escalationTarget": "master-pm",
    },
    "client-portal": {
        "displayName": "Client Portal & Data Rooms",
        "branch": "cursor/client-portal-data-rooms",
        "worktreePath": ".worktrees/client-portal-data-rooms",
        "ownedPaths": ["docs/portal/", "src/power-apps/portal/", "src/power-automate/portal/"],
        "escalationTarget": "master-pm",
    },
    "ai-governance": {
        "displayName": "AI Governance & Work Queues",
        "branch": "cursor/ai-governance-work-queues",
        "worktreePath": ".worktrees/ai-governance-work-queues",
        "ownedPaths": ["docs/ai/", "src/power-apps/ai/", "src/power-automate/ai/"],
        "escalationTarget": "master-pm",
    },
    "integration": {
        "displayName": "Integration",
        "branch": "agent/crm-integration",
        "worktreePath": ".worktrees/crm-integration",
        "ownedPaths": ["docs/crm/PARALLEL_AGENT_MAP.md", "releases/", "deployment/install/"],
        "escalationTarget": "master-pm",
    },
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().strftime("%Y-%m-%dT%H:%M:%SZ")


def find_repo_root(start: Optional[Path] = None) -> Path:
    env = os.environ.get("HVCG_REPO_ROOT")
    if env:
        return Path(env).resolve()
    cur = (start or Path.cwd()).resolve()
    for candidate in [cur, *cur.parents]:
        if (candidate / ".git").exists() or (candidate / ".agent-comms").exists():
            return candidate
    return cur


class CommsError(Exception):
    pass


class AgentComms:
    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root) if root else find_repo_root()
        self.base = self.root / ".agent-comms"
        self.registry_path = self.base / "registry.json"
        self.inbox = self.base / "inbox"
        self.outbox = self.base / "outbox"
        self.archive = self.base / "archive"
        self.locks = self.base / "locks"
        self.events = self.base / "events"
        self.templates = self.base / "templates"
        self.index_path = self.base / "message-index.json"

    # ---- filesystem helpers -------------------------------------------------

    def ensure_dirs(self) -> None:
        for d in (self.base, self.inbox, self.outbox, self.archive, self.locks, self.events, self.templates):
            d.mkdir(parents=True, exist_ok=True)
        for agent_id in DEFAULT_AGENTS:
            (self.inbox / agent_id).mkdir(parents=True, exist_ok=True)
            (self.outbox / agent_id).mkdir(parents=True, exist_ok=True)
            keep_i = self.inbox / agent_id / ".gitkeep"
            keep_o = self.outbox / agent_id / ".gitkeep"
            if not keep_i.exists():
                keep_i.write_text("")
            if not keep_o.exists():
                keep_o.write_text("")
        for name in ("archive", "locks", "events"):
            keep = self.base / name / ".gitkeep"
            if not keep.exists():
                keep.write_text("")

    def _atomic_write_json(self, path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
        tmp_path = Path(tmp_name)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=2, sort_keys=False)
                fh.write("\n")
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp_path, path)
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass

    def _read_json(self, path: Path, default: Any = None) -> Any:
        if not path.exists():
            return default
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def _with_registry_lock(self, fn):
        lock_path = self.base / ".registry.lock"
        self.base.mkdir(parents=True, exist_ok=True)
        deadline = time.time() + 10
        while True:
            try:
                fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                try:
                    os.write(fd, f"{os.getpid()}\n".encode())
                    return fn()
                finally:
                    os.close(fd)
                    try:
                        lock_path.unlink()
                    except OSError:
                        pass
            except FileExistsError:
                if time.time() > deadline:
                    # Stale lock recovery after 10s
                    try:
                        if lock_path.exists() and time.time() - lock_path.stat().st_mtime > 10:
                            lock_path.unlink()
                            continue
                    except OSError:
                        pass
                    raise CommsError("Could not acquire registry lock")
                time.sleep(0.05)

    # ---- bootstrap / registry ----------------------------------------------

    def write_templates(self) -> None:
        templates = {
            "message.json": {
                "messageId": "",
                "threadId": "",
                "timestamp": "",
                "from": "",
                "to": [],
                "cc": [],
                "type": "INFO",
                "priority": "NORMAL",
                "subject": "",
                "body": "",
                "relatedBranch": "",
                "relatedFiles": [],
                "requestedAction": "",
                "dueBy": None,
                "requiresAcknowledgement": True,
                "status": "NEW",
                "replyTo": None,
            },
            "status-update.json": {
                "type": "INFO",
                "priority": "NORMAL",
                "subject": "Status update",
                "body": "Current status: ...",
                "requestedAction": "None",
                "requiresAcknowledgement": False,
            },
            "blocker.json": {
                "type": "BLOCKER",
                "priority": "HIGH",
                "subject": "Blocker: ...",
                "body": "Blocked because ...",
                "requestedAction": "Unblock or decide",
                "requiresAcknowledgement": True,
            },
            "decision-request.json": {
                "type": "DECISION",
                "priority": "HIGH",
                "subject": "Decision needed: ...",
                "body": "Options: A / B. Recommendation: ...",
                "requestedAction": "Choose option",
                "requiresAcknowledgement": True,
            },
            "handoff.json": {
                "type": "HANDOFF",
                "priority": "NORMAL",
                "subject": "Ready for integration",
                "body": "Workstream complete offline. Branch: ... Tests: PASS",
                "requestedAction": "Review and schedule integration",
                "requiresAcknowledgement": True,
            },
        }
        for name, payload in templates.items():
            self._atomic_write_json(self.templates / name, payload)

    def bootstrap(self) -> Dict[str, Any]:
        self.ensure_dirs()
        self.write_templates()
        registry = {
            "version": 1,
            "updatedAt": iso_now(),
            "agents": {},
        }
        for agent_id, meta in DEFAULT_AGENTS.items():
            registry["agents"][agent_id] = self._default_agent_entry(agent_id, meta)
        self._atomic_write_json(self.registry_path, registry)
        if not self.index_path.exists():
            self._atomic_write_json(self.index_path, {"messageIds": []})
        readme = self.base / "README.md"
        if not readme.exists():
            readme.write_text(
                "# Agent Communications\n\n"
                "Repository-backed inter-agent messaging for HVCG Cursor agents.\n\n"
                "See `docs/agents/AGENT_COMMUNICATIONS.md`.\n"
                "Bootstrap: `scripts/agent-comms/bootstrap.sh`\n"
                "Master dashboard: `scripts/agent-comms/master-dashboard.sh`\n",
                encoding="utf-8",
            )
        return registry

    def _default_agent_entry(self, agent_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "agentId": agent_id,
            "displayName": meta["displayName"],
            "branch": meta["branch"],
            "worktreePath": meta["worktreePath"],
            "ownedPaths": list(meta["ownedPaths"]),
            "status": "IDLE",
            "lastHeartbeat": None,
            "inboxPath": f".agent-comms/inbox/{agent_id}",
            "outboxPath": f".agent-comms/outbox/{agent_id}",
            "escalationTarget": meta["escalationTarget"],
        }

    def load_registry(self) -> Dict[str, Any]:
        data = self._read_json(self.registry_path)
        if not data:
            return self.bootstrap()
        return data

    def save_registry(self, registry: Dict[str, Any]) -> None:
        registry["updatedAt"] = iso_now()

        def _write():
            self._atomic_write_json(self.registry_path, registry)

        self._with_registry_lock(_write)

    def register_agent(
        self,
        agent_id: str,
        display_name: Optional[str] = None,
        branch: Optional[str] = None,
        worktree_path: Optional[str] = None,
        owned_paths: Optional[List[str]] = None,
        status: str = "IN_PROGRESS",
        escalation_target: str = "master-pm",
    ) -> Dict[str, Any]:
        if agent_id not in DEFAULT_AGENTS and not re.match(r"^[a-z0-9][a-z0-9-]{1,62}$", agent_id):
            raise CommsError(f"Invalid agentId: {agent_id}")
        if status not in AGENT_STATUSES:
            raise CommsError(f"Invalid status: {status}")
        self.ensure_dirs()
        (self.inbox / agent_id).mkdir(parents=True, exist_ok=True)
        (self.outbox / agent_id).mkdir(parents=True, exist_ok=True)

        def _mutate():
            registry = self._read_json(self.registry_path) or {"version": 1, "agents": {}}
            defaults = DEFAULT_AGENTS.get(agent_id, {})
            existing = registry.get("agents", {}).get(agent_id, {})
            entry = {
                "agentId": agent_id,
                "displayName": display_name or existing.get("displayName") or defaults.get("displayName", agent_id),
                "branch": branch or existing.get("branch") or defaults.get("branch", ""),
                "worktreePath": worktree_path
                or existing.get("worktreePath")
                or defaults.get("worktreePath", ""),
                "ownedPaths": owned_paths
                if owned_paths is not None
                else existing.get("ownedPaths")
                or list(defaults.get("ownedPaths", [])),
                "status": status,
                "lastHeartbeat": iso_now(),
                "inboxPath": f".agent-comms/inbox/{agent_id}",
                "outboxPath": f".agent-comms/outbox/{agent_id}",
                "escalationTarget": escalation_target
                or existing.get("escalationTarget")
                or defaults.get("escalationTarget", "master-pm"),
            }
            registry.setdefault("agents", {})[agent_id] = entry
            registry["updatedAt"] = iso_now()
            self._atomic_write_json(self.registry_path, registry)
            return entry

        return self._with_registry_lock(_mutate)

    def heartbeat(self, agent_id: str, status: Optional[str] = None) -> Dict[str, Any]:
        def _mutate():
            registry = self._read_json(self.registry_path) or {"version": 1, "agents": {}}
            if agent_id not in registry.get("agents", {}):
                raise CommsError(f"Unknown agent: {agent_id}. Run register-agent first.")
            if status:
                if status not in AGENT_STATUSES:
                    raise CommsError(f"Invalid status: {status}")
                registry["agents"][agent_id]["status"] = status
            registry["agents"][agent_id]["lastHeartbeat"] = iso_now()
            registry["updatedAt"] = iso_now()
            self._atomic_write_json(self.registry_path, registry)
            return registry["agents"][agent_id]

        return self._with_registry_lock(_mutate)

    def list_agents(self, include_stale: bool = True) -> List[Dict[str, Any]]:
        registry = self.load_registry()
        agents = []
        for agent in registry.get("agents", {}).values():
            entry = dict(agent)
            entry["stale"] = self.is_stale(agent)
            if include_stale or not entry["stale"]:
                agents.append(entry)
        return sorted(agents, key=lambda a: a["agentId"])

    def is_stale(self, agent: Dict[str, Any]) -> bool:
        if agent.get("status") != "IN_PROGRESS":
            return False
        hb = agent.get("lastHeartbeat")
        if not hb:
            return True
        try:
            ts = datetime.fromisoformat(hb.replace("Z", "+00:00"))
        except ValueError:
            return True
        return (utc_now() - ts).total_seconds() > STALE_MINUTES * 60

    # ---- message index / secrets -------------------------------------------

    def _load_index(self) -> Set[str]:
        data = self._read_json(self.index_path, {"messageIds": []})
        return set(data.get("messageIds", []))

    def _save_index(self, ids: Set[str]) -> None:
        self._atomic_write_json(self.index_path, {"messageIds": sorted(ids)})

    def _reserve_message_id(self, message_id: str) -> None:
        def _mutate():
            ids = self._load_index()
            if message_id in ids:
                raise CommsError(f"Duplicate messageId: {message_id}")
            # Also scan filesystem for safety
            if list(self.base.rglob(f"{message_id}.json")):
                raise CommsError(f"Duplicate messageId on disk: {message_id}")
            ids.add(message_id)
            self._save_index(ids)

        self._with_registry_lock(_mutate)

    def _assert_no_secrets(self, text: str, field: str) -> None:
        for pat in SECRET_PATTERNS:
            if pat.search(text or ""):
                raise CommsError(
                    f"Refusing to store possible secret in '{field}'. "
                    "Never include credentials, tokens, passwords, or client secrets."
                )

    # ---- conflict / ownership ----------------------------------------------

    def _normalize_path(self, p: str) -> str:
        return p.replace("\\", "/").lstrip("./")

    def _path_matches(self, path: str, pattern: str) -> bool:
        path = self._normalize_path(path)
        pattern = self._normalize_path(pattern)
        if pattern.endswith("/"):
            return path == pattern.rstrip("/") or path.startswith(pattern)
        if "*" in pattern:
            # simple glob: prefix*, *suffix, exact segments
            import fnmatch

            return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, pattern.rstrip("/"))
        return path == pattern or path.startswith(pattern.rstrip("/") + "/")

    def owners_for_files(self, files: Sequence[str]) -> Dict[str, List[str]]:
        registry = self.load_registry()
        mapping: Dict[str, List[str]] = {}
        for f in files:
            owners = []
            for agent in registry.get("agents", {}).values():
                for owned in agent.get("ownedPaths", []):
                    if self._path_matches(f, owned):
                        owners.append(agent["agentId"])
                        break
            mapping[f] = owners
        return mapping

    def detect_file_conflicts(self, files: Sequence[str], sender: str) -> List[str]:
        """Return agentIds (excluding sender) that also own any related file."""
        others: Set[str] = set()
        ownership = self.owners_for_files(files)
        for f, owners in ownership.items():
            unique = set(owners)
            if len(unique) > 1 or (unique and sender not in unique and unique):
                others.update(unique - {sender})
            # overlapping owned files across agents
            if len(unique) > 1:
                others.update(unique - {sender})
        # Also flag when same file claimed by multiple agents regardless of sender
        for f, owners in ownership.items():
            if len(set(owners)) > 1:
                others.update(set(owners) - {sender})
        return sorted(others)

    def scan_owned_path_overlaps(self) -> List[Dict[str, Any]]:
        registry = self.load_registry()
        agents = list(registry.get("agents", {}).values())
        conflicts = []
        for i, a in enumerate(agents):
            for b in agents[i + 1 :]:
                for pa in a.get("ownedPaths", []):
                    for pb in b.get("ownedPaths", []):
                        if self._paths_overlap(pa, pb):
                            conflicts.append(
                                {
                                    "pathA": pa,
                                    "pathB": pb,
                                    "agents": [a["agentId"], b["agentId"]],
                                }
                            )
        return conflicts

    def _paths_overlap(self, a: str, b: str) -> bool:
        a = self._normalize_path(a)
        b = self._normalize_path(b)
        if a == b:
            return True
        # Treat directory prefixes as overlapping
        a_dir = a if a.endswith("/") or "*" not in a else a.split("*")[0]
        b_dir = b if b.endswith("/") or "*" not in b else b.split("*")[0]
        if a_dir and b_dir and (a_dir.startswith(b_dir.rstrip("/") ) or b_dir.startswith(a_dir.rstrip("/"))):
            # shared root docs/ is too broad — only flag if one owns prefix of the other with length > 4
            if min(len(a_dir), len(b_dir)) >= 5:
                return a_dir.rstrip("/") == b_dir.rstrip("/") or a.startswith(b.rstrip("/") + "/") or b.startswith(
                    a.rstrip("/") + "/"
                )
        return False

    # ---- messaging ---------------------------------------------------------

    def _message_filename(self, message: Dict[str, Any]) -> str:
        ts = message["timestamp"].replace(":", "").replace("-", "")
        safe_subj = re.sub(r"[^a-zA-Z0-9]+", "-", message.get("subject", "")[:40]).strip("-").lower() or "msg"
        return f"{ts}_{message['messageId'][:8]}_{safe_subj}.json"

    def send_message(
        self,
        from_agent: str,
        to: Sequence[str],
        subject: str,
        body: str,
        msg_type: str = "INFO",
        priority: str = "NORMAL",
        cc: Optional[Sequence[str]] = None,
        related_branch: str = "",
        related_files: Optional[Sequence[str]] = None,
        requested_action: str = "",
        due_by: Optional[str] = None,
        requires_acknowledgement: bool = True,
        thread_id: Optional[str] = None,
        reply_to: Optional[str] = None,
        message_id: Optional[str] = None,
        status: str = "NEW",
    ) -> Dict[str, Any]:
        registry = self.load_registry()
        agents = registry.get("agents", {})
        if from_agent not in agents:
            raise CommsError(f"Unknown sender: {from_agent}")
        to_list = list(to)
        cc_list = list(cc or [])
        for recipient in to_list + cc_list:
            if recipient not in agents:
                raise CommsError(f"Unknown recipient: {recipient}")
        msg_type = msg_type.upper()
        priority = priority.upper()
        status = status.upper()
        if msg_type not in MESSAGE_TYPES:
            raise CommsError(f"Invalid type: {msg_type}")
        if priority not in PRIORITIES:
            raise CommsError(f"Invalid priority: {priority}")
        if status not in STATUSES:
            raise CommsError(f"Invalid status: {status}")

        self._assert_no_secrets(subject, "subject")
        self._assert_no_secrets(body, "body")
        self._assert_no_secrets(requested_action, "requestedAction")

        related_files = list(related_files or [])
        conflict_agents = self.detect_file_conflicts(related_files, from_agent) if related_files else []
        if conflict_agents:
            msg_type = "CONFLICT"
            for extra in ("master-pm", "integration"):
                if extra not in to_list and extra not in cc_list and extra != from_agent:
                    cc_list.append(extra)
            for ca in conflict_agents:
                if ca not in to_list and ca not in cc_list and ca != from_agent:
                    cc_list.append(ca)

        # Auto-escalate BLOCKER / DECISION to master-pm
        if msg_type in {"BLOCKER", "DECISION"}:
            if "master-pm" not in to_list and "master-pm" not in cc_list and from_agent != "master-pm":
                cc_list.append("master-pm")

        # Deduplicate recipients
        to_list = list(dict.fromkeys(to_list))
        cc_list = [c for c in dict.fromkeys(cc_list) if c not in to_list]

        mid = message_id or str(uuid.uuid4())
        tid = thread_id or mid
        message = {
            "messageId": mid,
            "threadId": tid,
            "timestamp": iso_now(),
            "from": from_agent,
            "to": to_list,
            "cc": cc_list,
            "type": msg_type,
            "priority": priority,
            "subject": subject,
            "body": body,
            "relatedBranch": related_branch or "",
            "relatedFiles": related_files,
            "requestedAction": requested_action or "",
            "dueBy": due_by,
            "requiresAcknowledgement": bool(requires_acknowledgement),
            "status": status,
            "replyTo": reply_to,
        }
        if conflict_agents:
            message["conflictWith"] = conflict_agents

        self._reserve_message_id(mid)
        filename = self._message_filename(message)

        # Write to each recipient inbox + sender outbox
        destinations = []
        for recipient in to_list + cc_list:
            destinations.append(self.inbox / recipient / filename)
        destinations.append(self.outbox / from_agent / filename)

        for dest in destinations:
            self._atomic_write_json(dest, message)

        if priority == "CRITICAL":
            event = {
                "eventId": str(uuid.uuid4()),
                "timestamp": iso_now(),
                "kind": "CRITICAL_MESSAGE",
                "messageId": mid,
                "from": from_agent,
                "to": to_list,
                "cc": cc_list,
                "subject": subject,
                "type": msg_type,
            }
            event_name = f"{message['timestamp'].replace(':', '').replace('-', '')}_{mid[:8]}_critical.json"
            self._atomic_write_json(self.events / event_name, event)

        return message

    def _iter_inbox(self, agent_id: str) -> List[Path]:
        folder = self.inbox / agent_id
        if not folder.exists():
            return []
        return sorted([p for p in folder.glob("*.json") if p.is_file()])

    def read_inbox(
        self,
        agent_id: str,
        status_filter: Optional[str] = None,
        mark_read: bool = False,
        unread_only: bool = False,
    ) -> List[Dict[str, Any]]:
        messages = []
        for path in self._iter_inbox(agent_id):
            msg = self._read_json(path)
            if not msg:
                continue
            if status_filter and msg.get("status") != status_filter:
                continue
            if unread_only and msg.get("status") not in {"NEW"}:
                continue
            msg["_path"] = str(path.relative_to(self.root))
            messages.append(msg)
            if mark_read and msg.get("status") == "NEW":
                self._update_message_everywhere(msg["messageId"], {"status": "READ"})
                msg["status"] = "READ"
        return messages

    def find_message_paths(self, message_id: str) -> List[Path]:
        return [p for p in self.base.rglob(f"*{message_id[:8]}*.json") if p.is_file() and "locks" not in p.parts]
        # Broader fallback
        # Actually search by content for safety

    def find_messages_by_id(self, message_id: str) -> List[Tuple[Path, Dict[str, Any]]]:
        found = []
        for path in self.base.rglob("*.json"):
            if path.name in {"registry.json", "message-index.json"}:
                continue
            if "templates" in path.parts:
                continue
            if "locks" in path.parts:
                continue
            try:
                data = self._read_json(path)
            except Exception:
                continue
            if isinstance(data, dict) and data.get("messageId") == message_id:
                found.append((path, data))
        return found

    def _update_message_everywhere(self, message_id: str, updates: Dict[str, Any]) -> int:
        count = 0
        for path, data in self.find_messages_by_id(message_id):
            data.update(updates)
            self._atomic_write_json(path, data)
            count += 1
        if count == 0:
            raise CommsError(f"Message not found: {message_id}")
        return count

    def ack_message(self, agent_id: str, message_id: str, note: str = "") -> Dict[str, Any]:
        matches = self.find_messages_by_id(message_id)
        if not matches:
            raise CommsError(f"Message not found: {message_id}")
        original = matches[0][1]
        self._update_message_everywhere(message_id, {"status": "ACKNOWLEDGED"})
        ack = self.send_message(
            from_agent=agent_id,
            to=[original["from"]],
            subject=f"ACK: {original.get('subject', '')}",
            body=note or f"Acknowledged message {message_id}",
            msg_type="ACK",
            priority=original.get("priority", "NORMAL"),
            thread_id=original.get("threadId"),
            reply_to=message_id,
            requires_acknowledgement=False,
            status="RESOLVED",
        )
        return {"originalStatus": "ACKNOWLEDGED", "ack": ack}

    def reply_message(
        self,
        agent_id: str,
        message_id: str,
        body: str,
        subject: Optional[str] = None,
        msg_type: str = "INFO",
        priority: Optional[str] = None,
        requires_acknowledgement: bool = True,
    ) -> Dict[str, Any]:
        matches = self.find_messages_by_id(message_id)
        if not matches:
            raise CommsError(f"Message not found: {message_id}")
        original = matches[0][1]
        return self.send_message(
            from_agent=agent_id,
            to=[original["from"]],
            subject=subject or f"Re: {original.get('subject', '')}",
            body=body,
            msg_type=msg_type,
            priority=priority or original.get("priority", "NORMAL"),
            thread_id=original.get("threadId"),
            reply_to=message_id,
            related_branch=original.get("relatedBranch", ""),
            related_files=original.get("relatedFiles", []),
            requires_acknowledgement=requires_acknowledgement,
        )

    def resolve_message(self, agent_id: str, message_id: str, resolution: str = "") -> Dict[str, Any]:
        matches = self.find_messages_by_id(message_id)
        if not matches:
            raise CommsError(f"Message not found: {message_id}")
        original = matches[0][1]
        self._update_message_everywhere(message_id, {"status": "RESOLVED", "resolution": resolution})
        resolved = self.send_message(
            from_agent=agent_id,
            to=[original["from"]],
            cc=["master-pm"] if agent_id != "master-pm" and original["from"] != "master-pm" else [],
            subject=f"RESOLVED: {original.get('subject', '')}",
            body=resolution or f"Resolved message {message_id}",
            msg_type="RESOLVED",
            priority=original.get("priority", "NORMAL"),
            thread_id=original.get("threadId"),
            reply_to=message_id,
            requires_acknowledgement=False,
            status="RESOLVED",
        )
        return {"originalStatus": "RESOLVED", "resolved": resolved}

    def archive_resolved(self, agent_id: Optional[str] = None) -> List[str]:
        archived = []
        roots = [self.inbox / agent_id, self.outbox / agent_id] if agent_id else [self.inbox, self.outbox]
        paths: List[Path] = []
        for root in roots:
            if root.exists():
                paths.extend(root.rglob("*.json"))
        day = utc_now().strftime("%Y%m%d")
        dest_dir = self.archive / day
        dest_dir.mkdir(parents=True, exist_ok=True)
        for path in paths:
            if path.name == ".gitkeep":
                continue
            data = self._read_json(path)
            if not isinstance(data, dict):
                continue
            if data.get("status") != "RESOLVED" and data.get("type") not in {"ACK", "RESOLVED"}:
                # Only archive messages explicitly RESOLVED
                if data.get("status") != "RESOLVED":
                    continue
            dest = dest_dir / path.name
            if dest.exists():
                dest = dest_dir / f"{path.stem}_{uuid.uuid4().hex[:6]}{path.suffix}"
            # Move atomically: write then remove (preserve history in archive)
            self._atomic_write_json(dest, data)
            path.unlink()
            archived.append(str(dest.relative_to(self.root)))
        return archived

    # ---- locks -------------------------------------------------------------

    def _lock_path_for(self, lock_id: str) -> Path:
        return self.locks / f"{lock_id}.json"

    def acquire_lock(
        self,
        owner: str,
        paths: Sequence[str],
        reason: str,
        ttl_minutes: int = DEFAULT_LOCK_TTL_MINUTES,
        lock_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        self._assert_no_secrets(reason, "reason")
        paths = [self._normalize_path(p) for p in paths]
        if not paths:
            raise CommsError("Lock requires at least one path")
        self.expire_locks()
        for existing_path in self.locks.glob("*.json"):
            if existing_path.name == ".gitkeep":
                continue
            existing = self._read_json(existing_path)
            if not existing:
                continue
            if existing.get("owner") == owner:
                continue
            for p in paths:
                for ep in existing.get("paths", []):
                    if self._paths_overlap(p, ep) or self._path_matches(p, ep) or self._path_matches(ep, p):
                        raise CommsError(
                            f"Lock collision: path '{p}' held by {existing.get('owner')} "
                            f"(lock {existing.get('lockId')}). Cannot overwrite."
                        )
        lid = lock_id or str(uuid.uuid4())
        now = utc_now()
        exp = datetime.fromtimestamp(now.timestamp() + ttl_minutes * 60, tz=timezone.utc)
        lock = {
            "lockId": lid,
            "owner": owner,
            "paths": paths,
            "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "reason": reason,
            "expiresAt": exp.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        dest = self._lock_path_for(lid)
        if dest.exists():
            raise CommsError(f"Lock id already exists: {lid}")
        # Exclusive create
        fd, tmp_name = tempfile.mkstemp(prefix=".lock.", suffix=".tmp", dir=str(self.locks))
        tmp_path = Path(tmp_name)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(lock, fh, indent=2)
                fh.write("\n")
                fh.flush()
                os.fsync(fh.fileno())
            os.link(tmp_path, dest) if False else None
            # Use O_EXCL via rename only if not exists
            if dest.exists():
                raise CommsError(f"Lock id already exists: {lid}")
            os.replace(tmp_path, dest)
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
        return lock

    def release_lock(self, owner: str, lock_id: str) -> None:
        path = self._lock_path_for(lock_id)
        if not path.exists():
            raise CommsError(f"Lock not found: {lock_id}")
        lock = self._read_json(path)
        if lock.get("owner") != owner:
            raise CommsError(f"Lock {lock_id} owned by {lock.get('owner')}, not {owner}")
        # Archive lock release
        archived = dict(lock)
        archived["releasedAt"] = iso_now()
        archived["releasedBy"] = owner
        arch = self.archive / "locks"
        arch.mkdir(parents=True, exist_ok=True)
        self._atomic_write_json(arch / f"{lock_id}.released.json", archived)
        path.unlink()

    def expire_locks(self) -> List[str]:
        expired = []
        for path in list(self.locks.glob("*.json")):
            lock = self._read_json(path)
            if not lock:
                continue
            exp = lock.get("expiresAt")
            if not exp:
                continue
            try:
                ts = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            except ValueError:
                continue
            if ts < utc_now():
                arch = self.archive / "locks"
                arch.mkdir(parents=True, exist_ok=True)
                lock["expiredAt"] = iso_now()
                self._atomic_write_json(arch / f"{lock['lockId']}.expired.json", lock)
                path.unlink()
                expired.append(lock["lockId"])
        return expired

    def list_locks(self) -> List[Dict[str, Any]]:
        self.expire_locks()
        locks = []
        for path in sorted(self.locks.glob("*.json")):
            data = self._read_json(path)
            if data:
                locks.append(data)
        return locks

    # ---- watch / dashboard -------------------------------------------------

    def watch_inbox(self, agent_id: str, interval: float = 5.0, once: bool = False) -> None:
        seen = {p.name for p in self._iter_inbox(agent_id)}
        print(f"Watching inbox for {agent_id} (poll {interval}s, non-consuming)...", flush=True)
        while True:
            current = {p.name: p for p in self._iter_inbox(agent_id)}
            for name, path in current.items():
                if name not in seen:
                    msg = self._read_json(path)
                    print(json.dumps({"event": "NEW_MESSAGE", "message": msg}, indent=2), flush=True)
                    seen.add(name)
            if once:
                break
            time.sleep(interval)

    def master_dashboard(self) -> Dict[str, Any]:
        registry = self.load_registry()
        agents_view = []
        open_blockers = []
        pending_decisions = []
        conflicts = []
        unacked_critical = []
        handoffs = []

        for agent in sorted(registry.get("agents", {}).values(), key=lambda a: a["agentId"]):
            inbox = self.read_inbox(agent["agentId"])
            unread = [m for m in inbox if m.get("status") == "NEW"]
            agents_view.append(
                {
                    "agentId": agent["agentId"],
                    "displayName": agent.get("displayName"),
                    "status": agent.get("status"),
                    "lastHeartbeat": agent.get("lastHeartbeat"),
                    "stale": self.is_stale(agent),
                    "unread": len(unread),
                }
            )

        # Scan all inboxes for operational signals
        for path in self.inbox.rglob("*.json"):
            msg = self._read_json(path)
            if not isinstance(msg, dict):
                continue
            if msg.get("type") == "BLOCKER" and msg.get("status") not in {"RESOLVED", "REJECTED"}:
                open_blockers.append(msg)
            if msg.get("type") == "DECISION" and msg.get("status") not in {"RESOLVED", "REJECTED"}:
                pending_decisions.append(msg)
            if msg.get("type") == "CONFLICT" and msg.get("status") not in {"RESOLVED", "REJECTED"}:
                conflicts.append(msg)
            if msg.get("priority") == "CRITICAL" and msg.get("requiresAcknowledgement") and msg.get("status") in {
                "NEW",
                "READ",
            }:
                unacked_critical.append(msg)
            if msg.get("type") == "HANDOFF" and msg.get("status") not in {"RESOLVED", "REJECTED"}:
                if "integration" in (msg.get("to") or []) or "ready" in (msg.get("subject", "") + msg.get("body", "")).lower():
                    handoffs.append(msg)

        # Deduplicate by messageId
        def dedupe(items):
            seen = set()
            out = []
            for m in items:
                mid = m.get("messageId")
                if mid in seen:
                    continue
                seen.add(mid)
                out.append(m)
            return out

        return {
            "generatedAt": iso_now(),
            "agents": agents_view,
            "staleAgents": [a["agentId"] for a in agents_view if a["stale"]],
            "openBlockers": dedupe(open_blockers),
            "pendingDecisions": dedupe(pending_decisions),
            "unresolvedConflicts": dedupe(conflicts),
            "unackedCritical": dedupe(unacked_critical),
            "activeLocks": self.list_locks(),
            "readyHandoffs": dedupe(handoffs),
            "ownedPathOverlaps": self.scan_owned_path_overlaps(),
        }

    def broadcast(
        self,
        from_agent: str,
        subject: str,
        body: str,
        msg_type: str = "INFO",
        priority: str = "NORMAL",
        requires_acknowledgement: bool = True,
    ) -> Dict[str, Any]:
        registry = self.load_registry()
        recipients = [a for a in registry.get("agents", {}) if a != from_agent]
        return self.send_message(
            from_agent=from_agent,
            to=recipients,
            subject=subject,
            body=body,
            msg_type=msg_type,
            priority=priority,
            requires_acknowledgement=requires_acknowledgement,
        )

    def request_status_all(self, from_agent: str = "master-pm") -> Dict[str, Any]:
        return self.broadcast(
            from_agent=from_agent,
            subject="Status request",
            body="Please reply with current status, blockers, and next milestone.",
            msg_type="REQUEST",
            priority="NORMAL",
            requires_acknowledgement=True,
        )

    def communications_summary(self) -> str:
        dash = self.master_dashboard()
        lines = [
            f"# Agent Communications Summary ({dash['generatedAt']})",
            "",
            "## Agents",
        ]
        for a in dash["agents"]:
            stale = " STALE" if a["stale"] else ""
            lines.append(
                f"- {a['agentId']}: {a['status']} | hb={a['lastHeartbeat']} | unread={a['unread']}{stale}"
            )
        lines += [
            "",
            f"## Open blockers ({len(dash['openBlockers'])})",
        ]
        for m in dash["openBlockers"]:
            lines.append(f"- [{m['priority']}] {m['from']} → {m['to']}: {m['subject']}")
        lines += ["", f"## Pending decisions ({len(dash['pendingDecisions'])})"]
        for m in dash["pendingDecisions"]:
            lines.append(f"- {m['from']}: {m['subject']}")
        lines += ["", f"## Conflicts ({len(dash['unresolvedConflicts'])})"]
        for m in dash["unresolvedConflicts"]:
            lines.append(f"- {m['subject']} files={m.get('relatedFiles')}")
        lines += ["", f"## Active locks ({len(dash['activeLocks'])})"]
        for lock in dash["activeLocks"]:
            lines.append(f"- {lock['owner']}: {lock['paths']} exp={lock['expiresAt']}")
        lines += ["", f"## Ready handoffs ({len(dash['readyHandoffs'])})"]
        for m in dash["readyHandoffs"]:
            lines.append(f"- {m['from']}: {m['subject']}")
        lines += ["", f"## Unacked CRITICAL ({len(dash['unackedCritical'])})"]
        for m in dash["unackedCritical"]:
            lines.append(f"- {m['from']}: {m['subject']}")
        return "\n".join(lines) + "\n"


def _print_json(data: Any) -> None:
    print(json.dumps(data, indent=2))


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="comms", description="HVCG agent communications")
    p.add_argument("--root", default=None, help="Repository root")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("bootstrap", help="Initialize directories, registry, templates")

    reg = sub.add_parser("register")
    reg.add_argument("--agent-id", required=True)
    reg.add_argument("--display-name")
    reg.add_argument("--branch")
    reg.add_argument("--worktree-path")
    reg.add_argument("--owned-paths", default="", help="Comma-separated")
    reg.add_argument("--status", default="IN_PROGRESS")
    reg.add_argument("--escalation-target", default="master-pm")

    hb = sub.add_parser("heartbeat")
    hb.add_argument("--agent-id", required=True)
    hb.add_argument("--status")

    sub.add_parser("list-agents")

    send = sub.add_parser("send")
    send.add_argument("--from", dest="from_agent", required=True)
    send.add_argument("--to", required=True, help="Comma-separated agent ids")
    send.add_argument("--cc", default="")
    send.add_argument("--subject", required=True)
    send.add_argument("--body", required=True)
    send.add_argument("--type", default="INFO")
    send.add_argument("--priority", default="NORMAL")
    send.add_argument("--related-branch", default="")
    send.add_argument("--related-files", default="")
    send.add_argument("--requested-action", default="")
    send.add_argument("--due-by", default=None)
    send.add_argument("--thread-id", default=None)
    send.add_argument("--reply-to", default=None)
    send.add_argument("--message-id", default=None)
    send.add_argument("--requires-ack", default="true")

    inbox = sub.add_parser("read-inbox")
    inbox.add_argument("--agent-id", required=True)
    inbox.add_argument("--status")
    inbox.add_argument("--unread-only", action="store_true")
    inbox.add_argument("--mark-read", action="store_true")

    ack = sub.add_parser("ack")
    ack.add_argument("--agent-id", required=True)
    ack.add_argument("--message-id", required=True)
    ack.add_argument("--note", default="")

    reply = sub.add_parser("reply")
    reply.add_argument("--agent-id", required=True)
    reply.add_argument("--message-id", required=True)
    reply.add_argument("--body", required=True)
    reply.add_argument("--subject")
    reply.add_argument("--type", default="INFO")
    reply.add_argument("--priority")

    resolve = sub.add_parser("resolve")
    resolve.add_argument("--agent-id", required=True)
    resolve.add_argument("--message-id", required=True)
    resolve.add_argument("--resolution", default="")

    arch = sub.add_parser("archive-resolved")
    arch.add_argument("--agent-id")

    watch = sub.add_parser("watch-inbox")
    watch.add_argument("--agent-id", required=True)
    watch.add_argument("--interval", type=float, default=5.0)
    watch.add_argument("--once", action="store_true")

    lock = sub.add_parser("lock-acquire")
    lock.add_argument("--owner", required=True)
    lock.add_argument("--paths", required=True, help="Comma-separated")
    lock.add_argument("--reason", required=True)
    lock.add_argument("--ttl-minutes", type=int, default=DEFAULT_LOCK_TTL_MINUTES)

    unlock = sub.add_parser("lock-release")
    unlock.add_argument("--owner", required=True)
    unlock.add_argument("--lock-id", required=True)

    sub.add_parser("list-locks")
    sub.add_parser("check-conflicts")
    sub.add_parser("dashboard")
    sub.add_parser("summary")

    bc = sub.add_parser("broadcast")
    bc.add_argument("--from", dest="from_agent", default="master-pm")
    bc.add_argument("--subject", required=True)
    bc.add_argument("--body", required=True)
    bc.add_argument("--type", default="INFO")
    bc.add_argument("--priority", default="NORMAL")
    bc.add_argument("--requires-ack", default="true")

    sub.add_parser("request-status")

    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    comms = AgentComms(Path(args.root) if args.root else None)
    try:
        if args.cmd == "bootstrap":
            _print_json(comms.bootstrap())
        elif args.cmd == "register":
            owned = [x for x in args.owned_paths.split(",") if x.strip()] or None
            _print_json(
                comms.register_agent(
                    args.agent_id,
                    display_name=args.display_name,
                    branch=args.branch,
                    worktree_path=args.worktree_path,
                    owned_paths=owned,
                    status=args.status,
                    escalation_target=args.escalation_target,
                )
            )
        elif args.cmd == "heartbeat":
            _print_json(comms.heartbeat(args.agent_id, status=args.status))
        elif args.cmd == "list-agents":
            _print_json(comms.list_agents())
        elif args.cmd == "send":
            _print_json(
                comms.send_message(
                    from_agent=args.from_agent,
                    to=[x for x in args.to.split(",") if x],
                    cc=[x for x in args.cc.split(",") if x],
                    subject=args.subject,
                    body=args.body,
                    msg_type=args.type,
                    priority=args.priority,
                    related_branch=args.related_branch,
                    related_files=[x for x in args.related_files.split(",") if x],
                    requested_action=args.requested_action,
                    due_by=args.due_by,
                    thread_id=args.thread_id,
                    reply_to=args.reply_to,
                    message_id=args.message_id,
                    requires_acknowledgement=str(args.requires_ack).lower() in {"1", "true", "yes"},
                )
            )
        elif args.cmd == "read-inbox":
            _print_json(
                comms.read_inbox(
                    args.agent_id,
                    status_filter=args.status,
                    mark_read=args.mark_read,
                    unread_only=args.unread_only,
                )
            )
        elif args.cmd == "ack":
            _print_json(comms.ack_message(args.agent_id, args.message_id, note=args.note))
        elif args.cmd == "reply":
            _print_json(
                comms.reply_message(
                    args.agent_id,
                    args.message_id,
                    body=args.body,
                    subject=args.subject,
                    msg_type=args.type,
                    priority=args.priority,
                )
            )
        elif args.cmd == "resolve":
            _print_json(comms.resolve_message(args.agent_id, args.message_id, resolution=args.resolution))
        elif args.cmd == "archive-resolved":
            _print_json({"archived": comms.archive_resolved(args.agent_id)})
        elif args.cmd == "watch-inbox":
            comms.watch_inbox(args.agent_id, interval=args.interval, once=args.once)
        elif args.cmd == "lock-acquire":
            _print_json(
                comms.acquire_lock(
                    args.owner,
                    [x for x in args.paths.split(",") if x],
                    args.reason,
                    ttl_minutes=args.ttl_minutes,
                )
            )
        elif args.cmd == "lock-release":
            comms.release_lock(args.owner, args.lock_id)
            _print_json({"released": args.lock_id})
        elif args.cmd == "list-locks":
            _print_json(comms.list_locks())
        elif args.cmd == "check-conflicts":
            _print_json({"ownedPathOverlaps": comms.scan_owned_path_overlaps()})
        elif args.cmd == "dashboard":
            _print_json(comms.master_dashboard())
        elif args.cmd == "summary":
            print(comms.communications_summary(), end="")
        elif args.cmd == "broadcast":
            _print_json(
                comms.broadcast(
                    args.from_agent,
                    args.subject,
                    args.body,
                    msg_type=args.type,
                    priority=args.priority,
                    requires_acknowledgement=str(args.requires_ack).lower() in {"1", "true", "yes"},
                )
            )
        elif args.cmd == "request-status":
            _print_json(comms.request_status_all())
        else:
            parser.error(f"Unknown command {args.cmd}")
            return 2
        return 0
    except CommsError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
