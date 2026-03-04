const { resolveIdentity } = require('../identity/resolver');

/**
 * Normalizes raw export JSON to internal model.
 * 
 * Chats:
 * { id, topic, members[], normalizedMessages[] }
 * 
 * Messages:
 * { id, chatId, createdDateTime, body, canonical_user_id, identity_type, original_from, original_importedBy, original_displayName }
 */

function normalizeData(rawData) {
    if (!rawData || !rawData.conversations) {
        return [];
    }

    return rawData.conversations.map(chat => {
        const chatId = chat.id;
        const topic = chat.displayName || "Untitled Chat";
        const members = chat.members || []; // Some exports might have members
        const rawMessages = chat.MessageList || [];

        const normalizedMessages = rawMessages.map(msg => {
            const identity = resolveIdentity(msg, chatId);
            
            return {
                id: msg.id,
                chatId: chatId,
                createdDateTime: msg.composetime || msg.createdDateTime || new Date().toISOString(),
                body: {
                    contentType: "html",
                    content: msg.content || ""
                },
                ...identity
            };
        });

        return {
            id: chatId,
            topic: topic,
            members: members,
            normalizedMessages: normalizedMessages
        };
    });
}

module.exports = {
    normalizeData
};
