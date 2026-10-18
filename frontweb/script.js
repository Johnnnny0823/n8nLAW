document.addEventListener('DOMContentLoaded', () => {
    const chatSidebar = document.getElementById('chatSidebar');
    const historyList = document.getElementById('historyList');
    const newChatBtn = document.getElementById('newChatBtn');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

    // Disclaimer Banner
    const disclaimerBanner = document.getElementById('disclaimerBanner');
    const closeDisclaimerBtn = document.getElementById('closeDisclaimerBtn');

    // Configuration
    const WEBHOOK_URL = 'http://localhost:5678/webhook/c40caa34-56d0-4d64-a083-faa22af6ff99';

    // State
    let selectedFiles = [];
    let chatSessions = [];
    let currentSessionId = null;

    // Initialization
    loadHistory();

    // Check for existing active session or create new
    const lastSessionId = localStorage.getItem('lastActiveSessionId');
    if (lastSessionId && getSession(lastSessionId)) {
        loadSession(lastSessionId);
    } else {
        createNewSession();
    }

    // Sidebar Toggle
    toggleSidebarBtn.addEventListener('click', () => {
        chatSidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            chatSidebar.classList.contains('open') &&
            !chatSidebar.contains(e.target) &&
            !toggleSidebarBtn.contains(e.target)) {
            chatSidebar.classList.remove('open');
        }
    });

    // Panic Button
    const panicBtn = document.getElementById('panicBtn');
    if (panicBtn) {
        panicBtn.addEventListener('click', () => {
            // 1. Clear Local Storage
            localStorage.clear();

            // 2. Clear Session Storage
            sessionStorage.clear();

            // 3. Redirect to Google immediately
            window.location.replace('https://www.google.com');
        });
    }

    // New Chat Button
    newChatBtn.addEventListener('click', () => {
        createNewSession();
        if (window.innerWidth <= 768) {
            chatSidebar.classList.remove('open');
        }
    });

    // Session Management Functions
    function createNewSession() {
        const id = crypto.randomUUID();
        const newSession = {
            id: id,
            title: '新對話',
            timestamp: Date.now(),
            messages: [] // { text, sender, files }
        };

        chatSessions.unshift(newSession); // Add to beginning
        currentSessionId = id;
        saveSessions();
        renderHistoryList();

        // Clear UI
        chatWindow.innerHTML = '';
        // Add welcome message
        addWelcomeMessage();

        localStorage.setItem('lastActiveSessionId', currentSessionId);
        renderSuggestions(); // Add default prompts
        console.log('New Session:', id);
    }

    function loadSession(id) {
        const session = getSession(id);
        if (!session) return;

        currentSessionId = id;
        localStorage.setItem('lastActiveSessionId', currentSessionId);

        // Update UI
        chatWindow.innerHTML = '';

        if (session.messages.length === 0) {
            addWelcomeMessage();
        } else {
            session.messages.forEach(msg => {
                const isWelcome = msg.type === 'welcome';
                if (isWelcome) {
                    addWelcomeMessage();
                } else {
                    addMessageToUI(msg.text, msg.sender, msg.files || [], false); // false = don't save again
                }
            });
            // If first message was not welcome, ensure welcome is there? 
            // Design choice: preserve exact history. 
            // But if we want welcome message always at top for empty new chats, we handled it in createNewSession.
            // Existing sessions might not have welcome message in 'messages' array if we only push user/ai messages.
            // Let's stick to pushing only user/ai messages to history, and alway prepending welcome message if it's not saved.
            // Wait, standard is strictly history. 
            // Let's keep it simple: We won't save welcome message to array. We always show it at top?
            // Or we check if empty.
            if (session.messages.length > 0) {
                // Check if we need to insert welcome message at top visually? 
                // The current `addMessageToUI` appends. 
                // Let's clear and re-render.
                // We should probably always have the welcome message first?
                // Let's just prepend it manually if we want.
                // Actually, simpler: createNewSession adds it to DOM. 
                // loadSession clears DOM. So we need to add it back.
                const welcomeMsg = document.createElement('div');
                welcomeMsg.className = 'message ai-message welcome-message';
                welcomeMsg.innerHTML = `
                    <div class="avatar">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor" />
                        </svg>
                    </div>
                    <div class="message-content">你好！我是您的 AI 法律顧問。請問有什麼法律問題我可以協助您嗎？</div>`;
                chatWindow.insertBefore(welcomeMsg, chatWindow.firstChild);
            } else {
                addWelcomeMessage();
            }
        }

        // Re-attach suggestions if needed?
        // The original code has suggestions in HTML. `addWelcomeMessage` should include them or they should be separate.
        // Let's separate welcome message and suggestions.
        renderSuggestions();

        renderHistoryList();
        scrollToBottom();

        if (window.innerWidth <= 768) {
            chatSidebar.classList.remove('open');
        }
    }

    function addWelcomeMessage() {
        const welcomeHtml = `
            <div class="message ai-message welcome-message">
                <div class="avatar">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor" />
                    </svg>
                </div>
                <div class="message-content">
                    你好！我是您的 AI 法律顧問。請問有什麼法律問題我可以協助您嗎？
                </div>
            </div>`;
        chatWindow.insertAdjacentHTML('afterbegin', welcomeHtml);
    }

    function renderSuggestions() {
        // Remove existing suggestions if any to avoid duplicates
        const existing = chatWindow.querySelector('.suggestions-container');
        if (existing) existing.remove();

        const suggestionsHtml = `
            <div class="suggestions-container">
                <button class="suggestion-chip">我面臨家暴 有什麼手段保護自己</button>
                <button class="suggestion-chip">收到傳票了該怎麼辦</button>
                <button class="suggestion-chip">車禍和解注意事項</button>
                <button class="suggestion-chip">房東不退押金怎麼辦</button>
                <button class="suggestion-chip">被詐騙怎麼把錢追回來</button>
                <button class="suggestion-chip">公司無故解僱如何求償</button>
            </div>`;

        // Append after welcome message or at the end if welcome message not found (though it should be)
        // Or just append to chatWindow.
        // It should properly appear only for new chats or if no messages.
        // Usually suggestions appear only at start. 
        const session = getSession(currentSessionId);
        if (session && session.messages.length === 0) {
            chatWindow.insertAdjacentHTML('beforeend', suggestionsHtml);
            attachSuggestionListeners();
        }
    }

    function saveMessageToSession(text, sender, files) {
        const session = getSession(currentSessionId);
        if (!session) return;

        session.messages.push({
            text,
            sender,
            files: files.map(f => ({ name: f.name, type: f.type })) // Store metadata only, we can't easily store file blob in localstorage
        });

        // Update Title if it's the first user message
        if (sender === 'user' && session.title === '新對話') {
            session.title = text.length > 20 ? text.substring(0, 20) + '...' : text;
        }

        session.timestamp = Date.now();
        // Move to top
        chatSessions = chatSessions.filter(s => s.id !== currentSessionId);
        chatSessions.unshift(session);

        saveSessions();
        renderHistoryList();
    }

    function getSession(id) {
        return chatSessions.find(s => s.id === id);
    }

    function saveSessions() {
        localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    }

    function loadHistory() {
        const stored = localStorage.getItem('chatSessions');
        if (stored) {
            try {
                chatSessions = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse history', e);
                chatSessions = [];
            }
        }
    }

    function renderHistoryList(sessionsToRender = chatSessions) {
        historyList.innerHTML = '';
        sessionsToRender.forEach(session => {
            const item = document.createElement('div');
            item.classList.add('history-item');
            if (session.id === currentSessionId) {
                item.classList.add('active');
            }

            // Title
            const span = document.createElement('span');
            span.textContent = session.title || '新對話';
            item.appendChild(span);

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-chat-btn');
            deleteBtn.title = '刪除對話';
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            `;

            // Delete Logic
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('確定要刪除此對話紀錄嗎？')) {
                    deleteSession(session.id);
                }
            });

            item.appendChild(deleteBtn);

            // Switch Logic
            item.addEventListener('click', () => {
                if (currentSessionId !== session.id) {
                    loadSession(session.id);
                }
            });

            historyList.appendChild(item);
        });
    }

    // Search History Logic
    const historySearchInput = document.getElementById('historySearchInput');
    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderHistoryList(chatSessions);
                return;
            }

            const filtered = chatSessions.filter(session => {
                const title = (session.title || '新對話').toLowerCase();
                return title.includes(query);
            });
            renderHistoryList(filtered);
        });
    }

    function deleteSession(id) {
        // Remove from memory
        chatSessions = chatSessions.filter(s => s.id !== id);

        // Update storage
        saveSessions();

        // If deleted session is current one, switch to new chat
        if (id === currentSessionId) {
            createNewSession();
        } else {
            renderHistoryList();
        }
    }

    function attachSuggestionListeners() {
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.textContent;
                userInput.value = text;
                userInput.style.height = 'auto';
                userInput.focus();
                handleSend();
            });
        });
    }

    // Auto-resize textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') {
            this.style.height = 'auto';
        }
    });

    // Send message on Enter (but allow Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // File Upload Handlers
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        // ... (Upload checking logic remains same, but maybe simpler to reuse)
        files.forEach(file => {
            const currentImages = selectedFiles.filter(f => f.type.startsWith('image/')).length;
            const currentPdfs = selectedFiles.filter(f => f.type === 'application/pdf').length;

            if (file.type.startsWith('image/')) {
                if (currentImages >= 1) {
                    const index = selectedFiles.findIndex(f => f.type.startsWith('image/'));
                    if (index !== -1) selectedFiles.splice(index, 1);
                }
                selectedFiles.push(file);
            } else if (file.type === 'application/pdf') {
                if (currentPdfs >= 1) {
                    const index = selectedFiles.findIndex(f => f.type === 'application/pdf');
                    if (index !== -1) selectedFiles.splice(index, 1);
                }
                selectedFiles.push(file);
            } else {
                alert('只支援圖片和 PDF 檔案');
            }
        });
        renderFilePreviews();
        fileInput.value = '';
    });

    function renderFilePreviews() {
        filePreviewArea.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.classList.add('file-chip');
            // ... (Icon logic)
            const icon = file.type.startsWith('image/')
                ? '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16ZM4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6Z" fill="currentColor"/></svg>';

            chip.innerHTML = `
                ${icon}
                <span>${file.name}</span>
                <div class="remove-file" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
            `;
            filePreviewArea.appendChild(chip);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                selectedFiles.splice(index, 1);
                renderFilePreviews();
            });
        });
    }

    // Initial Listener attachment - REMOVED to avoid duplicate listeners (already called in renderSuggestions)
    // attachSuggestionListeners();

    // Disclaimer Logic
    let disclaimerTimeout;

    function showDisclaimer() {
        if (disclaimerBanner) {
            disclaimerBanner.classList.remove('hidden');

            // Clear existing timeout to reset timer
            if (disclaimerTimeout) clearTimeout(disclaimerTimeout);

            // Auto-hide after 5 seconds
            disclaimerTimeout = setTimeout(() => {
                disclaimerBanner.classList.add('hidden');
            }, 5000);
        }
    }

    if (closeDisclaimerBtn) {
        closeDisclaimerBtn.addEventListener('click', () => {
            disclaimerBanner.classList.add('hidden');
        });
    }

    sendBtn.addEventListener('click', handleSend);

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text && selectedFiles.length === 0) return;

        // Show disclaimer when user interacts
        showDisclaimer();

        // 1. Add user message to UI
        addMessageToUI(text, 'user', selectedFiles, true);

        // Prepare data
        const formData = new FormData();
        formData.append('message', text);
        formData.append('sessionId', currentSessionId);
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Remove suggestions once conversation starts (optional, but cleaner)
        const suggestionsFn = chatWindow.querySelector('.suggestions-container');
        if (suggestionsFn) suggestionsFn.remove();

        const filesToSend = [...selectedFiles];
        selectedFiles = [];
        renderFilePreviews();

        setInputState(false);
        const loadingId = addLoadingIndicator();

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.text();
            let aiResponse = data;
            try {
                const jsonData = JSON.parse(data);
                aiResponse = jsonData.output || jsonData.text || jsonData.message || JSON.stringify(jsonData);
            } catch (e) { }

            removeMessage(loadingId);
            addMessageToUI(aiResponse, 'ai', [], true);

        } catch (error) {
            console.error('Error:', error);
            removeMessage(loadingId);
            addMessageToUI('抱歉，連線發生錯誤，請稍後再試。', 'ai', [], false); // Don't save error messages? Or do? Maybe not.
        } finally {
            setInputState(true);
            userInput.focus();
        }
    }

    function addMessageToUI(text, sender, files = [], save = false) {
        if (save) {
            saveMessageToSession(text, sender, files);
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');

        if (sender === 'ai') {
            avatarDiv.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
                </svg>`;
        } else {
            avatarDiv.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        let contentHtml = '';

        if (files.length > 0) {
            contentHtml += '<div class="message-files" style="margin-bottom: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">';
            files.forEach(file => {
                const isImage = file.type && file.type.startsWith('image/'); // Check if we have type info
                // If loading from history, we might just have name. We can guess by extension or store type.
                // In saveMessageToSession we stored {name, type}.

                const icon = (file.type && file.type.startsWith('image/'))
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16ZM4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6Z" fill="currentColor"/></svg>';
                contentHtml += `
                    <div style="display: flex; align-items: center; gap: 0.25rem; background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.8rem;">
                        ${icon}
                        <span>${file.name}</span>
                    </div>
                `;
            });
            contentHtml += '</div>';
        }

        if (text) {
            contentHtml += formatText(text);
        }

        contentDiv.innerHTML = contentHtml;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatWindow.appendChild(messageDiv);
        scrollToBottom();
    }

    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai-message');
        messageDiv.id = id;

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
            </svg>`;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        // Replaced typing indicator with Gavel Animation
        contentDiv.innerHTML = `
            <div class="legal-loading-container">
                <svg class="gavel-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Impact Effect (Behind) -->
                    <g class="impact-effect" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0">
                        <path d="M8 32 L2 32" />
                        <path d="M32 32 L38 32" />
                        <path d="M10 28 L6 24" />
                        <path d="M30 28 L34 24" />
                    </g>
                    
                    <!-- Base -->
                    <rect class="gavel-base" x="10" y="32" width="20" height="4" rx="1" fill="currentColor" opacity="0.6"/>
                    
                    <!-- Gavel Group -->
                    <g class="gavel-handle">
                        <!-- Head -->
                        <path d="M12 12H28C29.1 12 30 12.9 30 14V20C30 21.1 29.1 22 28 22H12C10.9 22 10 21.1 10 20V14C10 12.9 10.9 12 12 12Z" fill="currentColor"/>
                        <!-- Handle -->
                        <path d="M23 22L28 32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <!-- Detail lines on head -->
                        <rect x="13" y="14" width="2" height="6" fill="rgba(0,0,0,0.2)"/>
                        <rect x="25" y="14" width="2" height="6" fill="rgba(0,0,0,0.2)"/>
                    </g>
                </svg>
            </div>`;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatWindow.appendChild(messageDiv);
        scrollToBottom();

        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function setInputState(enabled) {
        userInput.disabled = !enabled;
        sendBtn.disabled = !enabled;
        attachBtn.disabled = !enabled;
        if (enabled) {
            userInput.focus();
        }
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function formatText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        let safeText = div.innerHTML;
        safeText = safeText.replace(/\n/g, '<br>');
        return safeText;
    }
});
