(function() {
    const vscode = acquireVsCodeApi();
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyStatus = document.getElementById('apiKeyStatus');

    let isProcessing = false;
    let hasApiKey = false;

    // Скрываем статус ключа при загрузке
    if (apiKeyStatus) {
        apiKeyStatus.style.display = 'none';
    }

    // 1. КНОПКА НАСТРОЕК
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            console.log('⚙️ Settings button clicked');
            
            if (settingsPanel) {
                const isVisible = settingsPanel.style.display === 'block';
                settingsPanel.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    vscode.postMessage({ type: 'getApiKey' });
                    
                    setTimeout(function() {
                        if (apiKeyInput) {
                            apiKeyInput.focus();
                        }
                    }, 100);
                }
            }
        });
    }

    // 2. КНОПКА СОХРАНЕНИЯ API КЛЮЧА
    if (saveApiKeyBtn && apiKeyInput) {
        saveApiKeyBtn.addEventListener('click', function() {
            console.log('💾 Save API Key clicked');
            
            // Анимация нажатия
            saveApiKeyBtn.style.opacity = '0.7';
            saveApiKeyBtn.style.transform = 'scale(0.95)';
            
            const apiKey = apiKeyInput.value.trim();
            
            if (!apiKey) {
                if (apiKeyStatus) {
                    apiKeyStatus.style.display = 'block';
                    apiKeyStatus.innerHTML = '❌ Please enter API key first';
                    apiKeyStatus.style.color = '#f48771';
                }
                setTimeout(() => {
                    saveApiKeyBtn.style.opacity = '1';
                    saveApiKeyBtn.style.transform = 'scale(1)';
                }, 300);
                return;
            }
            
            // Показываем сохранение
            if (apiKeyStatus) {
                apiKeyStatus.style.display = 'block';
                apiKeyStatus.innerHTML = '⏳ Saving...';
                apiKeyStatus.style.color = '#9cdcfe';
            }
            
            // Блокируем кнопку
            saveApiKeyBtn.disabled = true;
            saveApiKeyBtn.textContent = 'Saving...';
            saveApiKeyBtn.style.cursor = 'wait';
            
            // Очищаем ключ от пробелов
            const cleanApiKey = apiKey.replace(/\s+/g, '');
            
            console.log('📤 Sending API key (length:', cleanApiKey.length, ')');
            
            vscode.postMessage({ 
                type: 'setApiKey', 
                apiKey: cleanApiKey 
            });
            
            apiKeyInput.value = '';
            
            // Автовосстановление
            setTimeout(() => {
                saveApiKeyBtn.disabled = false;
                saveApiKeyBtn.textContent = 'Save API Key';
                saveApiKeyBtn.style.opacity = '1';
                saveApiKeyBtn.style.transform = 'scale(1)';
                saveApiKeyBtn.style.cursor = 'pointer';
            }, 5000);
        });
        
        apiKeyInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveApiKeyBtn.click();
            }
        });
    }

    // 3. ФУНКЦИЯ ДОБАВЛЕНИЯ СООБЩЕНИЙ
    function addMessageToChat(message, isUser = false) {
        if (!chatContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${isUser ? '👤 You' : '🤖 IntelliFlow'}</strong>
                <span>${timestamp}</span>
            </div>
            <div class="message-content">${formatMessage(message)}</div>
        `;
        
        chatContainer.appendChild(messageElement);
        scrollToBottom();
    }

    // 4. ФОРМАТИРОВАНИЕ СООБЩЕНИЙ
    function formatMessage(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        let formatted = div.innerHTML;
        
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, 
            '<pre><code class="language-$1">$2</code></pre>');
        
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    // 5. ИНДИКАТОР ЗАГРУЗКИ
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        scrollToBottom();
    }

    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // 6. ОТПРАВКА СООБЩЕНИЙ
    function sendMessage() {
        if (!messageInput || !sendButton) return;
        
        const text = messageInput.value.trim();
        if (!text || isProcessing) return;

        // Проверка API ключа перед отправкой
        if (!hasApiKey) {
            if (apiKeyStatus) {
                apiKeyStatus.style.display = 'block';
                apiKeyStatus.innerHTML = '❌ Please set API key first (click ⚙️)';
                apiKeyStatus.style.color = '#f48771';
            }
            if (settingsPanel) {
                settingsPanel.style.display = 'block';
            }
            return;
        }

        isProcessing = true;
        sendButton.disabled = true;
        messageInput.disabled = true;
        
        addMessageToChat(text, true);
        showLoading();
        
        vscode.postMessage({
            type: 'sendMessage',
            text: text
        });
        
        messageInput.value = '';
    }

    // 7. ОБРАБОТЧИКИ СОБЫТИЙ
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // 8. ОБРАБОТКА СООБЩЕНИЙ ОТ РАСШИРЕНИЯ
    window.addEventListener('message', function(event) {
        const message = event.data;
        console.log('📨 Message from extension:', message.type);
        
        switch (message.type) {
            case 'addMessage':
                if (message.message) {
                    addMessageToChat(message.message.content, message.message.role === 'user');
                }
                hideLoading();
                isProcessing = false;
                if (sendButton) sendButton.disabled = false;
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.focus();
                }
                break;
                
            case 'error':
                hideLoading();
                const errorElement = document.createElement('div');
                errorElement.className = 'error';
                errorElement.textContent = `Error: ${message.error}`;
                if (chatContainer) {
                    chatContainer.appendChild(errorElement);
                }
                
                isProcessing = false;
                if (sendButton) sendButton.disabled = false;
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.focus();
                }
                break;
                
            case 'apiKeyInfo':
                hasApiKey = message.hasKey;
                
                if (apiKeyStatus) {
                    if (message.hasKey) {
                        apiKeyStatus.style.display = 'block';
                        apiKeyStatus.innerHTML = `✅ API key: ${message.maskedKey}`;
                        apiKeyStatus.style.color = '#4ec9b0';
                    } else {
                        apiKeyStatus.style.display = 'none';
                        apiKeyStatus.innerHTML = '';
                    }
                }
                break;
                
            case 'apiKeySet':
                console.log('✅ API key saved successfully');
                hasApiKey = true;
                
                if (apiKeyStatus) {
                    apiKeyStatus.style.display = 'block';
                    apiKeyStatus.innerHTML = '✅ API key saved successfully!';
                    apiKeyStatus.style.color = '#4ec9b0';
                }
                
                if (saveApiKeyBtn) {
                    saveApiKeyBtn.disabled = false;
                    saveApiKeyBtn.textContent = 'Save API Key';
                    saveApiKeyBtn.style.opacity = '1';
                    saveApiKeyBtn.style.transform = 'scale(1)';
                    saveApiKeyBtn.style.cursor = 'pointer';
                }
                
                if (settingsPanel) {
                    settingsPanel.style.display = 'none';
                }
                break;
                
            case 'showLoading':
                showLoading();
                break;
        }
        
        scrollToBottom();
    });

    // 9. ЗАПРОС СТАТУСА API КЛЮЧА ПРИ ЗАГРУЗКЕ
    setTimeout(function() {
        vscode.postMessage({ type: 'getApiKey' });
    }, 500);
    
    // 10. ФОКУС НА ПОЛЕ ВВОДА
    if (messageInput) {
        setTimeout(function() {
            messageInput.focus();
        }, 1000);
    }
})();