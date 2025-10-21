// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    TABLES: {
        USERS: 'Users',
        SESSIONS: 'Sessions',
        EXERCICES: 'Exercices',
        PRODUITS: 'Exercices_Produits',
        PRODUITS_AVANCES: 'Exercices_Produits_Avances'
    },
    STORAGE_KEY: 'grist_cluster_quest_session',
    POINTS: {
        QUIZ: 100,
        PRODUIT: 150,
        PRODUIT_AVANCE: 200
    }
};

// ========================================
// STATE MANAGEMENT
// ========================================
const appState = {
    userId: null,
    userName: null,
    userEmail: null,
    gristUserId: null,
    sessionId: null,
    currentScore: 0,
    startTime: null,
    gristReady: false,
    gristApi: null,
    gristUser: null,
    requireManualLogin: false,
    tablesExist: {
        users: false,
        sessions: false,
        exercices: false,
        produits: false,
        produitsavances: false
    }
};

// ========================================
// GRIST INITIALIZATION
// ========================================

async function initializeWidget() {
    console.log('✅ Grist API ready');
    appState.gristReady = true;
    appState.gristApi = grist.docApi;
    
    updateConnectionStatus('connecting', 'Récupération utilisateur...');
    
    try {
        let user = null;
        
        try {
            user = await grist.getUser();
            console.log('👤 Utilisateur Grist récupéré:', user);
        } catch (userError) {
            console.warn('⚠️ grist.getUser() non disponible:', userError);
            
            try {
                const access = await grist.getAccessToken();
                user = {
                    id: access.userId || 'anonymous',
                    email: access.userEmail || null,
                    name: access.userName || 'Utilisateur'
                };
                console.log('👤 Utilisateur via access token:', user);
            } catch (accessError) {
                console.warn('⚠️ getAccessToken() non disponible:', accessError);
                
                let storedUserId = localStorage.getItem('grist_widget_user_id');
                if (!storedUserId) {
                    storedUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                    localStorage.setItem('grist_widget_user_id', storedUserId);
                }
                
                user = {
                    id: storedUserId,
                    email: null,
                    name: 'Utilisateur'
                };
                console.log('👤 Utilisateur généré localement:', user);
            }
        }
        
        if (user) {
            appState.gristUser = user;
            appState.userName = user.name || user.email || 'Utilisateur';
            appState.userEmail = user.email || null;
            appState.gristUserId = user.id;
            
            document.getElementById('grist-user-display').textContent = appState.userName;
        } else {
            throw new Error('Impossible de récupérer les informations utilisateur');
        }
        
    } catch (error) {
        console.error('❌ Erreur récupération utilisateur:', error);
        
        appState.requireManualLogin = true;
        document.getElementById('grist-user-display').innerHTML = 
            '<span style="color: var(--color-warning);">Mode manuel requis</span>';
        
        const loginCard = document.querySelector('.login-card');
        loginCard.innerHTML = `
            <h2 style="text-align: center; margin-top: 0;">🎮 Bienvenue !</h2>
            <p style="font-size: 0.9em; text-align: center; opacity: 0.8;">
                L'authentification automatique n'est pas disponible.<br>
                Veuillez entrer votre nom pour continuer.
            </p>
            <input type="text" id="manual-user-name" placeholder="Votre nom" style="
                width: 100%;
                padding: 0.8em;
                margin: 0.5em 0;
                border-radius: 6px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                background: rgba(0, 0, 0, 0.3);
                color: white;
                font-size: 1em;
                box-sizing: border-box;
            ">
            <input type="email" id="manual-user-email" placeholder="Votre email (optionnel)" style="
                width: 100%;
                padding: 0.8em;
                margin: 0.5em 0;
                border-radius: 6px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                background: rgba(0, 0, 0, 0.3);
                color: white;
                font-size: 1em;
                box-sizing: border-box;
            ">
            <button id="start-button" onclick="startSession()">🚀 Démarrer la Formation</button>
            <p style="font-size: 0.75em; margin-top: 1em; opacity: 0.6; text-align: center;">
                Votre progression sera enregistrée automatiquement
            </p>
            <div id="login-error" class="message-box error" style="display: none; margin-top: 1em;"></div>
        `;
    }
    
    updateConnectionStatus('connecting', 'Vérification des tables...');
    
    try {
        const tablesCheck = await checkRequiredTables();
        
        if (tablesCheck.allExist) {
            updateConnectionStatus('connected', 'Connecté à Grist');
        } else {
            updateConnectionStatus('warning', 'Tables manquantes');
            
            const loginError = document.getElementById('login-error');
            if (loginError) {
                loginError.innerHTML = `
                    <div style="text-align: center;">
                        <p><strong>⚠️ Tables manquantes détectées:</strong></p>
                        <p style="font-size: 0.85em; opacity: 0.9;">${tablesCheck.missing.join(', ')}</p>
                        <button onclick="autoCreateTables()" style="
                            background: var(--color-primary);
                            color: white;
                            border: none;
                            padding: 0.8em 1.5em;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9em;
                            margin-top: 1em;
                        ">
                            🔨 Créer automatiquement les tables
                        </button>
                    </div>
                `;
                loginError.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        updateConnectionStatus('error', 'Erreur connexion');
        showLoginError('Erreur: ' + error.message);
    }
}

window.autoCreateTables = async function() {
    const loginError = document.getElementById('login-error');
    loginError.innerHTML = '<div class="spinner"></div><p style="text-align: center;">Création des tables en cours...</p>';
    
    try {
        await createMissingTables();
        
        loginError.innerHTML = `
            <div style="text-align: center;">
                <p><strong>✅ Tables créées avec succès !</strong></p>
                <p style="font-size: 0.85em; opacity: 0.9;">Vous pouvez maintenant commencer la formation.</p>
            </div>
        `;
        
        updateConnectionStatus('connected', 'Connecté à Grist');
        
        setTimeout(() => {
            loginError.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erreur création tables:', error);
        loginError.innerHTML = `
            <div style="text-align: center;">
                <p><strong>❌ Erreur lors de la création</strong></p>
                <p style="font-size: 0.85em;">${error.message}</p>
                <button onclick="autoCreateTables()" style="
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    padding: 0.6em 1.2em;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85em;
                    margin-top: 0.5em;
                ">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
};

grist.ready({
    columns: [],
    allowSelectBy: true,
    requiredAccess: 'full',
    onEditOptions: function() {
        console.log('📝 Options widget modifiées');
    }
});

setTimeout(initializeWidget, 100);

async function checkRequiredTables() {
    const result = {
        allExist: true,
        missing: []
    };

    try {
        for (const [key, tableName] of Object.entries(CONFIG.TABLES)) {
            try {
                await appState.gristApi.fetchTable(tableName);
                const stateKey = key.toLowerCase().replace('_', '');
                appState.tablesExist[stateKey] = true;
                console.log('✓ Table trouvée:', tableName);
            } catch (error) {
                const stateKey = key.toLowerCase().replace('_', '');
                appState.tablesExist[stateKey] = false;
                result.allExist = false;
                result.missing.push(tableName);
                console.log('✗ Table manquante:', tableName);
            }
        }
    } catch (error) {
        console.error('❌ Erreur vérification tables:', error);
        result.allExist = false;
    }

    return result;
}

async function createMissingTables() {
    console.log('🔨 Création automatique des tables manquantes...');
    
    try {
        if (!appState.tablesExist.users) {
            console.log('Création table Users...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.USERS, [
                    {id: 'grist_user_id', type: 'Text'},
                    {id: 'grist_email', type: 'Text'},
                    {id: 'grist_name', type: 'Text'},
                    {id: 'date_inscription', type: 'DateTime', isFormula: true, formula: 'NOW()'}
                ]]
            ]);
            console.log('✅ Table Users créée');
            appState.tablesExist.users = true;
        }

        if (!appState.tablesExist.sessions) {
            console.log('Création table Sessions...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.SESSIONS, [
                    {id: 'user_id', type: 'Ref:' + CONFIG.TABLES.USERS},
                    {id: 'chapitre', type: 'Int'},
                    {id: 'score', type: 'Int'},
                    {id: 'date', type: 'DateTime', isFormula: true, formula: 'NOW()'},
                    {id: 'temps_passe', type: 'Int'}
                ]]
            ]);
            console.log('✅ Table Sessions créée');
            appState.tablesExist.sessions = true;
        }

        if (!appState.tablesExist.exercices) {
            console.log('Création table Exercices...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.EXERCICES, [
                    {id: 'user_id', type: 'Ref:' + CONFIG.TABLES.USERS},
                    {id: 'chapitre', type: 'Int'},
                    {id: 'exercice_id', type: 'Text'},
                    {id: 'reponse', type: 'Text'},
                    {id: 'correct', type: 'Bool'},
                    {id: 'date', type: 'DateTime', isFormula: true, formula: 'NOW()'}
                ]]
            ]);
            console.log('✅ Table Exercices créée');
            appState.tablesExist.exercices = true;
        }

        if (!appState.tablesExist.produits) {
            console.log('Création table Exercices_Produits...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.PRODUITS, [
                    {id: 'user_id', type: 'Ref:' + CONFIG.TABLES.USERS},
                    {id: 'nom', type: 'Text'},
                    {id: 'description', type: 'Text'},
                    {id: 'prix', type: 'Numeric'},
                    {id: 'categorie', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['Vêtements', 'Électronique', 'Alimentation', 'Maison']
                    })},
                    {id: 'date_creation', type: 'DateTime', isFormula: true, formula: 'NOW()'}
                ]]
            ]);
            console.log('✅ Table Exercices_Produits créée');
            appState.tablesExist.produits = true;
        }

        if (!appState.tablesExist.produitsavances) {
            console.log('Création table Exercices_Produits_Avances...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.PRODUITS_AVANCES, [
                    {id: 'user_id', type: 'Ref:' + CONFIG.TABLES.USERS},
                    {id: 'nom', type: 'Text'},
                    {id: 'description_marketing', type: 'Text'},
                    {id: 'caracteristiques_techniques', type: 'Text'},
                    {id: 'tags', type: 'Text'},
                    {id: 'date_creation', type: 'DateTime', isFormula: true, formula: 'NOW()'}
                ]]
            ]);
            console.log('✅ Table Exercices_Produits_Avances créée');
            appState.tablesExist.produitsavances = true;
        }

        console.log('🎉 Toutes les tables ont été créées avec succès !');
        return true;
    } catch (error) {
        console.error('❌ Erreur création tables:', error);
        throw error;
    }
}

function updateConnectionStatus(status, text) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    statusDot.className = '';
    if (status === 'connected') {
        statusDot.classList.add('connected');
    } else if (status === 'error') {
        statusDot.classList.add('error');
    }
    
    statusText.textContent = text;
}

// Suite du fichier dans le prochain commit...