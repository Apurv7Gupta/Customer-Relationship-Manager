import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, Activity, FollowUp, PaginatedResponse } from "@/types/crm";

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchLeadData = async () => {
    try {
      const [leadRes, actRes, folRes] = await Promise.all([
        api.get<Lead>(`/api/leads/${id}`),
        api.get<PaginatedResponse<Activity>>("/api/activities", {
          params: { lead_id: id },
        }),
        api.get<PaginatedResponse<FollowUp>>("/api/followups", {
          params: { assigned_to: "" },
        }), // Minimal impl, filtering follows on backend usually
      ]);
      setLead(leadRes.data);
      setActivities(actRes.data.data);
      setFollowups(folRes.data.data.filter((f) => f.lead_id === id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  if (loading) return <div className="p-8">Loading details...</div>;
  if (!lead) return <div className="p-8 text-red-500">Lead not found.</div>;

  return (
    <div className="max-w-5xl mx-auto mt-8 grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center mb-6 space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-700 border border-gray-300 rounded shadow-sm hover:bg-blue-800"
            >
              &larr;
            </button>
            <h2 className="text-2xl font-bold">{lead.name}</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <p>
              <span className="font-semibold">Email:</span> {lead.email}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {lead.phone}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              <span className="capitalize">{lead.status}</span>
            </p>
            <p>
              <span className="font-semibold">Source:</span> {lead.source}
            </p>
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
      </div>

      <div className="col-span-1 space-y-6">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-bold mb-4">Follow-ups</h3>
          <div className="space-y-4">
            {followups.length === 0 ? (
              <p className="text-gray-500 text-sm">No follow-ups scheduled.</p>
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
