import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserRole, type User } from "@/types/auth";
import { api } from "@/services/api";
import type { Escalation, EscalationStatus } from "@/types/crm";

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

export const EscalationDetail = () => {
  const { id } = useParams<{ id: string }>();
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
      <div className="p-8 text-center text-gray-600" role="status">
        Loading escalation…
      </div>
    );
  }

  if (error && !escalation) {
    return (
      <main className="p-8">
        <div className="rounded bg-red-50 p-4 text-red-700" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadEscalation()}
            className="mt-2 text-sm font-medium underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!escalation) {
    return (
      <div className="p-8 text-center text-gray-600">Escalation not found.</div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/escalations"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to escalations
        </Link>
        <section className="mt-4 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Escalation</h1>
              <p className="mt-1 text-sm text-gray-600">
                Created {new Date(escalation.created_at).toLocaleString()}
              </p>
            </div>
            <span className="rounded bg-red-100 px-2 py-1 text-sm font-medium text-red-800">
              {escalation.priority} priority
            </span>
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Reason</dt>
              <dd className="mt-1 text-gray-900">{escalation.reason}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Lead ID</dt>
              <dd className="mt-1 break-all text-gray-900">
                {escalation.lead_id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Message ID</dt>
              <dd className="mt-1 break-all text-gray-900">
                {escalation.message_id}
              </dd>
            </div>
            {escalation.resolved_at && (
              <div>
                <dt className="font-medium text-gray-700">Resolved at</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(escalation.resolved_at).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Manage escalation
            </h2>
            {error && (
              <p
                className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
            {success && (
              <p
                className="mt-3 rounded bg-green-50 p-3 text-sm text-green-700"
                role="status"
              >
                {success}
              </p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="escalation-detail-status"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-1 w-full rounded border border-gray-300 p-2 disabled:opacity-60"
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
                  className="block text-sm font-medium text-gray-700"
                >
                  Assigned user
                </label>
                <select
                  id="assigned-to"
                  value={assignedTo}
                  disabled={saving}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 disabled:opacity-60"
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
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEscalation()}
              className="mt-5 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : status === "resolved"
                  ? "Resolve escalation"
                  : "Save changes"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
