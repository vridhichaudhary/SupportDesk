"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MessageSquare, Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

export default function AICopilotPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get("/api/v1/ai/sessions");
      setSessions(res.data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await api.get(`/api/v1/ai/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  const createNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await api.delete(`/api/v1/ai/sessions/${sessionId}`);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input;
    setInput("");
    setIsLoading(true);

    // Optimistic UI for user message
    setMessages((prev) => [...prev, { role: "user", content: query, citations: [] }]);

    try {
      const payload = { query };
      if (activeSessionId) {
        payload.session_id = activeSessionId;
      }
      const res = await api.post("/api/v1/ai/ask", payload);
      
      if (!activeSessionId) {
        setActiveSessionId(res.data.session_id);
        fetchSessions();
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          citations: res.data.citations,
        },
      ]);
    } catch (error) {
      console.error("Failed to send query", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          citations: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer mb-1 transition-colors ${
                activeSessionId === session.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={16} className={activeSessionId === session.id ? "text-blue-600" : "text-gray-400"} />
                <span className="text-sm font-medium truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => deleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center px-6 bg-white">
          <h1 className="text-lg font-semibold text-gray-900">AI Copilot</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Bot size={48} className="text-blue-500 mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-sm text-center max-w-md">
                I can answer questions based on your organization's knowledge base, documents, and past tickets.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 max-w-4xl mx-auto ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-gray-800 text-white"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-lg max-w-2xl ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 border border-gray-200 text-gray-800 prose prose-sm max-w-none"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.citations.map((cite) => (
                        <div
                          key={cite.ref_id}
                          className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md"
                        >
                          <span className="font-semibold">[{cite.ref_id}]</span>
                          <span className="truncate max-w-[150px]">{cite.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full pl-4 pr-12 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[11px] text-gray-400">
              AI Copilot can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
