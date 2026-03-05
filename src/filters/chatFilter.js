const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const EXCLUDED_CHATS_FILE = path.join(process.cwd(), 'excludedChats.json');

/**
 * Loads excluded chats configuration.
 * Priority: config file, then environment variables (if any).
 */
async function getExclusionConfig() {
    let config = {
        excludeByTopic: [],
        excludeByContains: [],
        excludeById: []
    };

    if (await fs.pathExists(EXCLUDED_CHATS_FILE)) {
        try {
            const fileContent = await fs.readJson(EXCLUDED_CHATS_FILE);
            config = { ...config, ...fileContent };
        } catch (error) {
            console.error('Error reading excludedChats.json:', error);
        }
    }

    // Merge with environment variables if present
    // Expecting JSON strings in env vars like EXCLUDE_BY_TOPIC='["BroadNet"]'
    if (process.env.EXCLUDE_BY_TOPIC) {
        try {
            config.excludeByTopic = [...new Set([...config.excludeByTopic, ...JSON.parse(process.env.EXCLUDE_BY_TOPIC)])];
        } catch (e) {}
    }
    if (process.env.EXCLUDE_BY_CONTAINS) {
        try {
            config.excludeByContains = [...new Set([...config.excludeByContains, ...JSON.parse(process.env.EXCLUDE_BY_CONTAINS)])];
        } catch (e) {}
    }
    if (process.env.EXCLUDE_BY_ID) {
        try {
            config.excludeById = [...new Set([...config.excludeById, ...JSON.parse(process.env.EXCLUDE_BY_ID)])];
        } catch (e) {}
    }

    return config;
}

/**
 * Filters chats based on exclusion config.
 */
function shouldExcludeChat(chat, config) {
    const { id, topic } = chat;

    // Exclude by ID
    if (config.excludeById.includes(id)) return true;

    // Exclude by Topic (exact match)
    if (config.excludeByTopic.includes(topic)) return true;

    // Exclude by Contains (partial match)
    if (config.excludeByContains.some(term => 
    topic.toLowerCase().includes(term.toLowerCase()) ||
    id.toLowerCase().includes(term.toLowerCase())
)) return true;

    return false;
}

module.exports = {
    getExclusionConfig,
    shouldExcludeChat
};
