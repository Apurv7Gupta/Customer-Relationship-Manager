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

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
