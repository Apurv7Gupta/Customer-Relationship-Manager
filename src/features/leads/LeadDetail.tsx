import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, Activity, FollowUp, PaginatedResponse } from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { UserRole, type User } from "@/types/auth";
import { Sidebar } from "@/components/SideBar";

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-sans font-medium text-gray-500">
        Loading lead details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-sans font-medium text-gray-500">
        Lead not found.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              >
                &larr;
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {lead.name}
                </h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                    {lead.status.replace("_", " ")}
                  </span>
                  &bull; Lead via {lead.source}
                </p>
              </div>
            </div>
            {hasRole([UserRole.OWNER]) && (
              <button
                onClick={deleteLead}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-red-700"
              >
                Delete Lead
              </button>
            )}
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left/Main Column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Core Information Card */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-bold text-gray-900">
                  Contact Details
                </h2>
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email Address
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {lead.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Phone Number
                    </dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {lead.phone}
                    </dd>
                  </div>
                </dl>

                <hr className="my-6 border-gray-100" />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Change Status
                    </label>
                    <div className="mt-2 flex shadow-sm rounded-lg">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="block w-full rounded-l-lg border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="meeting_scheduled">
                          Meeting Scheduled
                        </option>
                        <option value="proposal_sent">Proposal Sent</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                      <button
                        onClick={updateStatus}
                        className="rounded-r-lg border border-transparent bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Update
                      </button>
                    </div>
                  </div>

                  {hasRole([UserRole.OWNER, UserRole.SALES_MANAGER]) && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Assign Lead
                      </label>
                      <div className="mt-2 flex shadow-sm rounded-lg">
                        <select
                          value={newAssignee}
                          onChange={(e) => setNewAssignee(e.target.value)}
                          className="block w-full rounded-l-lg border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
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
                          className="rounded-r-lg border border-transparent bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Activity Timeline */}
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold text-gray-900">
                  Activity Timeline
                </h3>
                <div className="space-y-5">
                  {activities.length === 0 ? (
                    <p className="text-sm font-medium text-gray-500">
                      No activities logged yet.
                    </p>
                  ) : (
                    activities.map((act) => (
                      <div
                        key={act._id}
                        className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:bottom-[-20px] before:w-[2px] before:bg-gray-100 last:before:hidden"
                      >
                        <div className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                        <p className="text-sm font-semibold capitalize text-gray-900">
                          {act.activity_type.replace("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {act.description}
                        </p>
                        <p className="mt-1.5 text-xs text-gray-400">
                          {new Date(act.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (Sidebar-like for Details) */}
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold text-gray-900">
                  Follow-ups
                </h3>

                {/* Add Follow-up Form */}
                <form
                  onSubmit={createFollowUp}
                  className="mb-8 space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5"
                >
                  <h4 className="text-sm font-semibold text-gray-800">
                    Add New Task
                  </h4>
                  <div>
                    <input
                      type="text"
                      placeholder="Task description..."
                      required
                      value={followUpDesc}
                      onChange={(e) => setFollowUpDesc(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="datetime-local"
                      required
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Schedule Task
                  </button>
                </form>

                {/* Follow-up List */}
                <div className="space-y-3">
                  {followups.length === 0 ? (
                    <p className="text-center text-sm font-medium text-gray-500">
                      No follow-ups scheduled.
                    </p>
                  ) : (
                    followups.map((f) => (
                      <div
                        key={f._id}
                        className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {f.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <p
                            className={`text-xs font-medium ${f.status === "overdue" ? "text-red-600" : "text-gray-500"}`}
                          >
                            {new Date(f.due_at).toLocaleDateString()} &bull;{" "}
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
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Conversations Navigation Button */}
              <button
                onClick={() => navigate(`/leads/${id}/conversations`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-100 bg-white px-6 py-4 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 hover:border-indigo-200"
              >
                <span>✨</span> View Conversations & AI Drafts
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
