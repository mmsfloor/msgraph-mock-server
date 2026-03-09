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
    
    const MY_MRI = rawData.userId;

    return rawData.conversations.map(chat => {
        const chatId = chat.id; // Use original identifier directly from $.conversations[].id
        const topic = chat.displayName || "Untitled Chat";
        const members = chat.threadProperties?.members || []; 
        const rawMessages = chat.MessageList || []; 

        const normalizedMessages = rawMessages
    .filter(msg => {
        const type = msg.messagetype || '';
        if (type.startsWith('ThreadActivity')) return false;
        if (type.startsWith('Event')) return false;
        return true;
    })
    .map(msg => {
        const identity = resolveIdentity(msg, chatId);
        const createdDateTime = msg.originalarrivaltime ? new Date(msg.originalarrivaltime).toISOString() : null;
        const messageType = msg.messagetype || null;
        const mediaReferences = Array.isArray(msg.amsreferences) && msg.amsreferences.length > 0 ? msg.amsreferences : null;
        const sender = msg.from || msg.properties?.importedBy?.RawValue || null;
        const direction = sender == null ? null : (sender === MY_MRI ? "OUTBOUND" : "INBOUND");
        let replyToId = null;
        if (typeof msg.content === "string") {
            const m = msg.content.match(/<blockquote[^>]*itemtype=["'][^"']*Reply[^"']*["'][^>]*itemid=["']([^"']+)["']/i);
            if (m && m[1]) replyToId = m[1];
        }

        return {
            id: msg.id,
            chatId,
            createdDateTime,
            lastModifiedDateTime: createdDateTime,
            direction,
            message_type: messageType,
            reply_to_id: replyToId,
            media_references: mediaReferences,
            body: {
                contentType: "html",
                content: msg.content || ""
            },
            ...identity
        };
    });

        // Derive chat createdDateTime as MIN(createdDateTime of messages)
        const validTimestamps = normalizedMessages
            .map(m => m.createdDateTime)
            .filter(t => t !== null)
            .map(t => new Date(t).getTime());
        
        const chatCreatedDateTime = validTimestamps.length > 0 
            ? new Date(Math.min(...validTimestamps)).toISOString() 
            : null;

        return {
            id: chatId,
            topic: topic,
            members: members,
            createdDateTime: chatCreatedDateTime,
            normalizedMessages: normalizedMessages
        };
    });
}

module.exports = {
    normalizeData
};
