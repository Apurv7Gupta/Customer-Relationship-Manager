import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, Activity, FollowUp, PaginatedResponse } from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { UserRole, type User } from "@/types/auth";
import { Sidebar } from "@/components/SideBar";
import { motion, type Variants } from "framer-motion";

// Framer Motion Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

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
        <motion.div
          className="mx-auto max-w-7xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:cursor-pointer"
              >
                &larr;
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {lead.name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                    {lead.status.replace("_", " ")}
                  </span>
                  <span className="hidden sm:inline">&bull;</span>
                  <span>Lead via {lead.source}</span>
                </p>
              </div>
            </div>
            {hasRole([UserRole.OWNER]) && (
              <button
                onClick={deleteLead}
                className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-red-700 sm:w-auto"
              >
                Delete Lead
              </button>
            )}
          </motion.header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left/Main Column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Core Information Card */}
              <motion.section
                variants={itemVariants}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
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
                    <div className="mt-2 flex rounded-lg">
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
                        className="rounded-r-lg bg-blue-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-blue-400 hover:cursor-pointer"
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
                      <div className="mt-2 flex rounded-lg">
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
                          className="rounded-r-lg bg-blue-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-blue-400 hover:cursor-pointer"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Activity Timeline */}
              <motion.section
                variants={itemVariants}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
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
                        className="relative pl-6 before:absolute before:bottom-[-20px] before:left-0 before:top-1.5 before:w-[2px] before:bg-gray-100 last:before:hidden"
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
              </motion.section>
            </div>

            {/* Right Column */}
            <div className="space-y-6 lg:col-span-1">
              <motion.section
                variants={itemVariants}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
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
                    className="w-full rounded-lg bg-blue-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-blue-400 hover:cursor-pointer"
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
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {f.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                              className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>

              {/* Conversations Navigation Button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/leads/${id}/conversations`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-100 bg-white px-6 py-4 text-sm font-bold text-indigo-400 transition-colors hover:border-yellow-300 hover:bg-white hover:cursor-pointer"
              >
                <span>⟡</span> View Conversations & AI Drafts
              </motion.button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
