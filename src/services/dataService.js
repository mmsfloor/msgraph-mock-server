const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { normalizeData } = require('../normalization/normalizer');
const { getExclusionConfig, shouldExcludeChat } = require('../filters/chatFilter');

class DataService {
    constructor() {
        this.chats = [];
        this.messages = [];
        this.rawData = null;
        this.initialFileHash = null;
        this.initialFileSize = null;
    }

    async getFileHash(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    async getFileSize(filePath) {
        const stat = await fs.stat(filePath);
        return stat.size;
    }

    async loadData(filePath) {
        try {
            if (!await fs.pathExists(filePath)) {
                console.error(`CRITICAL ERROR: Data file not found at ${filePath}`);
                process.exit(1);
            }

            // Compute initial hash for integrity guard
            this.initialFileHash = await this.getFileHash(filePath);
            this.initialFileSize = await this.getFileSize(filePath);

            // Read original data (read-only)
            const rawData = await fs.readJson(filePath);
            const config = await getExclusionConfig();

            // 1. Filter chats without mutating rawData
            const filteredChats = (rawData.conversations || []).filter(chat => {
                const chatInfo = {
                    id: chat.id,
                    topic: chat.displayName || "Untitled Chat"
                };
                return !shouldExcludeChat(chatInfo, config);
            });

            // 2. Normalize data (creates new internal model objects)
            const normalized = normalizeData({ conversations: filteredChats });

            // 3. Filter out "no_identity" messages
            this.chats = normalized.map(chat => {
                const validMessages = chat.normalizedMessages.filter(msg => msg.identity_type !== 'no_identity');
                const MY_MRI = "8:live:.cid.YOUR_MRI_HERE";
                const memberMap = new Map();
                for (const m of validMessages) {
                    const id = m.canonical_user_id;
                    if (!id) continue;
                    if (id === MY_MRI) continue;
                    if (!memberMap.has(id)) {
                        memberMap.set(id, { id, displayName: m.original_displayName || null });
                    }
                }
                const members = Array.from(memberMap.values());
                return {
                    ...chat,
                    members,
                    normalizedMessages: validMessages
                };
            });

            // Flatten all messages for global access
            this.messages = this.chats.reduce((acc, chat) => {
                return acc.concat(chat.normalizedMessages);
            }, []);

            // Integrity Check: Verify file has not been modified during normalization
            const currentHash = await this.getFileHash(filePath);
            const currentSize = await this.getFileSize(filePath);
            if (this.initialFileHash !== currentHash) {
                console.error('FATAL ERROR: Data file integrity violation! File was modified during server startup.');
                process.exit(1);
            }
            if (this.initialFileSize !== currentSize) {
                console.error('FATAL ERROR: Data file size changed during server startup.');
                process.exit(1);
            }

            console.log(`\n--- DATA INTEGRITY VERIFIED ---`);
            console.log(`Total conversations: ${this.chats.length}`);
            console.log(`Total messages: ${this.messages.length}`);
            
            if (this.chats.length > 0) {
                const msgCounts = this.chats.map(c => c.normalizedMessages.length);
                console.log(`Max messages per chat: ${Math.max(...msgCounts)}`);
                console.log(`Min messages per chat: ${Math.min(...msgCounts)}`);
            }
            console.log(`File hash (SHA256): ${currentHash}`);
            console.log(`File size (bytes): ${currentSize}`);
            console.log(`-------------------------------\n`);

        } catch (error) {
            console.error('Error loading data:', error);
            process.exit(1);
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
