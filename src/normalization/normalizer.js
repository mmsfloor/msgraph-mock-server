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
        const message_type = msg.messagetype || null;
        const media_references = Array.isArray(msg.amsreferences) && msg.amsreferences.length > 0 ? msg.amsreferences : null;
        const MY_MRI = "8:live:.cid.YOUR_MRI_HERE";
        const direction = msg.from == null ? null : (msg.from === MY_MRI ? "OUTBOUND" : "INBOUND");
        let reply_to_id = null;
        if (typeof msg.content === "string") {
            const m = msg.content.match(/<blockquote[^>]*itemtype=["'][^"']*Reply[^"']*["'][^>]*itemid=["']([^"']+)["']/i);
            if (m && m[1]) reply_to_id = m[1];
        }

        return {
            id: msg.id,
            chatId: chatId,
            createdDateTime: createdDateTime,
            lastModifiedDateTime: createdDateTime,
            direction,
            message_type,
            reply_to_id,
            media_references,
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
