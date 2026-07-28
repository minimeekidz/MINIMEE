export const MAX_CHILDREN_PER_PARENT = 3;

export type ChildSubscriptionStatus = "active" | "past_due" | "cancelled" | "read_only";

export type AiVideoJobStatus =
  | "queued"
  | "generating"
  | "qc"
  | "completed"
  | "failed_needs_manual"
  | "resolved";

export type FriendConnectionStatus = "pending_consent" | "connected" | "disconnected";

export interface FriendConnection {
  id: string;
  displayName: string;
  icon: string;
  status: FriendConnectionStatus;
  connectedAt?: string;
  disconnectedAt?: string;
  videoAccess: "none" | "item_by_item";
}

export const productRules = {
  childLogin: "parent-session-only",
  subscriptions: "one-per-child",
  aiFailure: {
    customerMessage: "polite-status-update",
    entitlementState: "reserved-pending-manual-resolution",
    adminAction: "notify-owner-and-create-manual-case"
  },
  friendReconnect: {
    requiresNewQrScan: true,
    requiresNewParentConsent: true,
    restoresPreviousVideoAccess: false,
    disconnectedFriendsUseAlbumQuota: false
  }
} as const;
