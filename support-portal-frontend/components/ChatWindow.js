"use client";

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const SOCKET_URL = "http://localhost:8080"; // Or your backend URL

export default function ChatWindow({ onClose }) {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    // Random user ID for demo purposes if not authenticated, 
    // or fetch from local storage/auth context
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const u = JSON.parse(storedUser);
                    setUserId(u.id || u._id || u.userId);
                } catch (e) {
                    console.error("Failed to parse user", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!userId) return;

        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
        });
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("Connected to chat server");
            newSocket.emit("join_chat", { userId });
        });

        newSocket.on("chat_joined", (data) => {
            console.log("Joined chat session:", data);
        });

        newSocket.on("message_history", (history) => {
            setMessages(history);
        });

        newSocket.on("receive_message", (message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => newSocket.disconnect();
    }, [userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket) return;

        // We can optimistically add the message if we want, 
        // but the backend echoes it back via 'receive_message', 
        // so we'll just emit. (Backend design choice in socket.js)

        // Actually, in my backend implementation, I emit 'receive_message' for the user message too.
        // So looking at the backend code:
        // socket.emit("receive_message", userMsg); 
        // This confirms we should just emit and wait for the event.

        // But we need the chatId. The join_chat event returns it, or we can just send it if we stored it.
        // My backend logic for 'send_message' expects { chatId, content, userId }.
        // But wait, the frontend doesn't know the chatId easily unless we store it from 'chat_joined'.

        // Let's quickly fix this by storing chatId.
        // Or we can just assume the backend knows the user's active chat, but the current backend 
        // implementation of `send_message` explicitly asks for `chatId`. 
        // So I need to listen to `chat_joined` and store the `chatId`.

        socket.emit("send_message", {
            chatId: activeChatId,
            content: input,
            userId
        });

        setInput("");
    };

    const [activeChatId, setActiveChatId] = useState(null);

    useEffect(() => {
        if (!socket) return;
        socket.on("chat_joined", (data) => {
            setActiveChatId(data.chatId);
        });
    }, [socket]);


    return (
        <div className="fixed bottom-20 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 z-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <h3 className="font-semibold">Support Assistant</h3>
                </div>
                <button onClick={onClose} className="text-gray-300 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                {messages.map((msg, idx) => {
                    const isUser = msg.sender === "user";
                    const isSystem = msg.sender === "agent"; // or Escalation

                    return (
                        <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm ${isUser
                                    ? "bg-slate-900 text-white rounded-br-none"
                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || !activeChatId}
                    className="p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
