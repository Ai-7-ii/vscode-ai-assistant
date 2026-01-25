import * as vscode from 'vscode';

export class ApiKeyManager {
    private static readonly STORAGE_KEY = 'intelliflow.apiKey';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async saveApiKey(apiKey: string): Promise<void> {
        try {
            await this.context.secrets.store(ApiKeyManager.STORAGE_KEY, apiKey);
        } catch (error) {
            console.error('Failed to save API key:', error);
            throw new Error('Failed to save API key. Please try again.');
        }
    }

    async getApiKey(): Promise<string | undefined> {
        try {
            const apiKey = await this.context.secrets.get(ApiKeyManager.STORAGE_KEY);
            return apiKey || undefined;
        } catch (error) {
            console.error('Failed to retrieve API key:', error);
            return undefined;
        }
    }

    async deleteApiKey(): Promise<void> {
        try {
            await this.context.secrets.delete(ApiKeyManager.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to delete API key:', error);
            throw new Error('Failed to delete API key.');
        }
    }

    async hasApiKey(): Promise<boolean> {
        const apiKey = await this.getApiKey();
        return !!apiKey;
    }

    async getApiKeyInfo(): Promise<{ hasKey: boolean; maskedKey?: string }> {
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
