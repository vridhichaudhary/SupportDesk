const { GoogleGenerativeAI } = require("@google/generative-ai");
const { tools, functionDeclarations } = require("../utils/agentTools");

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const systemInstruction = `
            You are 'Agentforce', a high-capability AI Support Agent for SupportDesk.
            Your goal is to autonomously resolve user issues and use your tools when needed.
            
            Company Knowledge:
            - SupportDesk provides B2B Customer Support Software.
            - Pricing: $20/user/month (Standard), $50/user/month (Enterprise).
            - Support Hours: 24/7 for Enterprise, 9-5 EST for Standard.
            
            Guidelines:
            - Be professional, empathetic, and efficient.
            - ALWAYS check if you can use a tool to answer the user's question (e.g., ticket status).
            - If you need a ticket ID and don't have it, ask the user for it.
            - If the user wants to speak to a human or is frustrated, use the 'escalateToHuman' tool.
            - Keep your responses concise (under 3 sentences) unless explaining a complex step.
        `;

        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp", // Using flash for speed/cost, or pro for reasoning
            systemInstruction: systemInstruction,
            tools: [
                {
                    functionDeclarations: functionDeclarations
                }
            ],
        });
    }

    async generateResponse(history, latestMessage) {
        try {
            // Convert history to Gemini format
            // Gemini expects: { role: 'user' | 'model', parts: [{ text: string }] }
            // Mongoose history: { sender: 'user' | 'ai', content: string }
            const chatHistory = history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            const chat = this.model.startChat({
                history: chatHistory,
            });

            const result = await chat.sendMessage(latestMessage);
            const response = result.response;

            // Check for function calls
            const call = response.functionCalls();

            if (call) {
                const functionCalls = call;
                let finalResponseText = "";

                // Gemini might return multiple function calls, though usually one in this context
                for (const call of functionCalls) {
                    const fnName = call.name;
                    const args = call.args;

                    if (tools[fnName]) {
                        console.log(`[AI Service] Executing tool: ${fnName}`);
                        const toolResult = await tools[fnName](args);

                        // Pass tool result back to model to get final natural language response
                        // For simplicity in this demo loop (and simpler Gemini API usage for single-turn logic):
                        // We will just send the tool result as the next 'user' message or similar context
                        // But proper way is sending a functionResponse part.

                        // Let's use the proper function response flow
                        const toolResponse = {
                            functionResponse: {
                                name: fnName,
                                response: toolResult
                            }
                        };

                        // Send the tool output back to the model
                        const finalResult = await chat.sendMessage([toolResponse]);
                        finalResponseText += finalResult.response.text();
                    }
                }
                return finalResponseText;
            } else {
                return response.text();
            }

        } catch (error) {
            console.error("AI Service Error:", error);
            // Fallback
            return "I apologize, but I'm having trouble connecting to my central brain right now.";
        }
    }
}

module.exports = new AIService();
