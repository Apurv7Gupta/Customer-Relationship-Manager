import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type {
  Lead,
  Activity,
  FollowUp,
  Message,
  PaginatedResponse,
} from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { UserRole, type User } from "@/types/auth";
import { Sidebar } from "@/components/SideBar";

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [approvingMessageId, setApprovingMessageId] = useState<string | null>(
    null,
  );

  const [newStatus, setNewStatus] = useState<string>("");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [followUpDesc, setFollowUpDesc] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");

  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const fetchLeadData = async () => {
    try {
      const [leadRes, actRes, folRes] = await Promise.all([
        api.get<Lead>(`/api/leads/${id}`),
        api.get<PaginatedResponse<Activity>>("/api/activities", {
          params: { lead_id: id },
        }),
        api.get<PaginatedResponse<FollowUp>>("/api/followups", {
          params: { assigned_to: "" },
        }),
      ]);
      setLead(leadRes.data);
      setNewStatus(leadRes.data.status);
      setNewAssignee(leadRes.data.assigned_to || "");
      setActivities(actRes.data.data);
      setFollowups(folRes.data.data.filter((f) => f.lead_id === id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }

    try {
      const messageRes = await api.get<PaginatedResponse<Message>>(
        "/api/messages",
        { params: { lead_id: id, page_size: 100 } },
      );
      setMessages(messageRes.data.data);
      setConversationError(null);
    } catch {
      setConversationError(
        "The conversation timeline is unavailable. Lead details remain available.",
      );
    }
  };

  const fetchUsers = async () => {
    if (hasRole([UserRole.OWNER, UserRole.SALES_MANAGER])) {
      try {
        const res = await api.get<User[]>("/api/users");
        setUsers(res.data.filter((u) => u.role === UserRole.SALES_EXECUTIVE));
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    }
  };

  useEffect(() => {
    fetchLeadData();
    fetchUsers();
  }, [id]);

  const updateStatus = async () => {
    await api.patch(`/api/leads/${id}`, { status: newStatus });
    fetchLeadData();
  };

  const updateAssignee = async () => {
    await api.patch(`/api/leads/${id}`, { assigned_to: newAssignee });
    fetchLeadData();
  };

  const deleteLead = async () => {
    if (
      window.confirm("Are you sure you want to permanently delete this lead?")
    ) {
      try {
        await api.delete(`/api/leads/${id}`);
        navigate("/leads");
      } catch (error) {
        console.error("Failed to delete lead", error);
      }
    }
  };

  const createFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDesc || !followUpDate) return;
    await api.post("/api/followups", {
      lead_id: id,
      description: followUpDesc,
      due_at: new Date(followUpDate).toISOString(),
      assigned_to: lead?.assigned_to,
    });
    setFollowUpDesc("");
    setFollowUpDate("");
    fetchLeadData();
  };

  const approveReplyDraft = async (messageId: string) => {
    setApprovingMessageId(messageId);
    setConversationError(null);
    try {
      const response = await api.patch<Message>(`/api/messages/${messageId}`, {
        approved: true,
      });
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message._id === messageId ? response.data : message,
        ),
      );
    } catch (error) {
      console.error(error);
      setConversationError(
        "Unable to approve the reply draft. Please try again.",
      );
    } finally {
      setApprovingMessageId(null);
    }
  };

  if (loading) return <div className="p-8">Loading details...</div>;
  if (!lead) return <div className="p-8 text-red-500">Lead not found.</div>;

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      <div className="max-w-5xl mx-auto mt-8 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-700 border border-gray-300 rounded shadow-sm hover:bg-blue-800"
                >
                  &larr;
                </button>
                <h2 className="text-2xl font-bold">{lead.name}</h2>
              </div>

              {/* Delete button for OWNER only */}
              {hasRole([UserRole.OWNER]) && (
                <button
                  onClick={deleteLead}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded shadow-sm hover:bg-red-700"
                >
                  Delete Lead
                </button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm mb-6">
              <p>
                <span className="font-semibold">Email:</span> {lead.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {lead.phone}
              </p>
              <p>
                <span className="font-semibold">Current Status:</span>{" "}
                <span className="capitalize">{lead.status}</span>
              </p>
              {/* CHANGED: Priority information removed */}
              <p>
                <span className="font-semibold">Source:</span> {lead.source}
              </p>
            </div>

            <hr className="my-4" />

            {/* CHANGED: Priority select controls removed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Change Status
                </label>
                <div className="flex mt-1">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full rounded-l border-gray-300 shadow-sm border p-2 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="meeting_scheduled">Meeting Scheduled</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <button
                    onClick={updateStatus}
                    className="bg-indigo-600 text-white px-3 rounded-r hover:bg-indigo-700 text-sm"
                  >
                    Update
                  </button>
                </div>
              </div>

              {hasRole([UserRole.OWNER, UserRole.SALES_MANAGER]) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Assign Lead
                  </label>
                  <div className="flex mt-1">
                    <select
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      className="block w-full rounded-l border-gray-300 shadow-sm border p-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.email}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={updateAssignee}
                      className="bg-indigo-600 text-white px-3 rounded-r hover:bg-indigo-700 text-sm"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No activities logged.</p>
              ) : (
                activities.map((act) => (
                  <div
                    key={act._id}
                    className="border-l-4 border-indigo-500 pl-4 py-2 bg-gray-50 rounded"
                  >
                    <p className="text-sm font-semibold capitalize">
                      {act.activity_type}
                    </p>
                    <p className="text-sm text-gray-700">{act.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(act.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-1">
              Conversation & AI Reply Drafts
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              AI suggestions are drafts only. Approval marks a reply ready to
              send; it does not send it.
            </p>
            {conversationError && (
              <div
                className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {conversationError}
              </div>
            )}
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                No customer messages have been received.
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <article
                    key={message._id}
                    className="rounded border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {message.direction} message
                      </p>
                      <time className="text-xs text-gray-500">
                        {new Date(message.received_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      {message.message}
                    </p>

                    {message.ai_analysis && (
                      <div className="mt-4 rounded bg-indigo-50 p-3 text-sm text-indigo-950">
                        <p>
                          <span className="font-semibold">
                            AI classification:
                          </span>{" "}
                          {message.ai_analysis.intent} ·{" "}
                          {message.ai_analysis.sentiment} ·{" "}
                          {Math.round(message.ai_analysis.confidence * 100)}%
                          confidence
                        </p>
                        <p className="mt-1">{message.ai_analysis.summary}</p>
                        {message.ai_analysis.requires_human_escalation && (
                          <p className="mt-1 font-medium">
                            Human review required:{" "}
                            {message.ai_analysis.escalation_reason}
                          </p>
                        )}
                      </div>
                    )}

                    {message.reply_draft && (
                      <div className="mt-4">
                        <label
                          htmlFor={`reply-draft-${message._id}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Suggested reply draft
                        </label>
                        <textarea
                          id={`reply-draft-${message._id}`}
                          value={message.reply_draft}
                          readOnly
                          rows={3}
                          className="mt-1 w-full resize-none rounded border border-gray-300 bg-gray-50 p-2 text-sm text-gray-800"
                        />
                        {message.reply_status === "approved" ? (
                          <p className="mt-2 text-sm font-medium text-green-700">
                            Approved and ready to send
                            {message.reply_approved_at
                              ? ` on ${new Date(message.reply_approved_at).toLocaleString()}`
                              : ""}
                            .
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void approveReplyDraft(message._id)}
                            disabled={approvingMessageId === message._id}
                            className="mt-2 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {approvingMessageId === message._id
                              ? "Approving..."
                              : "Approve reply draft"}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-bold mb-4">Follow-ups</h3>

            <form
              onSubmit={createFollowUp}
              className="mb-6 space-y-3 p-3 bg-gray-50 border rounded"
            >
              <h4 className="text-sm font-semibold">New Follow-up</h4>
              <input
                type="text"
                placeholder="Description"
                required
                value={followUpDesc}
                onChange={(e) => setFollowUpDesc(e.target.value)}
                className="w-full text-sm p-2 border rounded"
              />
              <input
                type="datetime-local"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-sm p-2 border rounded"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700"
              >
                Add Task
              </button>
            </form>

            <div className="space-y-4">
              {followups.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No follow-ups scheduled.
                </p>
              ) : (
                followups.map((f) => (
                  <div key={f._id} className="border p-3 rounded">
                    <p className="text-sm font-medium">{f.description}</p>
                    <p
                      className={`text-xs mt-1 ${f.status === "overdue" ? "text-red-600" : "text-gray-500"}`}
                    >
                      Due: {new Date(f.due_at).toLocaleDateString()} -{" "}
                      <span className="capitalize">{f.status}</span>
                    </p>
                    {f.status !== "completed" && (
                      <button
                        onClick={async () => {
                          await api.patch(`/api/followups/${f._id}`, {
                            status: "completed",
                          });
                          fetchLeadData();
                        }}
                        className="mt-2 text-xs text-indigo-600 hover:underline"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
