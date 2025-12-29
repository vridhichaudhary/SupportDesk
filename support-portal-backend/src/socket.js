const socketIo = require("socket.io");
const Chat = require("./models/Chat");
const Message = require("./models/Message");
const aiService = require("./services/aiService");

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: ["http://localhost:3000", "https://support-desk-teal-nine.vercel.app"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("join_chat", async ({ userId }) => {
            console.log(`User ${userId} joining chat`);
            try {
                // Find active chat or create new one
                let chat = await Chat.findOne({ userId, status: "active" });

                if (!chat) {
                    chat = new Chat({ userId, status: "active" });
                    await chat.save();
                }

                socket.join(chat._id.toString());
                socket.emit("chat_joined", { chatId: chat._id, status: chat.status });

                // Load previous messages
                const messages = await Message.find({ chatId: chat._id }).sort({ timestamp: 1 });
                socket.emit("message_history", messages);

            } catch (error) {
                console.error("Join chat error:", error);
                socket.emit("error", { message: "Failed to join chat" });
            }
        });

        socket.on("send_message", async ({ chatId, content, userId }) => {
            try {
                // Save user message
                const userMsg = new Message({
                    chatId,
                    sender: "user",
                    content
                });
                await userMsg.save();

                // Broadcast to room (so user sees their own message confirmed, if we implemented it that way, 
                // but usually frontend updates optimistically. Sending back to ensure sync)
                io.to(chatId).emit("receive_message", userMsg);

                // Get Chat History for Context
                const history = await Message.find({ chatId }).sort({ timestamp: 1 }).limit(10); // limited context window

                // Validating if it needs AI response
                // Simulate processing delay

                // Get AI Response
                const aiResponseText = await aiService.generateResponse(history, content);

                let sender = "ai";
                if (aiResponseText.startsWith("[ESCALATION_NEEDED]")) {
                    // Update chat status to escalated
                    await Chat.findByIdAndUpdate(chatId, { status: "escalated" });
                    sender = "ai"; // Or system
                }

                const cleanResponse = aiResponseText.replace("[ESCALATION_NEEDED]", "").trim();

                const aiMsg = new Message({
                    chatId,
                    sender,
                    content: cleanResponse
                });
                await aiMsg.save();

                io.to(chatId).emit("receive_message", aiMsg);

            } catch (error) {
                console.error("Send message error:", error);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
};

module.exports = { initSocket };
