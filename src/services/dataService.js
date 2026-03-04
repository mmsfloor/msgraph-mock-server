const fs = require('fs-extra');
const path = require('path');
const { normalizeData } = require('../normalization/normalizer');
const { getExclusionConfig, shouldExcludeChat } = require('../filters/chatFilter');

class DataService {
    constructor() {
        this.chats = [];
        this.messages = [];
        this.rawData = null;
    }

    async loadData(filePath) {
        try {
            if (!await fs.pathExists(filePath)) {
                console.error(`File not found: ${filePath}`);
                return;
            }

            const rawData = await fs.readJson(filePath);
            const config = await getExclusionConfig();

            // 1. Filter chats
            const filteredChats = (rawData.conversations || []).filter(chat => {
                const chatInfo = {
                    id: chat.id,
                    topic: chat.displayName || "Untitled Chat"
                };
                return !shouldExcludeChat(chatInfo, config);
            });

            // 2. Normalize data
            const normalized = normalizeData({ conversations: filteredChats });

            // 3. Filter out "no_identity" messages
            this.chats = normalized.map(chat => {
                const validMessages = chat.normalizedMessages.filter(msg => msg.identity_type !== 'no_identity');
                return {
                    ...chat,
                    normalizedMessages: validMessages
                };
            });

            // Flatten all messages for global access
            this.messages = this.chats.reduce((acc, chat) => {
                return acc.concat(chat.normalizedMessages);
            }, []);

            console.log(`Loaded ${this.chats.length} chats and ${this.messages.length} messages.`);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    getChats() {
        return this.chats;
    }

    getChatById(chatId) {
        return this.chats.find(c => c.id === chatId);
    }

    getMessagesByChatId(chatId) {
        const chat = this.getChatById(chatId);
        return chat ? chat.normalizedMessages : [];
    }

    getAllMessages() {
        return this.messages;
    }
}

module.exports = new DataService();
