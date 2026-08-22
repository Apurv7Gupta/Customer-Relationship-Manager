import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Message, PaginatedResponse } from "@/types/crm";
import { Sidebar } from "@/components/SideBar";

export const LeadConversations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [approvingMessageId, setApprovingMessageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messageRes = await api.get<PaginatedResponse<Message>>(
          "/api/messages",
          { params: { lead_id: id, page_size: 100 } },
        );
        setMessages(messageRes.data.data);
        setConversationError(null);
      } catch {
        setConversationError(
          "The conversation timeline is unavailable. Please try again later.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMessages();
    }
  }, [id]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f9fa] font-sans font-medium text-gray-500">
        Loading conversations...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            >
              &larr;
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Conversations & AI Drafts
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review messages and approve AI-generated replies for this lead.
              </p>
            </div>
          </header>

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            {conversationError && (
              <div
                className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700"
                role="alert"
              >
                {conversationError}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm font-medium text-gray-500">
                No customer messages have been received.
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <article
                    key={message._id}
                    className="rounded-xl border border-gray-100 bg-gray-50/30 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {message.direction} Message
                      </p>
                      <time className="text-xs font-medium text-gray-500">
                        {new Date(message.received_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                      {message.message}
                    </p>

                    {message.ai_analysis && (
                      <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-900">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-xs">
                            ✨
                          </span>
                          <span className="font-semibold">AI Analysis</span>
                        </div>
                        <p className="mb-2 text-indigo-800">
                          <span className="font-medium capitalize">
                            {message.ai_analysis.intent}
                          </span>{" "}
                          &bull;{" "}
                          <span className="capitalize">
                            {message.ai_analysis.sentiment}
                          </span>{" "}
                          &bull;{" "}
                          {Math.round(message.ai_analysis.confidence * 100)}%
                          confidence
                        </p>
                        <p className="text-indigo-800/80">
                          {message.ai_analysis.summary}
                        </p>

                        {message.ai_analysis.requires_human_escalation && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                            ⚠️ Human review required:{" "}
                            {message.ai_analysis.escalation_reason}
                          </div>
                        )}
                      </div>
                    )}

                    {message.reply_draft && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <label
                          htmlFor={`reply-draft-${message._id}`}
                          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          Suggested Reply Draft
                        </label>
                        <textarea
                          id={`reply-draft-${message._id}`}
                          value={message.reply_draft}
                          readOnly
                          rows={4}
                          className="block w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                        />

                        <div className="mt-3 flex justify-end">
                          {message.reply_status === "approved" ? (
                            <p className="flex items-center gap-1 text-sm font-medium text-green-600">
                              <span>✓</span> Approved to send
                              {message.reply_approved_at
                                ? ` on ${new Date(message.reply_approved_at).toLocaleString()}`
                                : ""}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void approveReplyDraft(message._id)
                              }
                              disabled={approvingMessageId === message._id}
                              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {approvingMessageId === message._id
                                ? "Approving..."
                                : "Approve Draft"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
