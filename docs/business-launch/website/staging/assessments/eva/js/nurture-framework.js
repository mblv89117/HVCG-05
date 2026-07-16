/**
 * Sprint 4 — Automated nurture trigger framework (staging only).
 * Builds trigger plans; NEVER sends email/SMS. BL-C1 remains BLOCKED.
 */
window.HVCG_EVA_NURTURE = (function () {
  const VERSION = "nurture-plan-1.0.0";

  const TEMPLATES = {
    educate_day0: {
      id: "educate_day0",
      channel: "email",
      offset_hours: 0,
      subject: "Your HVCG Enterprise Value Assessment summary",
      purpose: "Deliver report link + next-step framing",
    },
    educate_day3: {
      id: "educate_day3",
      channel: "email",
      offset_hours: 72,
      subject: "Capital readiness checklist",
      purpose: "Document checklist nudge",
    },
    warm_day1: {
      id: "warm_day1",
      channel: "email",
      offset_hours: 24,
      subject: "Strategy session availability",
      purpose: "Invite to request Strategy Session (staging capture)",
    },
    warm_day7: {
      id: "warm_day7",
      channel: "email",
      offset_hours: 168,
      subject: "Follow-up on your assessment",
      purpose: "Soft re-engage if no session request",
    },
    hot_internal_0: {
      id: "hot_internal_0",
      channel: "internal",
      offset_hours: 0,
      subject: "Hot lead — internal sales alert",
      purpose: "Notify internal queue only (no prospect send)",
    },
    legacy_block: {
      id: "legacy_block",
      channel: "internal",
      offset_hours: 0,
      subject: "Legacy guard BLOCK — do not nurture as new HVCG",
      purpose: "Internal halt",
    },
  };

  function buildPlan(conversion, fullPayload) {
    const lead = (conversion && conversion.lead_qualification) || {};
    const guard =
      (fullPayload && fullPayload.eva && fullPayload.eva.legacy_guard) || "PASS";
    const temp = lead.lead_temperature || "Nurture";

    let sequenceId = "educate_default";
    let triggers = [TEMPLATES.educate_day0, TEMPLATES.educate_day3];

    if (guard === "BLOCK") {
      sequenceId = "legacy_halt";
      triggers = [TEMPLATES.legacy_block];
    } else if (temp === "Hot") {
      sequenceId = "hot_internal_then_manual";
      triggers = [TEMPLATES.hot_internal_0, TEMPLATES.warm_day1];
    } else if (temp === "Warm") {
      sequenceId = "warm_strategy";
      triggers = [TEMPLATES.warm_day1, TEMPLATES.warm_day7];
    }

    const planned = triggers.map((t, i) => ({
      sequence_index: i,
      trigger_id: t.id,
      channel: t.channel,
      offset_hours: t.offset_hours,
      subject: t.subject,
      purpose: t.purpose,
      fire_status: "PLANNED_NOT_SENT",
      send_allowed: false,
      gate: t.channel === "internal" ? "INTERNAL_OK_STAGING" : "BL-C1_BLOCKED",
    }));

    return {
      plan_version: VERSION,
      sequence_id: sequenceId,
      enrollment_status: "STAGING_PLAN_ONLY",
      outbound_enabled: false,
      bl_c1_gate: "BLOCKED",
      lead_temperature: temp,
      legacy_guard: guard,
      triggers: planned,
      next_owner_decision: "Approve BL-C1 (or keep blocked) before any prospect send",
      disclaimer:
        "Nurture framework plans sequences only. No email or SMS is sent from this staging build.",
    };
  }

  function canFire(trigger) {
    if (!trigger) return { allowed: false, reason: "missing_trigger" };
    if (trigger.channel === "internal") {
      return { allowed: true, reason: "internal_staging_log_only", send: false };
    }
    return { allowed: false, reason: "BL-C1_BLOCKED", send: false };
  }

  return { VERSION, TEMPLATES, buildPlan, canFire };
})();
