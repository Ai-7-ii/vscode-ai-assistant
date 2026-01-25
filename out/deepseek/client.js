"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekClient = void 0;
const axios_1 = __importDefault(require("axios"));
class DeepSeekClient {
    constructor(keyManager) {
        this.keyManager = keyManager;
        this.axiosInstance = axios_1.default.create({
            baseURL: 'https://api.deepseek.com',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    async getApiKey() {
        if (!this.apiKey) {
            this.apiKey = await this.keyManager.getApiKey();
        }
        if (!this.apiKey) {
            throw new Error('API key not found. Please set your DeepSeek API key using the "IntelliFlow: Set API Key" command.');
        }
        return this.apiKey;
    }
    async chat(messages, streamCallback) {
        try {
            const apiKey = await this.getApiKey();
            const response = await this.axiosInstance.post('/chat/completions', {
                model: 'deepseek-chat',
                messages: messages,
                stream: Boolean(streamCallback),
                max_tokens: 2000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                responseType: streamCallback ? 'stream' : 'json'
            });
            if (streamCallback && response.data) {
                return await this.handleStreamResponse(response.data, streamCallback);
            }
            const data = response.data;
            return data.choices[0]?.message?.content || 'No response from AI';
        }
        catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Invalid API key. Please check your DeepSeek API key.');
            }
            else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please check your internet connection.');
            }
            else {
                console.error('DeepSeek API error:', error);
                throw new Error(`API request failed: ${error.message}`);
            }
        }
    }
    async handleStreamResponse(stream, callback) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';
            stream.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) {
                                fullResponse += content;
                                callback(content);
                            }
                        }
                        catch (e) {
                            // Ignore JSON parsing errors for incomplete chunks
                        }
                    }
                }
            });
            stream.on('end', () => {
                resolve(fullResponse);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }
    async checkApiKey() {
        try {
            const apiKey = await this.getApiKey();
            // Простой запрос для проверки ключа
            await this.axiosInstance.get('/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    clearApiKey() {
        this.apiKey = undefined;
    }
}
exports.DeepSeekClient = DeepSeekClient;
//# sourceMappingURL=client.js.map