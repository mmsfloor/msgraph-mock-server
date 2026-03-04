/**
 * Mappers to convert internal models to Microsoft Graph-compatible JSON.
 */

function mapToGraphChat(chat) {
    return {
        id: chat.id,
        topic: chat.topic,
        createdDateTime: chat.createdDateTime || new Date().toISOString(),
        lastMessagePreview: null, // Can be implemented if needed
        chatType: "group", // Defaulting to group for now
    };
}

function mapToGraphMessage(message) {
    return {
        id: message.id,
        createdDateTime: message.createdDateTime,
        from: {
            user: {
                id: message.canonical_user_id,
                displayName: message.original_displayName || "Unknown User"
            }
        },
        body: {
            contentType: message.body.contentType || "html",
            content: message.body.content || ""
        },
        // Meta information for debugging mock
        _mock_identity_type: message.identity_type
    };
}

function wrapResponse(value, nextLink = null, deltaLink = null) {
    const response = {
        value: value
    };

    if (nextLink) {
        response["@odata.nextLink"] = nextLink;
    }

    if (deltaLink) {
        response["@odata.deltaLink"] = deltaLink;
    }

    return response;
}

module.exports = {
    mapToGraphChat,
    mapToGraphMessage,
    wrapResponse
};
