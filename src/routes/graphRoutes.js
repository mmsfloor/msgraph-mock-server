const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const { mapToGraphChat, mapToGraphMessage, wrapResponse } = require('../mappers/graphMapper');
const { processQuery } = require('../services/queryProcessor');

/**
 * GET /v1.0/me/chats
 * List all chats (filtered and normalized)
 */
router.get('/me/chats', (req, res) => {
    const chats = dataService.getChats();
    const mapped = chats.map(mapToGraphChat);
    
    // Construct full base URL for nextLink
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const { items, nextLink } = processQuery(mapped, req.query, fullUrl);
    
    res.json(wrapResponse(items, nextLink));
});

/**
 * GET /v1.0/me/chats/{chatId}
 * Get single chat
 */
router.get('/me/chats/:chatId', (req, res) => {
    const chat = dataService.getChatById(req.params.chatId);
    if (!chat) {
        return res.status(404).json({ error: { message: "Chat not found" } });
    }
    res.json(mapToGraphChat(chat));
});

/**
 * GET /v1.0/me/chats/{chatId}/messages
 * List messages in a specific chat
 */
router.get('/me/chats/:chatId/messages', (req, res) => {
    const debug = req.query.debug === 'true';
    const messages = dataService.getMessagesByChatId(req.params.chatId);
    const mapped = messages.map(msg => mapToGraphMessage(msg, debug));
    
    // Construct full base URL for nextLink
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const { items, nextLink } = processQuery(mapped, req.query, fullUrl);
    
    res.json(wrapResponse(items, nextLink));
});

/**
 * GET /v1.0/me/chats/{chatId}/messages/delta
 * Delta skeleton for chat messages
 */
router.get('/me/chats/:chatId/messages/delta', (req, res) => {
    const debug = req.query.debug === 'true';
    const messages = dataService.getMessagesByChatId(req.params.chatId);
    const mapped = messages.map(msg => mapToGraphMessage(msg, debug));
    
    // Construct full base URL for nextLink
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const { items, nextLink } = processQuery(mapped, req.query, fullUrl);
    
    // Build fully qualified absolute URL for deltaLink
    const url = new URL(fullUrl);
    url.searchParams.set('$deltaToken', `mock-token-${Date.now()}`);
    const deltaLink = url.toString();

    res.json(wrapResponse(items, nextLink, deltaLink));
});

/**
 * GET /v1.0/messages/delta
 * Global delta skeleton for messages
 */
router.get('/messages/delta', (req, res) => {
    const debug = req.query.debug === 'true';
    const messages = dataService.getAllMessages();
    const mapped = messages.map(msg => mapToGraphMessage(msg, debug));
    
    // Construct full base URL for nextLink
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const { items, nextLink } = processQuery(mapped, req.query, fullUrl);
    
    // Build fully qualified absolute URL for deltaLink
    const url = new URL(fullUrl);
    url.searchParams.set('$deltaToken', `mock-token-global-${Date.now()}`);
    const deltaLink = url.toString();

    res.json(wrapResponse(items, nextLink, deltaLink));
});

module.exports = router;
