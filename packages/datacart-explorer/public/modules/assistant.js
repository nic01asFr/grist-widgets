/**
 * DataCart Explorer - Assistant Module
 * AI-powered natural language to SQL conversion
 */

const Assistant = {
    // State
    chatHistory: [],
    isGenerating: false,
    currentDatabase: CONFIG.defaults.database,
    
    // Callbacks
    onSQLGenerated: null,

    /**
     * Initialize assistant
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Generate SQL button
        const generateBtn = document.getElementById('btn-generate-sql');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateSQL());
        }
        
        // Chat input - Enter to send (Shift+Enter for newline)
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.generateSQL();
                }
            });
        }
        
        // Example chips
        document.querySelectorAll('.example-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.dataset.query;
                if (query && chatInput) {
                    chatInput.value = query;
                    chatInput.focus();
                }
            });
        });
        
        // History button
        const historyBtn = document.getElementById('btn-chat-history');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.showHistory());
        }
        
        // Help button
        const helpBtn = document.getElementById('btn-assistant-help');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelp());
        }
    },

    /**
     * Set current database context
     */
    setDatabase(database) {
        this.currentDatabase = database;
    },

    /**
     * Generate SQL from natural language
     */
    async generateSQL() {
        const chatInput = document.getElementById('chat-input');
        const question = chatInput?.value?.trim();
        
        if (!question) {
            Utils.showToast('Veuillez saisir une question', 'warning');
            return;
        }
        
        if (this.isGenerating) {
            return;
        }
        
        this.isGenerating = true;
        this.setGeneratingState(true);
        
        // Add user message to chat
        this.addMessage('user', question);
        chatInput.value = '';
        
        try {
            // Build context from selected table if any
            const selectedTable = Explorer.getSelectedTable();
            const context = this.buildContext(selectedTable);
            
            const baseUrl = GristBridge.getN8nBaseUrl();
            const response = await Utils.fetchWithTimeout(
                `${baseUrl}${CONFIG.endpoints.nl2sql}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: question,
                        database: this.currentDatabase,
                        context: context,
                        history: this.chatHistory.slice(-6) // Last 3 exchanges
                    })
                },
                60000 // 60 second timeout for AI
            );
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Erreur HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Add assistant response
            this.addAssistantResponse(result);
            
            // Store in history
            this.chatHistory.push({
                role: 'user',
                content: question
            });
            this.chatHistory.push({
                role: 'assistant',
                content: result.explanation || '',
                sql: result.sql
            });
            
        } catch (error) {
            console.error('SQL generation failed:', error);
            this.addErrorMessage(error.message);
        } finally {
            this.isGenerating = false;
            this.setGeneratingState(false);
        }
    },

    /**
     * Build context for AI
     */
    buildContext(selectedTable) {
        const context = {
            database: this.currentDatabase,
            databaseInfo: CONFIG.databases[this.currentDatabase]
        };
        
        if (selectedTable) {
            context.selectedTable = {
                schema: selectedTable.schema,
                name: selectedTable.name,
                fullName: selectedTable.fullName,
                columns: selectedTable.columns?.map(c => ({
                    name: c.name || c.column_name,
                    type: c.type || c.data_type,
                    comment: c.comment
                })),
                hasGeometry: selectedTable.hasGeometry,
                comment: selectedTable.comment
            };
        }
        
        // Add available schemas overview
        const schemas = Explorer.schemas[this.currentDatabase];
        if (schemas) {
            context.availableSchemas = Object.keys(schemas).map(schemaName => ({
                name: schemaName,
                tables: Object.keys(schemas[schemaName].tables || {}).slice(0, 20)
            }));
        }
        
        return context;
    },

    /**
     * Add user message to chat
     */
    addMessage(role, content) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        
        // Remove welcome message if present
        const welcome = container.querySelector('.chat-welcome');
        if (welcome) {
            welcome.remove();
        }
        
        const message = document.createElement('div');
        message.className = `chat-message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        
        message.innerHTML = `
            <div class="chat-avatar">${avatar}</div>
            <div class="chat-bubble">
                <p>${Utils.sanitizeHTML(content)}</p>
            </div>
        `;
        
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Add assistant response with SQL
     */
    addAssistantResponse(result) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = 'chat-message assistant';
        
        let warningsHtml = '';
        if (result.warnings && result.warnings.length > 0) {
            warningsHtml = `
                <div class="chat-warnings">
                    ${result.warnings.map(w => `<p>⚠️ ${Utils.sanitizeHTML(w)}</p>`).join('')}
                </div>
            `;
        }
        
        let sqlPreview = '';
        if (result.sql) {
            const formattedSQL = Utils.formatSQL(result.sql);
            sqlPreview = `
                <pre class="chat-sql-preview">${Utils.sanitizeHTML(formattedSQL)}</pre>
            `;
        }
        
        message.innerHTML = `
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">
                <p>${Utils.sanitizeHTML(result.explanation || 'Voici la requête SQL générée :')}</p>
                ${sqlPreview}
                ${warningsHtml}
                ${result.sql ? `
                    <div class="chat-actions-inline">
                        <button class="btn btn-sm btn-primary btn-use-sql">✅ Utiliser</button>
                        <button class="btn btn-sm btn-secondary btn-copy-sql">📋 Copier</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
        
        // Setup action buttons
        if (result.sql) {
            const useBtn = message.querySelector('.btn-use-sql');
            const copyBtn = message.querySelector('.btn-copy-sql');
            
            useBtn?.addEventListener('click', () => {
                if (this.onSQLGenerated) {
                    this.onSQLGenerated(result.sql);
                }
            });
            
            copyBtn?.addEventListener('click', () => {
                navigator.clipboard.writeText(result.sql).then(() => {
                    Utils.showToast('SQL copié dans le presse-papier', 'success');
                });
            });
        }
    },

    /**
     * Add error message to chat
     */
    addErrorMessage(errorMessage) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = 'chat-message assistant';
        
        message.innerHTML = `
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">
                <p>❌ Désolé, je n'ai pas pu générer la requête SQL.</p>
                <p style="color: var(--color-error); font-size: var(--text-xs);">${Utils.sanitizeHTML(errorMessage)}</p>
                <p style="font-size: var(--text-xs); margin-top: var(--space-2);">
                    💡 Essayez de reformuler votre question ou de sélectionner une table dans l'explorateur.
                </p>
            </div>
        `;
        
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Set generating state (loading)
     */
    setGeneratingState(isGenerating) {
        const btn = document.getElementById('btn-generate-sql');
        const input = document.getElementById('chat-input');
        
        if (btn) {
            btn.disabled = isGenerating;
            btn.innerHTML = isGenerating ? 
                '<div class="spinner"></div><span>Génération...</span>' :
                '<span class="btn-icon">🪄</span><span>Générer SQL</span>';
        }
        
        if (input) {
            input.disabled = isGenerating;
        }
    },

    /**
     * Show chat history
     */
    showHistory() {
        if (this.chatHistory.length === 0) {
            Utils.showToast('Aucun historique de conversation', 'info');
            return;
        }
        
        // TODO: Implement history modal
        Utils.showToast(`${Math.floor(this.chatHistory.length / 2)} échanges dans l'historique`, 'info');
    },

    /**
     * Show help
     */
    showHelp() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        
        // Clear and show help
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">💡</div>
                <h4>Comment utiliser l'assistant</h4>
                <div style="text-align: left; margin-top: var(--space-3); font-size: var(--text-xs);">
                    <p><strong>Types de requêtes supportées :</strong></p>
                    <ul style="margin: var(--space-2) 0; padding-left: var(--space-4);">
                        <li>Recherche attributaire : "Les communes de plus de 50000 habitants"</li>
                        <li>Recherche spatiale : "Bâtiments à moins de 500m d'une école"</li>
                        <li>Agrégations : "Nombre de routes par département"</li>
                        <li>Jointures : "Parcelles avec leur commune"</li>
                    </ul>
                    <p><strong>Conseils :</strong></p>
                    <ul style="margin: var(--space-2) 0; padding-left: var(--space-4);">
                        <li>Sélectionnez une table dans l'explorateur pour plus de précision</li>
                        <li>Mentionnez le département ou la commune concernée</li>
                        <li>Précisez les colonnes qui vous intéressent</li>
                    </ul>
                </div>
                <button class="btn btn-sm" onclick="Assistant.clearChat()">Nouvelle conversation</button>
            </div>
        `;
    },

    /**
     * Clear chat
     */
    clearChat() {
        this.chatHistory = [];
        
        const container = document.getElementById('chat-container');
        if (container) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-icon">🤖</div>
                    <p>Décrivez votre requête en français et je générerai le SQL correspondant.</p>
                    <div class="welcome-examples">
                        <span class="example-chip" data-query="Les bâtiments de plus de 10 étages à Marseille">🏢 Bâtiments > 10 étages</span>
                        <span class="example-chip" data-query="Routes départementales dans les Bouches-du-Rhône">🛣️ Routes BDR</span>
                        <span class="example-chip" data-query="Parcelles cadastrales de plus de 5000m² à Lyon">📐 Grandes parcelles</span>
                    </div>
                </div>
            `;
            
            // Re-attach example chip listeners
            container.querySelectorAll('.example-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const query = chip.dataset.query;
                    const chatInput = document.getElementById('chat-input');
                    if (query && chatInput) {
                        chatInput.value = query;
                        chatInput.focus();
                    }
                });
            });
        }
    }
};
