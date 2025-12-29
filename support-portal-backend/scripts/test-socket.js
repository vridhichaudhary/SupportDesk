const io = require("socket.io-client");

const socket = io("http://localhost:8080");

console.log("Connecting to server...");

socket.on("connect", () => {
    console.log("Connected to server:", socket.id);

    // Join chat
    // Use a valid 24-char hex string to simulate a MongoDB ObjectId
    const userId = "69288b60a3d215c4a8ba47e5";
    socket.emit("join_chat", { userId });
});

socket.on("chat_joined", (data) => {
    console.log("Joined chat:", data);

    // Send message triggering tool use
    const chatId = data.chatId;
    console.log("Sending message asking for ticket status...");
    socket.emit("send_message", {
        chatId,
        content: "What is the status of ticket 101?",
        userId: "test_user_gemini"
    });
});

socket.on("receive_message", (msg) => {
    console.log("Received message:", msg);

    if (msg.sender === "ai") {
        console.log("AI Response:", msg.content);
        if (msg.content.includes("Open") || msg.content.includes("Login Issue")) {
            console.log("✅ Verified: AI used 'checkTicketStatus' tool correctly.");
            socket.disconnect();
        } else {
            console.log("⚠️  AI replied, but might not have used tool or data is different.");
        }
    }
});

socket.on("error", (err) => {
    console.error("Socket error:", err);
});

// Timeout
setTimeout(() => {
    console.log("Test timed out.");
    socket.disconnect();
}, 15000); // Increased timeout for Gemini processing
