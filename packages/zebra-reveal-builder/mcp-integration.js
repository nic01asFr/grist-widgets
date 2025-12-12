// =========================================
// ZEBRA Reveal Builder - MCP Integration
// =========================================

class MCPIntegration {
    constructor() {
        this.mcpAvailable = false;
        this.endpoint = null;
        this.checkMCPAvailability();
    }

    /**
     * Vérifie si le MCP Server est disponible
     */
    async checkMCPAvailability() {
        try {
            // Tentative de détection du MCP Server via environnement Grist
            if (typeof grist !== 'undefined') {
                const options = await grist.widgetApi.getOptions();
                if (options && options.mcp_endpoint) {
                    this.endpoint = options.mcp_endpoint;
                    this.mcpAvailable = true;
                    console.log('✅ MCP Server détecté:', this.endpoint);
                } else {
                    console.log('ℹ️ MCP Server non configuré (mode local)');
                }
            }
        } catch (error) {
            console.warn('⚠️ Erreur détection MCP:', error);
        }
    }

    /**
     * Génère une présentation complète ZEBRA
     */
    async generatePresentation(options = {}) {
        if (!this.mcpAvailable) {
            return this.generatePresentationLocal(options);
        }

        const {
            presentation_type = 'complete', // 'complete', 'executive', 'technical'
            target_audience = 'elus',        // 'elus', 'techniciens', 'grand_public'
            data_scope = {},
            theme = 'white',
            transition = 'slide'
        } = options;

        try {
            const payload = {
                method: 'zebra_generate_presentation',
                params: {
                    presentation_type,
                    target_audience,
                    data_scope,
                    theme,
                    transition,
                    sections: this.getSectionsForAudience(target_audience),
                    doc_id: data_scope.doc_id
                }
            };

            const response = await this.callMCP(payload);
            return this.processMCPResponse(response);
        } catch (error) {
            console.error('❌ Erreur génération MCP:', error);
            return this.generatePresentationLocal(options);
        }
    }

    /**
     * Génère une slide individuelle avec IA
     */
    async generateSlide(options = {}) {
        if (!this.mcpAvailable) {
            return this.generateSlideLocal(options);
        }

        const {
            section,
            template,
            data_query,
            context = {}
        } = options;

        try {
            const payload = {
                method: 'zebra_generate_slide',
                params: {
                    section,
                    template,
                    data_query,
                    context,
                    format: 'markdown'
                }
            };

            const response = await this.callMCP(payload);
            return response.content;
        } catch (error) {
            console.error('❌ Erreur génération slide MCP:', error);
            return this.generateSlideLocal(options);
        }
    }

    /**
     * Améliore une slide existante
     */
    async improveSlide(slideId, content, improvementType = 'clarity') {
        if (!this.mcpAvailable) {
            return {
                improved: false,
                message: 'MCP Server non disponible',
                suggestions: []
            };
        }

        try {
            const payload = {
                method: 'zebra_improve_slide',
                params: {
                    slide_id: slideId,
                    current_content: content,
                    improvement_type: improvementType, // 'clarity', 'visual', 'data', 'story'
                }
            };

            const response = await this.callMCP(payload);
            return {
                improved: true,
                content: response.improved_content,
                suggestions: response.suggestions
            };
        } catch (error) {
            console.error('❌ Erreur amélioration MCP:', error);
            return {
                improved: false,
                message: error.message,
                suggestions: []
            };
        }
    }

    /**
     * Génère des données synthétiques depuis Grist
     */
    async fetchAndFormatData(dataQuery) {
        try {
            if (typeof grist === 'undefined') {
                return this.getMockData();
            }

            // Parse la query JSON
            const query = typeof dataQuery === 'string' 
                ? JSON.parse(dataQuery) 
                : dataQuery;

            // Récupère les données depuis Grist
            const tableData = await grist.docApi.fetchTable(query.table);
            
            // Convertit en format utilisable
            const records = this.convertGristTableToRecords(tableData);
            
            // Applique filtres et agrégations
            let result = records;
            
            if (query.filter) {
                result = this.applyFilter(result, query.filter);
            }
            
            if (query.aggregate) {
                result = this.applyAggregate(result, query.aggregate);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Erreur fetch data:', error);
            return this.getMockData();
        }
    }

    /**
     * Appel MCP générique
     */
    async callMCP(payload) {
        if (!this.mcpAvailable || !this.endpoint) {
            throw new Error('MCP Server non disponible');
        }

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`MCP Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // ========================================
    // Méthodes de fallback (mode local)
    // ========================================

    /**
     * Génère présentation en mode local (sans MCP)
     */
    generatePresentationLocal(options) {
        const { target_audience = 'elus', data_scope = {} } = options;
        const sections = this.getSectionsForAudience(target_audience);
        
        const slides = sections.map((section, index) => ({
            id: `slide_${index + 1}`,
            section,
            order: index + 1,
            type: 'horizontal',
            title: ZEBRA_SECTION_TEMPLATES[section]?.title || `Slide ${index + 1}`,
            content: ZEBRA_SECTION_TEMPLATES[section]?.content || '',
            notes: '',
            background: '#ffffff',
            transition: 'slide',
            template: 'content'
        }));

        return {
            id: `pres_${Date.now()}`,
            title: 'Présentation ZEBRA',
            subtitle: data_scope.commune || 'Diagnostic Passages Piétons',
            author: data_scope.author || 'CEREMA',
            date: new Date().toLocaleDateString('fr-FR'),
            theme: options.theme || 'white',
            transition: options.transition || 'slide',
            slides,
            generated_by: 'local'
        };
    }

    /**
     * Génère slide en mode local
     */
    generateSlideLocal(options) {
        const { section, template } = options;
        
        if (ZEBRA_SECTION_TEMPLATES[section]) {
            return {
                title: ZEBRA_SECTION_TEMPLATES[section].title,
                content: ZEBRA_SECTION_TEMPLATES[section].content
            };
        }
        
        if (ZEBRA_TEMPLATES[template]) {
            return {
                content: ZEBRA_TEMPLATES[template].content
            };
        }
        
        return {
            title: '## Nouvelle Slide',
            content: 'Contenu à compléter...'
        };
    }

    // ========================================
    // Utilitaires
    // ========================================

    /**
     * Détermine les sections selon l'audience
     */
    getSectionsForAudience(audience) {
        const allSections = [
            'intro', 'probleme', 'solution', 'donnees', 'ia', 
            'processus', 'resultats', 'impact', 'techno', 
            'deploiement', 'partenaires', 'qr', 'ressources', 'conclusion'
        ];

        switch (audience) {
            case 'elus':
                // Focus impact, résultats, ROI
                return ['intro', 'probleme', 'solution', 'resultats', 'impact', 'deploiement', 'conclusion'];
            
            case 'techniciens':
                // Focus technique complet
                return allSections;
            
            case 'grand_public':
                // Version simplifiée
                return ['intro', 'probleme', 'solution', 'resultats', 'conclusion'];
            
            default:
                return allSections;
        }
    }

    /**
     * Convertit table Grist en array d'objets
     */
    convertGristTableToRecords(tableData) {
        if (!tableData || typeof tableData !== 'object') return [];
        if (Array.isArray(tableData)) return tableData;
        
        const columns = Object.keys(tableData);
        if (columns.length === 0) return [];
        
        const rowCount = tableData[columns[0]].length;
        const records = [];
        
        for (let i = 0; i < rowCount; i++) {
            const record = {};
            columns.forEach(col => {
                record[col] = tableData[col][i];
            });
            records.push(record);
        }
        
        return records;
    }

    /**
     * Applique un filtre sur les données
     */
    applyFilter(records, filter) {
        return records.filter(record => {
            return Object.entries(filter).every(([key, value]) => {
                return record[key] === value;
            });
        });
    }

    /**
     * Applique des agrégations
     */
    applyAggregate(records, aggregate) {
        const result = {};
        
        Object.entries(aggregate).forEach(([key, formula]) => {
            if (formula === 'COUNT(*)') {
                result[key] = records.length;
            } else if (formula.startsWith('COUNT(*) WHERE')) {
                const condition = formula.replace('COUNT(*) WHERE', '').trim();
                // Simple parsing (à améliorer pour production)
                const [field, op, value] = condition.split(/\s+/);
                const filtered = records.filter(r => {
                    if (op === '=') return r[field] == value.replace(/'/g, '');
                    return false;
                });
                result[key] = filtered.length;
            } else if (formula.startsWith('SUM(')) {
                const field = formula.match(/SUM\((\w+)\)/)[1];
                result[key] = records.reduce((sum, r) => sum + (r[field] || 0), 0);
            } else if (formula.startsWith('AVG(')) {
                const field = formula.match(/AVG\((\w+)\)/)[1];
                const sum = records.reduce((s, r) => s + (r[field] || 0), 0);
                result[key] = records.length > 0 ? sum / records.length : 0;
            }
        });
        
        return result;
    }

    /**
     * Données mock pour démo
     */
    getMockData() {
        return {
            total: 450,
            p1: 23,
            p2: 67,
            p3: 145,
            p4: 215,
            commune: 'Grenoble',
            accidents_pietons: 3500,
            nb_passages: 150000,
            heures_diagnostic: 4
        };
    }

    /**
     * Process la réponse MCP
     */
    processMCPResponse(response) {
        // Traitement spécifique selon le type de réponse
        if (response.error) {
            throw new Error(response.error);
        }
        
        return response.result || response;
    }
}

// Instance globale
const mcpIntegration = new MCPIntegration();

// Export pour utilisation dans app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPIntegration;
}
