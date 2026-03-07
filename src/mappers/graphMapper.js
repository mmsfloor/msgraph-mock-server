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
        members: Array.isArray(chat.members) ? chat.members : []
    };
}

function mapToGraphMessage(message, debug = false) {
    let userIdentityType = "anonymousGuest";
    if (message.identity_type === "mri") {
        userIdentityType = "aadUser";
    } else if (message.identity_type === "display_only") {
        userIdentityType = "externalUser";
    }

    const graphMessage = {
        id: message.id,
        chatId: message.chatId,
        createdDateTime: message.createdDateTime,
        lastModifiedDateTime: message.lastModifiedDateTime || message.createdDateTime,
        direction: message.direction || null,
        messageType: message.message_type || null,
        replyToId: message.reply_to_id || null,
        attachments: message.media_references || [],
        from: {
            user: {
                id: message.canonical_user_id,
                displayName: message.original_displayName || null,
                userIdentityType: userIdentityType
            }
        },
        body: {
            contentType: (message.body && message.body.contentType) || "html",
            content: (message.body && message.body.content) || ""
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
