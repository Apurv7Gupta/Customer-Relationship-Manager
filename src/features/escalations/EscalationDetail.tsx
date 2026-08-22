import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserRole, type User } from "@/types/auth";
import { api } from "@/services/api";
import type { Escalation, EscalationStatus } from "@/types/crm";
import { Sidebar } from "@/components/SideBar";

const escalationStatuses: EscalationStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
};

export const EscalationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [escalation, setEscalation] = useState<Escalation | null>(null);
  const [status, setStatus] = useState<EscalationStatus>("open");
  const [assignedTo, setAssignedTo] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadEscalation = useCallback(async () => {
    if (!id) {
      setError("An escalation ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Escalation>(`/api/escalations/${id}`);
      setEscalation(result.data);
      setStatus(result.data.status);
      setAssignedTo(result.data.assigned_to ?? "");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Unable to load this escalation."),
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get<User[]>("/api/users");
      setUsers(res.data.filter((u) => u.role === UserRole.SALES_EXECUTIVE));
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  }, []);

  useEffect(() => {
    void loadEscalation();
    void loadUsers();
  }, [loadEscalation, loadUsers]);

  const saveEscalation = async () => {
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.patch<Escalation>(`/api/escalations/${id}`, {
        status,
        assigned_to: assignedTo.trim() || null,
      });
      setEscalation(result.data);
      setStatus(result.data.status);
      setAssignedTo(result.data.assigned_to ?? "");
      setSuccess("Escalation updated successfully.");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Unable to update this escalation."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-sans font-medium text-gray-500">
        Loading escalation…
      </div>
    );
  }

  if (error && !escalation) {
    return (
      <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
          <div
            className="mx-auto max-w-3xl rounded-xl border border-red-100 bg-red-50 p-6 text-red-700 shadow-sm"
            role="alert"
          >
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => void loadEscalation()}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!escalation) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-sans font-medium text-gray-500">
        Escalation not found.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <header className="mb-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/escalations")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            >
              &larr;
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Escalation Details
            </h1>
          </header>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Review Request
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Created on {new Date(escalation.created_at).toLocaleString()}
                </p>
              </div>
              <span className="inline-flex items-center rounded-md border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-700">
                {escalation.priority} priority
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 text-sm">
              <div className="sm:col-span-2">
                <dt className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reason
                </dt>
                <dd className="mt-2 rounded-lg bg-gray-50 p-4 text-gray-900 border border-gray-100">
                  {escalation.reason}
                </dd>
              </div>
              <div>
                <dt className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Lead ID
                </dt>
                <dd className="mt-1 break-all font-medium text-gray-900">
                  <Link
                    to={`/leads/${escalation.lead_id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {escalation.lead_id}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Message ID
                </dt>
                <dd className="mt-1 break-all font-medium text-gray-900">
                  {escalation.message_id}
                </dd>
              </div>
              {escalation.resolved_at && (
                <div className="sm:col-span-2">
                  <dt className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Resolved at
                  </dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {new Date(escalation.resolved_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-10 border-t border-gray-100 pt-8">
              <h3 className="text-lg font-bold text-gray-900">
                Manage Resolution
              </h3>

              {error && (
                <div
                  className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700"
                  role="status"
                >
                  {success}
                </div>
              )}

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="escalation-detail-status"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    Status
                  </label>
                  <select
                    id="escalation-detail-status"
                    value={status}
                    disabled={saving}
                    onChange={(event) =>
                      setStatus(event.target.value as EscalationStatus)
                    }
                    className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 capitalize"
                  >
                    {escalationStatuses.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="assigned-to"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    Assigned user
                  </label>
                  <select
                    id="assigned-to"
                    value={assignedTo}
                    disabled={saving}
                    onChange={(event) => setAssignedTo(event.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEscalation()}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : status === "resolved"
                      ? "Resolve escalation"
                      : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
