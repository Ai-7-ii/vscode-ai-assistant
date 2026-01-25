import * as vscode from 'vscode';
import * as path from 'path';
import { OpenRouterClient, ChatMessage } from '../openrouter/client';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly deepSeekClient: OpenRouterClient;
    private disposables: vscode.Disposable[] = [];
    private messageHistory: ChatMessage[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, deepSeekClient: OpenRouterClient) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.deepSeekClient = deepSeekClient;

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.html = this.getWebviewContent();
        
        this.setupWebviewListeners();
    }

    public static createOrShow(extensionUri: vscode.Uri, deepSeekClient: OpenRouterClient) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'intelliflowChat',
            'IntelliFlow AI Assistant',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, deepSeekClient);
        return ChatPanel.currentPanel;
    }

    public show() {
        ChatPanel.createOrShow(this.extensionUri, this.deepSeekClient);
    }

    public async sendMessage(text: string) {
        if (!this.panel) {
            this.show();
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.panel.webview.postMessage({
            type: 'addMessage',
            message: {
                role: 'user',
                content: text,
                timestamp: new Date().toLocaleTimeString()
            }
        });

        this.messageHistory.push({ role: 'user', content: text });

        try {
            const response = await this.deepSeekClient.chat(this.messageHistory, (chunk) => {
                this.panel.webview.postMessage({
                    type: 'streamChunk',
                    chunk: chunk
                });
            });

            this.messageHistory.push({ role: 'assistant', content: response });
            
            this.panel.webview.postMessage({
                type: 'completeResponse',
                response: response
            });

        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error occurred';
            
            this.panel.webview.postMessage({
                type: 'error',
                error: errorMessage
            });
            
            vscode.window.showErrorMessage(`IntelliFlow Error: ${errorMessage}`);
        }
    }

    private setupWebviewListeners() {
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'sendMessage':
                        await this.sendMessage(message.text);
                        break;
                        
                    case 'clearChat':
                        this.messageHistory = [];
                        this.panel.webview.postMessage({
                            type: 'chatCleared'
                        });
                        break;
                        
                    case 'copyCode':
                        await vscode.env.clipboard.writeText(message.code);
                        vscode.window.showInformationMessage('Code copied to clipboard!');
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    private getWebviewContent(): string {
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'styles.css')
        );

        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'webview.js')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>IntelliFlow AI Assistant</title>
            <link rel="stylesheet" href="${styleUri}">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: #1e1e1e; 
                    color: #d4d4d4; 
                    height: 100vh; 
                    display: flex; 
                    flex-direction: column; 
                    padding: 10px; 
                }
                .header { 
                    padding: 15px; 
                    background: #252526; 
                    border-bottom: 1px solid #3e3e42; 
                    border-radius: 8px 8px 0 0;
                }
                .header h2 { 
                    color: #569cd6; 
                    margin-bottom: 5px; 
                }
                .header .subtitle { 
                    color: #9cdcfe; 
                    font-size: 12px; 
                }
                .chat-container { 
                    flex: 1; 
                    overflow-y: auto; 
                    padding: 15px; 
                    background: #252526; 
                    margin: 10px 0; 
                    border-radius: 8px;
                }
                .message { 
                    margin-bottom: 15px; 
                    padding: 12px; 
                    border-radius: 8px; 
                    animation: fadeIn 0.3s;
                }
                .user-message { 
                    background: #0e639c; 
                    margin-left: 20px; 
                    border-left: 4px solid #3794ff;
                }
                .ai-message { 
                    background: #2d2d30; 
                    margin-right: 20px; 
                    border-left: 4px solid #4ec9b0;
                }
                .message-header { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 8px; 
                    font-size: 12px; 
                    opacity: 0.8;
                }
                .message-content { 
                    line-height: 1.5; 
                    white-space: pre-wrap;
                }
                .message-content code {
                    background: #1e1e1e;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Consolas', monospace;
                }
                .message-content pre {
                    background: #1e1e1e;
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                    margin: 10px 0;
                }
                .input-container { 
                    display: flex; 
                    gap: 10px; 
                    padding: 15px; 
                    background: #252526; 
                    border-radius: 0 0 8px 8px;
                }
                #messageInput { 
                    flex: 1; 
                    padding: 12px; 
                    background: #3e3e42; 
                    border: 1px solid #4f4f52; 
                    border-radius: 4px; 
                    color: #d4d4d4; 
                    font-size: 14px;
                }
                #messageInput:focus { 
                    outline: none; 
                    border-color: #569cd6; 
                }
                button { 
                    padding: 12px 20px; 
                    background: #0e639c; 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-weight: bold;
                }
                button:hover { 
                    background: #1177bb; 
                }
                button:disabled { 
                    background: #2d2d30; 
                    cursor: not-allowed; 
                }
                .typing-indicator { 
                    display: none; 
                    padding: 10px; 
                    color: #4ec9b0; 
                    font-style: italic; 
                }
                .error { 
                    color: #f48771; 
                    padding: 10px; 
                    background: #5a1f1f; 
                    border-radius: 4px; 
                    margin: 10px 0;
                }
                .code-block { position: relative; }
                .copy-button { 
                    position: absolute; 
                    top: 5px; 
                    right: 5px; 
                    padding: 4px 8px; 
                    background: #2d2d30; 
                    border: 1px solid #3e3e42; 
                    color: #d4d4d4; 
                    cursor: pointer; 
                    font-size: 11px; 
                    border-radius: 3px;
                }
                .copy-button:hover { background: #3e3e42; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🤖 IntelliFlow AI Assistant</h2>
                <div class="subtitle">Powered by DeepSeek API • Works without VPN</div>
            </div>
            
            <div class="chat-container" id="chatContainer">
                <div class="message ai-message">
                    <div class="message-header">
                        <strong>🤖 IntelliFlow</strong>
                        <span>${new Date().toLocaleTimeString()}</span>
                    </div>
                    <div class="message-content">
                        Hello! I'm your AI coding assistant powered by DeepSeek. How can I help you today?
                        <br><br>
                        <strong>Available commands:</strong><br>
                        • Type normally for general chat<br>
                        • Start with <code>/explain</code> to explain code<br>
                        • <code>/refactor</code> to refactor code<br>
                        • <code>/fix</code> to find and fix bugs<br>
                        • <code>/generate</code> to generate new code
                    </div>
                </div>
            </div>
            
            <div class="typing-indicator" id="typingIndicator">
                🤖 IntelliFlow is typing...
            </div>
            
            <div class="input-container">
                <input type="text" id="messageInput" placeholder="Type your message or command (e.g., /explain [code])...">
                <button id="sendButton">Send</button>
            </div>
            
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;
        this.panel.dispose();
        
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
