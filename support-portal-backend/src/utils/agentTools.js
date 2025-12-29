/**
 * Agent Tools for Gemini
 * These functions are exposed to the AI model to perform actions.
 */

// Mock Database for quick demo purposes
// In production, these would query your Compass/Mongoose models
const MOCK_TICKETS = [
    { id: "101", status: "Open", subject: "Login Issue", assignedTo: "Support" },
    { id: "102", status: "Resolved", subject: "Billing Question", assignedTo: "Finance" },
    { id: "103", status: "In Progress", subject: "Feature Request", assignedTo: "Product" }
];

const tools = {
    checkTicketStatus: async ({ ticketId }) => {
        console.log(`[Tool] Checking status for ticket: ${ticketId}`);
        const ticket = MOCK_TICKETS.find(t => t.id === ticketId);
        if (ticket) {
            return {
                exists: true,
                id: ticket.id,
                status: ticket.status,
                subject: ticket.subject,
                assignedTo: ticket.assignedTo
            };
        }
        return { exists: false, error: "Ticket not found" };
    },

    escalateToHuman: async ({ reason }) => {
        console.log(`[Tool] Escalating chat. Reason: ${reason}`);
        // In a real app, this would trigger a DB update or notification
        return { status: "escalated", message: "A human agent has been notified and will join shortly." };
    }
};

// Function declarations for Gemini API
const functionDeclarations = [
    {
        name: "checkTicketStatus",
        description: "Check the status and details of a support ticket by its ID.",
        parameters: {
            type: "OBJECT",
            properties: {
                ticketId: {
                    type: "STRING",
                    description: "The ID of the ticket to check (e.g., '101', '102').",
                },
            },
            required: ["ticketId"],
        },
    },
    {
        name: "escalateToHuman",
        description: "Escalate the current conversation to a human agent when the user is angry, requests a human, or the issue is too complex.",
        parameters: {
            type: "OBJECT",
            properties: {
                reason: {
                    type: "STRING",
                    description: "The reason for escalation."
                }
            },
            required: ["reason"]
        }
    }
];

module.exports = { tools, functionDeclarations };
