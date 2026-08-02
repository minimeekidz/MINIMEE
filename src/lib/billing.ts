import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { PlanType } from "./plans";

export type SubscriptionStatus = "active" | "past_due" | "expired" | "cancelled" | "read_only";
export type EntitlementStatus = "available" | "reserved" | "consumed" | "refunded";
export type JobStatus = "queued" | "processing" | "completed" | "failed";
export type VideoType = "learning_video" | "child_ai_video";

export interface SubscriptionRecord {
  id: string;
  child_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  theme_allowance: number;
  started_at: string;
  current_period_end: string | null;
  read_only_until: string | null;
  cancel_at_period_end: boolean;
}

export interface EntitlementRecord {
  id: string;
  subscription_id: string;
  sequence_number: number;
  status: EntitlementStatus;
  consumed_at: string | null;
}

export interface JobRecord {
  id: string;
  entitlement_id: string;
  video_type: VideoType;
  status: JobStatus;
  asset_url: string | null;
  customer_message: string | null;
}

// Mirrors supabase/functions/_shared/release.ts: sequence 1 releases at
// subscription start, each later sequence 14 days after the previous one
// (每兩星期一個主題). Kept in sync by hand — the Edge Function is the
// authority, this copy only decides what the parent sees as unlocked.
export function themeReleaseAt(startedAt: string, sequenceNumber: number): Date {
  const releaseDate = new Date(startedAt);
  releaseDate.setUTCDate(releaseDate.getUTCDate() + (sequenceNumber - 1) * 14);
  return releaseDate;
}

export interface ThemeSlot {
  entitlement: EntitlementRecord;
  releaseAt: Date;
  released: boolean;
  jobs: JobRecord[];
  /** True once both jobs exist and have finished successfully. */
  ready: boolean;
  /** True when any job for this theme needs operator follow-up. */
  failed: boolean;
}

export interface ChildBilling {
  loading: boolean;
  error: string | null;
  subscription: SubscriptionRecord | null;
  themes: ThemeSlot[];
  refresh: () => Promise<void>;
}

// Loads everything the parent-facing commerce pages need for one child, all
// of it behind RLS (`parent_id = auth.uid()`), so a parent can never read
// another family's billing state even if a child id is guessed.
export function useChildBilling(childId: string | undefined): ChildBilling {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!childId || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [subscriptionResult, entitlementResult, jobResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, child_id, plan_type, status, theme_allowance, started_at, current_period_end, read_only_until, cancel_at_period_end")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("theme_entitlements")
        .select("id, subscription_id, sequence_number, status, consumed_at")
        .eq("child_id", childId)
        .order("sequence_number", { ascending: true }),
      supabase
        .from("ai_video_jobs")
        .select("id, entitlement_id, video_type, status, asset_url, customer_message")
        .eq("child_id", childId),
    ]);

    const failure = subscriptionResult.error ?? entitlementResult.error ?? jobResult.error;
    if (failure) {
      console.error("Unable to load MINIMEE billing state", failure.message);
      setError("未能載入訂閱資料，請重新整理。");
    } else {
      setSubscription((subscriptionResult.data ?? null) as SubscriptionRecord | null);
      setEntitlements((entitlementResult.data ?? []) as EntitlementRecord[]);
      setJobs((jobResult.data ?? []) as JobRecord[]);
      setError(null);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const themes = useMemo<ThemeSlot[]>(() => {
    if (!subscription) return [];
    const now = Date.now();
    return entitlements
      .filter(entitlement => entitlement.subscription_id === subscription.id)
      .map(entitlement => {
        const releaseAt = themeReleaseAt(subscription.started_at, entitlement.sequence_number);
        const themeJobs = jobs.filter(job => job.entitlement_id === entitlement.id);
        return {
          entitlement,
          releaseAt,
          released: releaseAt.getTime() <= now,
          jobs: themeJobs,
          ready: themeJobs.length === 2 && themeJobs.every(job => job.status === "completed"),
          failed: themeJobs.some(job => job.status === "failed"),
        };
      });
  }, [entitlements, jobs, subscription]);

  return { loading, error, subscription, themes, refresh };
}
