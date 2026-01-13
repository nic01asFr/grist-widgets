/**
 * DataCart Explorer - Editor Module
 * SQL editor with CodeMirror, syntax highlighting and autocomplete
 */

const Editor = {
    // State
    codeMirror: null,
    currentDatabase: CONFIG.defaults.database,
    tables: [],
    columns: {},
    
    // Callbacks
    onExecute: null,
    onSave: null,

    /**
     * Initialize editor
     */
    init() {
        this.initCodeMirror();
        this.setupEventListeners();
    },

    /**
     * Initialize CodeMirror
     */
    initCodeMirror() {
        const textarea = document.getElementById('sql-editor');
        if (!textarea) return;
        
        // Build custom hints
        const customHints = this.buildCustomHints();
        
        this.codeMirror = CodeMirror.fromTextArea(textarea, {
            mode: 'text/x-pgsql',
            theme: 'dracula',
            lineNumbers: true,
            lineWrapping: true,
            indentWithTabs: true,
            tabSize: 4,
            autofocus: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Ctrl-Enter': () => this.execute(),
                'Cmd-Enter': () => this.execute(),
                'Ctrl-Space': 'autocomplete',
                'Ctrl-S': () => this.save(),
                'Cmd-S': () => this.save()
            },
            hintOptions: {
                tables: customHints.tables,
                completeSingle: false
            }
        });
        
        // Setup autocomplete on input
        this.codeMirror.on('inputRead', (cm, change) => {
            if (change.text[0].match(/[\w.]/)) {
                cm.showHint({ completeSingle: false });
            }
        });
    },

    /**
     * Build custom hints for autocomplete
     */
    buildCustomHints() {
        const tables = {};
        
        // Add PostGIS functions
        CONFIG.postgisFunctions.forEach(fn => {
            tables[fn] = [];
        });
        
        // Add SQL keywords
        CONFIG.sqlKeywords.forEach(kw => {
            tables[kw] = [];
        });
        
        return { tables };
    },

    /**
     * Update autocomplete with schema info
     */
    updateAutocomplete(schemas) {
        if (!schemas || !this.codeMirror) return;
        
        const tables = { ...this.buildCustomHints().tables };
        
        // Add tables and columns from schemas
        Object.entries(schemas).forEach(([schemaName, schema]) => {
            Object.entries(schema.tables || {}).forEach(([tableName, table]) => {
                const fullName = `${schemaName}.${tableName}`;
                const columns = (table.columns || []).map(c => c.name || c.column_name);
                
                tables[fullName] = columns;
                tables[tableName] = columns;
                
                // Store for later use
                this.columns[fullName] = columns;
            });
        });
        
        this.tables = Object.keys(tables);
        
        // Update CodeMirror hints
        this.codeMirror.setOption('hintOptions', {
            tables: tables,
            completeSingle: false
        });
    },

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Execute button
        document.getElementById('btn-execute')?.addEventListener('click', () => {
            this.execute();
        });
        
        // Save button
        document.getElementById('btn-save-query')?.addEventListener('click', () => {
            this.save();
        });
        
        // Clear button
        document.getElementById('btn-clear-editor')?.addEventListener('click', () => {
            this.clear();
        });
    },

    /**
     * Set current database
     */
    setDatabase(database) {
        this.currentDatabase = database;
    },

    /**
     * Get current SQL
     */
    getSQL() {
        return this.codeMirror?.getValue()?.trim() || '';
    },

    /**
     * Set SQL content
     */
    setSQL(sql) {
        if (this.codeMirror) {
            this.codeMirror.setValue(sql || '');
            this.codeMirror.refresh();
            this.codeMirror.focus();
            
            // Move cursor to end
            const lastLine = this.codeMirror.lineCount() - 1;
            const lastCh = this.codeMirror.getLine(lastLine).length;
            this.codeMirror.setCursor({ line: lastLine, ch: lastCh });
        }
    },

    /**
     * Append SQL to editor
     */
    appendSQL(sql) {
        if (this.codeMirror) {
            const current = this.codeMirror.getValue();
            const newContent = current ? `${current}\n\n${sql}` : sql;
            this.setSQL(newContent);
        }
    },

    /**
     * Clear editor
     */
    clear() {
        this.setSQL('');
    },

    /**
     * Execute current SQL
     */
    execute() {
        const sql = this.getSQL();
        
        if (!sql) {
            Utils.showToast('Veuillez saisir une requête SQL', 'warning');
            return;
        }
        
        // Validate SQL
        if (!Utils.isSelectOnly(sql)) {
            Utils.showToast('Seules les requêtes SELECT sont autorisées', 'error');
            return;
        }
        
        if (this.onExecute) {
            this.onExecute(this.currentDatabase, sql);
        }
    },

    /**
     * Save current query
     */
    save() {
        const sql = this.getSQL();
        
        if (!sql) {
            Utils.showToast('Aucune requête à sauvegarder', 'warning');
            return;
        }
        
        if (this.onSave) {
            this.onSave(this.currentDatabase, sql);
        }
    },

    /**
     * Highlight error in editor
     */
    highlightError(line, message) {
        if (!this.codeMirror) return;
        
        // Clear previous marks
        this.clearErrors();
        
        // Highlight error line
        if (line && line > 0) {
            const lineIndex = line - 1;
            this.codeMirror.addLineClass(lineIndex, 'background', 'cm-error-line');
            
            // Add gutter marker
            const marker = document.createElement('div');
            marker.className = 'cm-error-marker';
            marker.innerHTML = '●';
            marker.title = message;
            this.codeMirror.setGutterMarker(lineIndex, 'CodeMirror-linenumbers', marker);
        }
    },

    /**
     * Clear error highlights
     */
    clearErrors() {
        if (!this.codeMirror) return;
        
        for (let i = 0; i < this.codeMirror.lineCount(); i++) {
            this.codeMirror.removeLineClass(i, 'background', 'cm-error-line');
            this.codeMirror.setGutterMarker(i, 'CodeMirror-linenumbers', null);
        }
    },

    /**
     * Format current SQL
     */
    format() {
        const sql = this.getSQL();
        if (sql) {
            this.setSQL(Utils.formatSQL(sql));
        }
    },

    /**
     * Get selected text or all
     */
    getSelectedOrAll() {
        if (!this.codeMirror) return '';
        
        const selected = this.codeMirror.getSelection();
        return selected || this.codeMirror.getValue();
    },

    /**
     * Insert text at cursor
     */
    insertAtCursor(text) {
        if (this.codeMirror) {
            this.codeMirror.replaceSelection(text);
            this.codeMirror.focus();
        }
    },

    /**
     * Focus editor
     */
    focus() {
        if (this.codeMirror) {
            this.codeMirror.focus();
        }
    },

    /**
     * Refresh editor (after resize)
     */
    refresh() {
        if (this.codeMirror) {
            this.codeMirror.refresh();
        }
    }
};

// Add CSS for error highlighting
const errorStyles = document.createElement('style');
errorStyles.textContent = `
    .cm-error-line {
        background: rgba(198, 40, 40, 0.2) !important;
    }
    .cm-error-marker {
        color: #C62828;
        font-size: 12px;
    }
`;
document.head.appendChild(errorStyles);
