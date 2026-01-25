"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyManager = void 0;
class ApiKeyManager {
    constructor(context) {
        this.context = context;
    }
    async saveApiKey(apiKey) {
        try {
            await this.context.secrets.store(ApiKeyManager.STORAGE_KEY, apiKey);
        }
        catch (error) {
            console.error('Failed to save API key:', error);
            throw new Error('Failed to save API key. Please try again.');
        }
    }
    async getApiKey() {
        try {
            const apiKey = await this.context.secrets.get(ApiKeyManager.STORAGE_KEY);
            return apiKey || undefined;
        }
        catch (error) {
            console.error('Failed to retrieve API key:', error);
            return undefined;
        }
    }
    async deleteApiKey() {
        try {
            await this.context.secrets.delete(ApiKeyManager.STORAGE_KEY);
        }
        catch (error) {
            console.error('Failed to delete API key:', error);
            throw new Error('Failed to delete API key.');
        }
    }
    async hasApiKey() {
        const apiKey = await this.getApiKey();
        return !!apiKey;
    }
    async getApiKeyInfo() {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            return { hasKey: false };
        }
        // Показываем только первые 4 и последние 4 символа для безопасности
        const maskedKey = apiKey.length > 8
            ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
            : '****';
        return {
            hasKey: true,
            maskedKey
        };
    }
}
exports.ApiKeyManager = ApiKeyManager;
ApiKeyManager.STORAGE_KEY = 'intelliflow.apiKey';
//# sourceMappingURL=keyManager.js.map