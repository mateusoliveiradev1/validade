import { describe, expect, it } from "vitest";
import {
  classifySyncCommandUrgency,
  deriveOfflineCacheState,
  isCentralBusinessResolution,
  keepsActiveRiskVisibleAfterCentralSync,
  requiresDiscardReason,
  shouldQualifySafetyVerdict,
  sortSyncQueueItems,
} from "./sync";

const referenceTime = "2030-01-10T12:00:00.000Z";

describe("offline sync policy", () => {
  it("derives unavailable when no active task cache was ever prepared", () => {
    expect(
      deriveOfflineCacheState({
        activeTaskCount: 0,
        requiredLotSnippetCount: 12,
        staleAfterHours: 4,
        referenceTime,
      }),
    ).toBe("offline_unavailable");
  });

  it("does not count broad local history as offline readiness", () => {
    expect(
      deriveOfflineCacheState({
        activeTaskCount: 0,
        requiredLotSnippetCount: 99,
        staleAfterHours: 4,
        referenceTime,
      }),
    ).toBe("offline_unavailable");
  });

  it("marks prepared cache as stale after the configured threshold", () => {
    expect(
      deriveOfflineCacheState({
        activeTaskCount: 3,
        requiredLotSnippetCount: 3,
        lastRefreshedAt: "2030-01-10T07:59:59.000Z",
        staleAfterHours: 4,
        referenceTime,
      }),
    ).toBe("offline_stale");
  });

  it("uses offline mode when connectivity is false but task cache is usable", () => {
    expect(
      deriveOfflineCacheState({
        activeTaskCount: 2,
        requiredLotSnippetCount: 2,
        lastRefreshedAt: "2030-01-10T10:00:00.000Z",
        staleAfterHours: 4,
        referenceTime,
        isConnected: false,
      }),
    ).toBe("offline_mode");
  });

  it("marks prepared fresh cache as ready when connectivity is not false", () => {
    expect(
      deriveOfflineCacheState({
        activeTaskCount: 2,
        requiredLotSnippetCount: 2,
        lastRefreshedAt: "2030-01-10T10:00:00.000Z",
        staleAfterHours: 4,
        referenceTime,
        isConnected: null,
      }),
    ).toBe("offline_ready");
  });

  it("classifies safety-critical commands before routine presence updates", () => {
    expect(
      classifySyncCommandUrgency({
        kind: "resolve_task",
        action: "withdraw",
        requiredResolution: "withdraw_or_loss",
        riskState: "expired",
        currentLocation: { kind: "area_de_venda" },
      }),
    ).toBe("critical");
    expect(
      classifySyncCommandUrgency({
        kind: "resolve_task",
        action: "confirm_presence",
        requiredResolution: "check_presence",
        riskState: "uncertain",
        currentLocation: { kind: "estoque" },
      }),
    ).toBe("low");
    expect(
      classifySyncCommandUrgency({
        kind: "request_markdown",
        requiredResolution: "request_markdown",
        riskState: "markdown_due",
      }),
    ).toBe("medium");
    expect(
      classifySyncCommandUrgency({
        kind: "decide_markdown",
        requiredResolution: "approve_markdown",
        riskState: "markdown_due",
      }),
    ).toBe("high");
  });

  it("sorts conflicts before normal pending commands, then by urgency and age", () => {
    const sorted = sortSyncQueueItems([
      {
        id: "pending-high-newer",
        state: "pending_sync",
        urgency: "high",
        createdAt: "2030-01-10T10:00:00.000Z",
      },
      {
        id: "conflict-medium",
        state: "sync_conflict",
        urgency: "medium",
        createdAt: "2030-01-10T11:00:00.000Z",
      },
      {
        id: "pending-critical-oldest",
        state: "pending_sync",
        urgency: "critical",
        createdAt: "2030-01-10T08:00:00.000Z",
      },
      {
        id: "pending-high-oldest",
        state: "pending_sync",
        urgency: "high",
        createdAt: "2030-01-10T09:00:00.000Z",
      },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "conflict-medium",
      "pending-critical-oldest",
      "pending-high-oldest",
      "pending-high-newer",
    ]);
  });

  it("requires discard reasons for terminal or safety-affecting local actions", () => {
    expect(requiresDiscardReason({ kind: "resolve_task", action: "withdraw" })).toBe(true);
    expect(requiresDiscardReason({ kind: "resolve_task", action: "record_loss" })).toBe(true);
    expect(requiresDiscardReason({ kind: "record_markdown_application" })).toBe(true);
    expect(requiresDiscardReason({ kind: "confirm_markdown_on_shelf" })).toBe(true);
    expect(
      requiresDiscardReason({
        kind: "resolve_task",
        action: "complete_recheck",
        requiredResolution: "sales_area_recheck",
      }),
    ).toBe(true);
    expect(
      requiresDiscardReason({
        kind: "resolve_task",
        action: "confirm_presence",
        affectsSalesAreaSafety: true,
      }),
    ).toBe(true);
    expect(
      requiresDiscardReason({
        kind: "resolve_task",
        action: "mark_not_found",
        affectsSalesAreaSafety: false,
      }),
    ).toBe(false);
  });

  it("qualifies safety verdicts for stale cache and pending critical sync", () => {
    expect(shouldQualifySafetyVerdict({ cacheState: "offline_stale" })).toBe(true);
    expect(
      shouldQualifySafetyVerdict({
        cacheState: "offline_ready",
        commands: [{ state: "pending_sync", urgency: "critical" }],
      }),
    ).toBe(true);
    expect(
      shouldQualifySafetyVerdict({
        cacheState: "offline_ready",
        commands: [{ state: "sync_conflict", urgency: "medium" }],
      }),
    ).toBe(true);
    expect(
      shouldQualifySafetyVerdict({
        cacheState: "offline_ready",
        commands: [{ state: "synced", urgency: "critical" }],
      }),
    ).toBe(false);
  });

  it("separates central business resolution from retry, conflict, and active-task ack", () => {
    expect(keepsActiveRiskVisibleAfterCentralSync({ status: "retry", error: "timeout" })).toBe(
      true,
    );
    expect(
      keepsActiveRiskVisibleAfterCentralSync({
        status: "conflict",
        reason: "task changed elsewhere",
      }),
    ).toBe(true);
    expect(
      keepsActiveRiskVisibleAfterCentralSync({
        status: "accepted",
        businessState: "active_task",
      }),
    ).toBe(true);
    expect(
      keepsActiveRiskVisibleAfterCentralSync({
        status: "accepted",
        businessState: "discarded",
      }),
    ).toBe(true);
    expect(
      keepsActiveRiskVisibleAfterCentralSync({
        status: "accepted",
        businessState: "resolved_history",
      }),
    ).toBe(false);
    expect(
      isCentralBusinessResolution({
        status: "accepted",
        businessState: "resolved_history",
      }),
    ).toBe(true);
  });
});
