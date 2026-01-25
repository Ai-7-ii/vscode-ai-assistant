import * as vscode from 'vscode';
import * as path from 'path';
import { OpenRouterClient, ChatMessage } from './openrouter/client';

// Система переводов
const i18n = {
  english: {
    welcome: "Hello! I'm your AI coding assistant powered by OpenRouter",
    setApiKey: "Set OpenRouter API Key",
    explain: "Explain Code",
    refactor: "Refactor Code",
    fix: "Fix Code",
    generate: "Generate Code",
    apiKeyPlaceholder: "Enter your OpenRouter API key",
    apiKeySaved: "API key saved successfully!",
    noEditor: "No active text editor",
    selectCode: "Please select some code first",
    thinking: "🤖 IntelliFlow is thinking...",
    errorApiKey: "API key not set. Please set your OpenRouter API key in settings or click the gear icon.",
    errorInvalidKey: "Invalid API key. Please check your OpenRouter API key.",
    errorLimit: "Daily limit reached (100 free requests/day). Try again tomorrow or use a different API key.",
    howToUse: "How to use:",
    step1: "1. Click ⚙️ to set your OpenRouter API key",
    step2: "2. Get free key from openrouter.ai (100 requests/day)",
    step3: "3. Type messages below or use right-click commands",
    commands: "Commands:",
    commandExplain: "• Right-click code → Explain Code",
    commandRefactor: "• Right-click code → Refactor Code",
    commandFix: "• Right-click code → Fix Code",
    commandGenerate: "• Right-click code → Generate Code"
  },
  russian: {
    welcome: "Привет! Я ваш AI-ассистент для программирования от OpenRouter",
    setApiKey: "Установить API ключ OpenRouter",
    explain: "Объяснить код",
    refactor: "Рефакторить код",
    fix: "Исправить код",
    generate: "Сгенерировать код",
    apiKeyPlaceholder: "Введите ваш API ключ OpenRouter",
    apiKeySaved: "API ключ успешно сохранён!",
    noEditor: "Нет активного редактора кода",
    selectCode: "Пожалуйста, выделите код сначала",
    thinking: "🤖 IntelliFlow думает...",
    errorApiKey: "API ключ не установлен. Установите ваш API ключ OpenRouter в настройках.",
    errorInvalidKey: "Неверный API ключ. Проверьте ваш API ключ OpenRouter.",
    errorLimit: "Дневной лимит исчерпан (100 бесплатных запросов/день). Попробуйте завтра или используйте другой ключ.",
    howToUse: "Как использовать:",
    step1: "1. Нажмите ⚙️ чтобы установить API ключ OpenRouter",
    step2: "2. Получите бесплатный ключ на openrouter.ai (100 запросов/день)",
    step3: "3. Пишите сообщения ниже или используйте команды по правой кнопке",
    commands: "Команды:",
    commandExplain: "• Правый клик на коде → Объяснить код",
    commandRefactor: "• Правый клик на коде → Рефакторить код",
    commandFix: "• Правый клик на коде → Исправить код",
    commandGenerate: "• Правый клик на коде → Сгенерировать код"
  }
};

export function activate(context: vscode.ExtensionContext) {
  console.log('IntelliFlow extension activated!');

  // Создаем клиент OpenRouter
  const openRouterClient = new OpenRouterClient();

  // Получаем язык из настроек
  const language = vscode.workspace.getConfiguration().get<string>('intelliflow.language') || 'english';
  const t = i18n[language as keyof typeof i18n] || i18n.english;

  // Создаем Webview Provider для панели чата
  const provider = new ChatViewProvider(context.extensionUri, openRouterClient, t);

  // Регистрируем Webview View
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'intelliflow.chatView',
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Регистрируем команды
  const commands = [
    // Установить API ключ
    vscode.commands.registerCommand('intelliflow.setApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: t.apiKeyPlaceholder,
        password: true,
        ignoreFocusOut: true
      });

      if (apiKey) {
        // Очищаем ключ от пробелов
        const cleanApiKey = apiKey.trim().replace(/\s+/g, '');
        
        // Сохраняем в глобальных настройках
        await vscode.workspace.getConfiguration().update(
          'intelliflow.apiKey',
          cleanApiKey,
          vscode.ConfigurationTarget.Global
        );

        openRouterClient.setApiKey(cleanApiKey);
        vscode.window.showInformationMessage(t.apiKeySaved);
        provider.refresh();
      }
    }),

    // Объяснить код
    vscode.commands.registerCommand('intelliflow.explainCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(t.noEditor);
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showWarningMessage(t.selectCode);
        return;
      }

      provider.sendMessageToWebview(`/explain\n${text}`);
    }),

    // Рефакторинг кода
    vscode.commands.registerCommand('intelliflow.refactorCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(t.noEditor);
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showWarningMessage(t.selectCode);
        return;
      }

      provider.sendMessageToWebview(`/refactor\n${text}`);
    }),

    // Исправить код
    vscode.commands.registerCommand('intelliflow.fixCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(t.noEditor);
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showWarningMessage(t.selectCode);
        return;
      }

      provider.sendMessageToWebview(`/fix\n${text}`);
    }),

    // Сгенерировать код
    vscode.commands.registerCommand('intelliflow.generateCode', async () => {
      const prompt = await vscode.window.showInputBox({
        prompt: 'Enter code generation prompt',
        placeHolder: 'e.g., Create a React component that...'
      });

      if (prompt) {
        provider.sendMessageToWebview(`/generate\n${prompt}`);
      }
    }),

    // Открыть чат
    vscode.commands.registerCommand('intelliflow.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.intelliflow-sidebar');
    })
  ];

  context.subscriptions.push(...commands);

  // Загружаем сохранённый API ключ при старте
  const savedApiKey = vscode.workspace.getConfiguration().get<string>('intelliflow.apiKey');
  if (savedApiKey) {
    openRouterClient.setApiKey(savedApiKey);
    console.log('OpenRouter API key loaded from settings');
  }
}

export function deactivate() {
  console.log('IntelliFlow extension deactivated');
}

class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _openRouterClient: OpenRouterClient;
  private _t: any;

  constructor(extensionUri: vscode.Uri, openRouterClient: OpenRouterClient, translations: any) {
    this._extensionUri = extensionUri;
    this._openRouterClient = openRouterClient;
    this._t = translations;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Обработка сообщений от Webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log('📨 Message from webview:', data.type);
      
      switch (data.type) {
        case 'sendMessage':
          await this._handleUserMessage(data.text);
          break;
        case 'setApiKey':
          await this._handleSetApiKey(data.apiKey);
          break;
        case 'getApiKey':
          await this._sendApiKeyToWebview();
          break;
        case 'openSettings':
          await this._handleOpenSettings();
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent(this._view.webview);
    }
  }

  public sendMessageToWebview(message: string) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'addMessage',
        message: {
          role: 'user',
          content: message,
          timestamp: new Date().toLocaleTimeString()
        }
      });

      // Автоматически отправляем на обработку
      this._handleUserMessage(message);
    }
  }

  private async _handleUserMessage(text: string) {
    if (!this._view) { return; }

    // Показываем индикатор загрузки
    this._view.webview.postMessage({ type: 'showLoading' });

    try {
      // Получаем API ключ из настроек
      const apiKey = vscode.workspace.getConfiguration().get<string>('intelliflow.apiKey');

      if (!apiKey) {
        this._view.webview.postMessage({
          type: 'error',
          error: this._t.errorApiKey
        });
        return;
      }

      // Отладка: что в ключе
      console.log('🔑 Key analysis for request:');
      console.log('- Length:', apiKey.length);
      console.log('- First 10 chars:', apiKey.substring(0, 10));
      console.log('- Last 10 chars:', apiKey.substring(Math.max(0, apiKey.length - 10)));

      // Очищаем ключ перед использованием
      const cleanApiKey = apiKey.trim().replace(/\s+/g, '');
      
      // Устанавливаем ключ в клиент
      this._openRouterClient.setApiKey(cleanApiKey);

      // Определяем системный промпт в зависимости от команды
      let systemMessage = '';
      if (text.startsWith('/explain')) {
        systemMessage = 'You are an expert programming assistant. Explain the following code in detail.';
        text = text.replace('/explain\n', '');
      } else if (text.startsWith('/refactor')) {
        systemMessage = 'You are an expert software engineer. Refactor the following code.';
        text = text.replace('/refactor\n', '');
      } else if (text.startsWith('/fix')) {
        systemMessage = 'You are an expert debugger. Find and fix any bugs in the following code.';
        text = text.replace('/fix\n', '');
      } else if (text.startsWith('/generate')) {
        systemMessage = 'You are an expert code generator. Generate code based on the following prompt.';
        text = text.replace('/generate\n', '');
      } else {
        systemMessage = 'You are an expert AI programming assistant. Help with coding questions.';
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: text }
      ];

      // Отправляем запрос к OpenRouter
      const response = await this._openRouterClient.chat(messages);

      this._view.webview.postMessage({
        type: 'addMessage',
        message: {
          role: 'assistant',
          content: response,
          timestamp: new Date().toLocaleTimeString()
        }
      });

    } catch (error: any) {
      console.error('Error in _handleUserMessage:', error);
      
      let errorMessage = error.message || 'Unknown error';
      
      // Специальная обработка для ошибки лимита
      if (errorMessage.includes('Daily limit reached')) {
        errorMessage = this._t.errorLimit;
      } else if (errorMessage.includes('Invalid API key')) {
        errorMessage = this._t.errorInvalidKey;
      }

      this._view.webview.postMessage({
        type: 'error',
        error: errorMessage
      });
      
      vscode.window.showErrorMessage(`IntelliFlow Error: ${errorMessage}`);
    }
  }

  private async _handleSetApiKey(apiKey: string) {
    // Очищаем ключ от пробелов
    const cleanApiKey = apiKey.trim().replace(/\s+/g, '');
    
    console.log('💾 Saving API key (cleaned, length:', cleanApiKey.length, ')');
    
    await vscode.workspace.getConfiguration().update(
      'intelliflow.apiKey',
      cleanApiKey,
      vscode.ConfigurationTarget.Global
    );

    this._openRouterClient.setApiKey(cleanApiKey);

    if (this._view) {
      this._view.webview.postMessage({ type: 'apiKeySet' });
    }
  }

  private async _sendApiKeyToWebview() {
    const apiKey = vscode.workspace.getConfiguration().get<string>('intelliflow.apiKey');
    const hasKey = !!apiKey;
    const maskedKey = hasKey && apiKey!.length > 8
      ? `${apiKey!.substring(0, 4)}...${apiKey!.substring(apiKey!.length - 4)}`
      : '';

    if (this._view) {
      this._view.webview.postMessage({
        type: 'apiKeyInfo',
        hasKey,
        maskedKey
      });
    }
  }

  private async _handleOpenSettings() {
    if (this._view) {
      // Показываем панель настроек в webview
      this._view.webview.postMessage({
        type: 'showSettingsPanel',
        show: true
      });
      
      // Отправляем информацию о текущем ключе
      await this._sendApiKeyToWebview();
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'src', 'ui', 'webview.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntelliFlow AI Assistant</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 0;
    }
    .header {
      padding: 15px;
      background: #252526;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h2 {
      color: #569cd6;
      margin: 0;
      font-size: 14px;
    }
    .settings-btn {
      background: none;
      border: none;
      color: #9cdcfe;
      cursor: pointer;
      font-size: 16px;
      padding: 5px;
    }
    .settings-btn:hover {
      color: #fff;
    }
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      background: #252526;
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
    .input-container {
      display: flex;
      gap: 10px;
      padding: 15px;
      background: #252526;
      border-top: 1px solid #3e3e42;
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
    #sendButton {
      padding: 12px 20px;
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    #sendButton:hover {
      background: #1177bb;
    }
    #sendButton:disabled {
      background: #2d2d30;
      cursor: not-allowed;
    }
    .loading {
      display: none;
      padding: 10px;
      color: #4ec9b0;
      font-style: italic;
      text-align: center;
    }
    .error {
      color: #f48771;
      padding: 10px;
      background: #5a1f1f;
      border-radius: 4px;
      margin: 10px 0;
    }
    .settings-panel {
      display: none;
      padding: 20px;
      background: #252526;
    }
    .api-key-input {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      background: #3e3e42;
      border: 1px solid #4f4f52;
      color: #d4d4d4;
      border-radius: 4px;
    }
    .save-btn {
      padding: 10px 20px;
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>
</head>
<body>
  <div class="header">
    <h2>🤖 IntelliFlow AI Assistant</h2>
    <button class="settings-btn" id="settingsBtn">⚙️</button>
  </div>

  <div class="settings-panel" id="settingsPanel">
    <h3>API Settings</h3>
    <p>Get your FREE API key from <a href="https://openrouter.ai" target="_blank">OpenRouter.ai</a> (100 requests/day)</p>
    <input type="password" class="api-key-input" id="apiKeyInput" placeholder="Enter your OpenRouter API key">
    <button class="save-btn" id="saveApiKeyBtn">Save API Key</button>
    <div id="apiKeyStatus" style="margin-top: 10px; font-size: 12px; display: none;"></div>
  </div>

  <div class="chat-container" id="chatContainer">
    <div class="message ai-message">
      <div class="message-header">
        <strong>🤖 IntelliFlow</strong>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="message-content">
        ${this._t.welcome}
        <br><br>
        <strong>${this._t.howToUse}</strong><br>
        ${this._t.step1}<br>
        ${this._t.step2}<br>
        ${this._t.step3}<br>
        <br>
        <strong>${this._t.commands}</strong><br>
        ${this._t.commandExplain}<br>
        ${this._t.commandRefactor}<br>
        ${this._t.commandFix}<br>
        ${this._t.commandGenerate}
      </div>
    </div>
  </div>

  <div class="loading" id="loadingIndicator">
    ${this._t.thinking}
  </div>

  <div class="input-container">
    <input type="text" id="messageInput" placeholder="Type your message...">
    <button id="sendButton">Send</button>
  </div>

  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}/ /   L a s t   u p d a t e d :   2 0 2 6 - 0 1 - 2 5   1 9 : 1 5 : 5 6  
 
// Local version - 01/25/2026 19:53:11
