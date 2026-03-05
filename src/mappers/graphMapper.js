/**
 * Mappers to convert internal models to Microsoft Graph-compatible JSON.
 */

function mapToGraphChat(chat) {
    return {
        id: chat.id,
        topic: chat.topic,
        createdDateTime: chat.createdDateTime, // Already correctly derived in normalizer
        lastMessagePreview: null,
        chatType: "group",
    };
}

function mapToGraphMessage(message, debug = false) {
    const graphMessage = {
        id: message.id,
        createdDateTime: message.createdDateTime,
        lastModifiedDateTime: message.lastModifiedDateTime || message.createdDateTime,
        from: {
            user: {
                id: message.canonical_user_id,
                displayName: message.original_displayName || null
            }
        },
        body: {
            contentType: message.body.contentType || "html",
            content: message.body.content || ""
        }
    };

    if (debug) {
        graphMessage._mock_identity_type = message.identity_type;
    }

    return graphMessage;
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
