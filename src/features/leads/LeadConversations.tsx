import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Message, PaginatedResponse } from "@/types/crm";
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
        <motion.div
          className="mx-auto max-w-4xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header
            variants={itemVariants}
            className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            >
              &larr;
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Conversations & AI Drafts
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Review messages and approve AI-generated replies for this lead.
              </p>
            </div>
          </motion.header>

          <motion.section
            variants={itemVariants}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8"
          >
            {conversationError && (
              <div
                className="mb-8 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700"
                role="alert"
              >
                {conversationError}
              </div>
            )}

            {messages.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-sm font-medium text-gray-500">
                No customer messages have been received yet.
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <motion.article
                    variants={itemVariants}
                    key={message._id}
                    className="rounded-xl border border-gray-100 bg-gray-50/30 p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
                      <p className="text-sm font-bold capitalize tracking-wide text-gray-900">
                        {message.direction} Message
                      </p>
                      <time className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {new Date(message.received_at).toLocaleString()}
                      </time>
                    </div>

                    <p className="mt-5 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                      {message.message}
                    </p>

                    {message.ai_analysis && (
                      <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50/50 p-5 text-sm text-indigo-900">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-xs shadow-sm">
                            ✨
                          </span>
                          <span className="font-bold text-indigo-950">
                            AI Analysis
                          </span>
                        </div>
                        <p className="mb-2">
                          <span className="font-semibold capitalize text-indigo-950">
                            {message.ai_analysis.intent}
                          </span>{" "}
                          <span className="text-indigo-400">&bull;</span>{" "}
                          <span className="capitalize text-indigo-950">
                            {message.ai_analysis.sentiment}
                          </span>{" "}
                          <span className="text-indigo-400">&bull;</span>{" "}
                          {Math.round(message.ai_analysis.confidence * 100)}%
                          confidence
                        </p>
                        <p className="text-indigo-800/90 leading-relaxed">
                          {message.ai_analysis.summary}
                        </p>

                        {message.ai_analysis.requires_human_escalation && (
                          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 shadow-sm">
                            <span>⚠️</span> Human review required:{" "}
                            <span className="font-medium">
                              {message.ai_analysis.escalation_reason}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {message.reply_draft && (
                      <div className="mt-6 border-t border-gray-100 pt-6">
                        <label
                          htmlFor={`reply-draft-${message._id}`}
                          className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-500"
                        >
                          Suggested Reply Draft
                        </label>
                        <textarea
                          id={`reply-draft-${message._id}`}
                          value={message.reply_draft}
                          readOnly
                          rows={4}
                          className="block w-full resize-none rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />

                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end">
                          {message.reply_status === "approved" ? (
                            <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                              <span>✓</span>
                              <span>
                                Approved to send
                                {message.reply_approved_at
                                  ? ` on ${new Date(message.reply_approved_at).toLocaleString()}`
                                  : ""}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void approveReplyDraft(message._id)
                              }
                              disabled={approvingMessageId === message._id}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              {approvingMessageId === message._id
                                ? "Approving Draft..."
                                : "Approve Draft"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.article>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
};
