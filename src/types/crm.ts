export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "meeting_scheduled"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";
export type LeadPriority = "low" | "medium" | "high";

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to?: string;
  requirements?: string;
  estimated_value?: number;
  next_follow_up_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  _id: string;
  lead_id: string;
  activity_type: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface FollowUp {
  _id: string;
  lead_id: string;
  due_at: string;
  description: string;
  assigned_to: string;
  status: "pending" | "completed" | "cancelled" | "overdue";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EscalationStatus = "open" | "assigned" | "in_progress" | "resolved";

export interface Escalation {
  _id: string;
  lead_id: string;
  message_id: string;
  reason: string;
  priority: LeadPriority;
  assigned_to: string | null;
  status: EscalationStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface AIAnalysis {
  intent: string;
  priority: LeadPriority;
  sentiment: string;
  summary: string;
  suggested_status: LeadStatus;
  suggested_next_action: string;
  requires_human_escalation: boolean;
  escalation_reason: string | null;
  reply_draft: string;
  confidence: number;
}

export type MessageDirection = "inbound" | "outbound";
export type ReplyDraftStatus = "draft" | "approved";

export interface Message {
  _id: string;
  lead_id: string;
  provider_message_id: string;
  direction: MessageDirection;
  message: string;
  received_at: string;
  created_at: string;
  ai_analysis: AIAnalysis | null;
  reply_draft: string | null;
  reply_status: ReplyDraftStatus;
  reply_approved_at: string | null;
  reply_approved_by: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
