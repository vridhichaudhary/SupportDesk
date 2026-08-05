"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";

export default function PortalAIPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I'm the SupportDesk AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/ai/ask", {
        query: userMessage.content,
        thread_id: "portal_session_1"
      });
      
      const reply = res.data?.data?.answer || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again or create a support ticket." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 text-purple-600 rounded-2xl mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-500 mt-2">Get instant answers to your questions</p>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => {
            const isAi = msg.role === "assistant";
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                className={`flex gap-4 ${!isAi ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-sm ${
                  isAi ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
                }`}>
                  {isAi ? <Bot className="w-6 h-6" /> : <User className="w-5 h-5" />}
                </div>
                
                <div className={`flex flex-col max-w-[80%] ${!isAi ? "items-end" : "items-start"}`}>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    !isAi 
                      ? "bg-sky-600 text-white rounded-tr-none" 
                      : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-none"
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex-shrink-0 flex items-center justify-center shadow-sm">
                <Bot className="w-6 h-6" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full pl-6 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-inner"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-400">
            AI can make mistakes. Consider verifying important information. {" "}
            <Link href="/portal/tickets/new" className="text-sky-500 hover:underline">Submit a ticket</Link> if you need human assistance.
          </div>
        </div>
      </div>
    </div>
  );
}
