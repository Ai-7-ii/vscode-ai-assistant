"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
// Временно удалим проблемные импорты
// import { DeepSeekClient } from './deepseek/client';
// import { ApiKeyManager } from './storage/keyManager';
// import { ChatPanel } from './ui/chatPanel';
function activate(context) {
    console.log('IntelliFlow extension activated!');
    // Временная простая реализация
    const commands = [
        vscode.commands.registerCommand('intelliflow.openChat', () => {
            vscode.window.showInformationMessage('IntelliFlow: Chat will be available soon!');
        }),
        vscode.commands.registerCommand('intelliflow.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your DeepSeek API key',
                password: true,
                ignoreFocusOut: true
            });
            if (apiKey) {
                // Временное сохранение
                context.globalState.update('deepseek-api-key', apiKey);
                vscode.window.showInformationMessage('API key saved successfully!');
            }
        }),
        vscode.commands.registerCommand('intelliflow.explainCode', () => {
            vscode.window.showInformationMessage('Explain command will be available soon!');
        }),
        vscode.commands.registerCommand('intelliflow.refactorCode', () => {
            vscode.window.showInformationMessage('Refactor command will be available soon!');
        }),
        vscode.commands.registerCommand('intelliflow.fixCode', () => {
            vscode.window.showInformationMessage('Fix command will be available soon!');
        }),
        vscode.commands.registerCommand('intelliflow.generateCode', () => {
            vscode.window.showInformationMessage('Generate command will be available soon!');
        })
    ];
    context.subscriptions.push(...commands);
}
exports.activate = activate;
function deactivate() {
    console.log('IntelliFlow extension deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map