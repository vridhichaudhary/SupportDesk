"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/utils/axiosInstance";
import ReassignDropdown from "@/components/admin/ReassignDropdown";

export default function AdminTicketDetails() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  async function loadTicket() {
    try {
      const res = await axiosInstance.get(`/admin/tickets/${id}`);
      setTicket(res.data.ticket);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Failed to load ticket", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, []);

  async function sendComment() {
    if (!commentText.trim()) return;
    setSendingComment(true);

    try {
      const res = await axiosInstance.post(`/admin/tickets/${id}/comments`, {
        message: commentText.trim(),
      });

      setComments((prev) => [...prev, res.data.comment]);
      setCommentText("");
    } catch (err) {
      console.error("Failed to send comment", err);
      alert("Failed to send comment");
    } finally {
      setSendingComment(false);
    }
  }

  if (loading)
    return <div className="p-8">Loading ticket details...</div>;

  if (!ticket)
    return <div className="p-8 text-red-500">Ticket not found</div>;

  const badge = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-600",

    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen">

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">{ticket.ticketId}</h1>
          <p className="text-gray-600">{ticket.title}</p>
        </div>

        <ReassignDropdown ticket={ticket} onAssigned={loadTicket} />
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm mb-8">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${badge[ticket.status]}`}
            >
              {ticket.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Priority</p>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                badge[ticket.priority?.toLowerCase()]
              }`}
            >
              {ticket.priority}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Category</p>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {ticket.category}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Assigned To</p>
            <span className="font-medium">
              {ticket.assignedTo?.name || "Not Assigned"}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Created By</p>
            <span>{ticket.user?.name || "Unknown User"}</span>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Created On</p>
            <span>
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Comments</h2>

        <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-2">
          {comments.length === 0 && (
            <p className="text-gray-500 text-sm">No comments yet.</p>
          )}

          {comments.map((c) => (
            <div
              key={c._id}
              className="p-3 border rounded-lg bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900">
                {c.user?.name || "User"}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {c.message}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Write a comment..."
            className="flex-1 border rounded-lg px-4 py-2"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />

          <button
            onClick={sendComment}
            disabled={sendingComment}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {sendingComment ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
