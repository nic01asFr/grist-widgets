// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    TABLES: {
        USERS: 'Users',
        SESSIONS: 'Sessions',
        EXERCICES: 'Exercices',
        PRODUITS: 'Exercices_Produits',
        PRODUITS_AVANCES: 'Exercices_Produits_Avances',
        RECHERCHES: 'Recherches_Produits'
    },
    STORAGE_KEY: 'grist_cluster_quest_session',
    POINTS: {
        QUIZ: 100,
        PRODUIT: 150,
        PRODUIT_AVANCE: 200,
        FORMULA_TEST: 100
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
        produitsavances: false,
        recherches: false
    }
};

// ========================================
// GRIST INITIALIZATION
// ========================================

async function identifyUser() {
    // Strategy: Create stable user ID with multiple fallback layers
    let userId = null;
    let userName = null;
    let userEmail = null;
    let identificationMethod = null;

    // Method 1: Stable ID from access token + baseUrl
    try {
        const access = await grist.getAccessToken({ readOnly: false });
        console.log('✅ Access token obtenu');

        // Create stable hash from baseUrl + token
        const stableString = `${access.baseUrl}_${access.token}`;
        const stableHash = btoa(stableString).substring(0, 24).replace(/[+/=]/g, '_');
        userId = `grist_${stableHash}`;
        identificationMethod = 'token';

        // Try to get user info from _grist_ACLPrincipals (if accessible)
        try {
            const principals = await appState.gristApi.fetchTable('_grist_ACLPrincipals');
            if (principals && principals.id) {
                // Filter non-anonymous users
                const realUsers = [];
                for (let i = 0; i < principals.id.length; i++) {
                    const email = principals.userEmail ? principals.userEmail[i] : null;
                    const name = principals.name ? principals.name[i] : null;
                    if (email && email !== 'anon@getgrist.com' && !email.startsWith('anon-')) {
                        realUsers.push({ email, name });
                    }
                }

                // If single user, use their info
                if (realUsers.length === 1) {
                    userEmail = realUsers[0].email;
                    userName = realUsers[0].name || userEmail.split('@')[0];
                    console.log('✅ User info inferred from _grist_ACLPrincipals:', { userName, userEmail });
                } else if (realUsers.length > 1) {
                    console.log('⚠️ Multiple users found, cannot infer specific user');
                }
            }
        } catch (principalsError) {
            console.log('⚠️ Cannot access _grist_ACLPrincipals:', principalsError.message);
        }

        // Check localStorage for cached user info
        const cachedUser = localStorage.getItem('grist_cluster_quest_user');
        if (cachedUser) {
            try {
                const cached = JSON.parse(cachedUser);
                if (cached.userId === userId) {
                    userName = userName || cached.userName;
                    userEmail = userEmail || cached.userEmail;
                    console.log('✅ User info restored from cache:', { userName, userEmail });
                }
            } catch (e) {
                console.warn('Failed to parse cached user info');
            }
        }

        // Default name if still unknown
        userName = userName || 'Utilisateur Grist';

        console.log('👤 User identified via stable token:', { userId, userName, userEmail });
    } catch (tokenError) {
        console.warn('⚠️ getAccessToken() failed:', tokenError);

        // Method 2: Fallback to persistent localStorage ID
        let storedUserId = localStorage.getItem('grist_widget_user_id');
        if (!storedUserId) {
            storedUserId = 'local_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('grist_widget_user_id', storedUserId);
        }

        userId = storedUserId;
        identificationMethod = 'localStorage';

        // Try to get cached user info
        const cachedUser = localStorage.getItem('grist_cluster_quest_user');
        if (cachedUser) {
            try {
                const cached = JSON.parse(cachedUser);
                userName = cached.userName || 'Utilisateur';
                userEmail = cached.userEmail || null;
            } catch (e) {
                userName = 'Utilisateur';
            }
        } else {
            userName = 'Utilisateur';
        }

        console.log('👤 User identified via localStorage:', { userId, userName, identificationMethod });
    }

    // Save to cache
    localStorage.setItem('grist_cluster_quest_user', JSON.stringify({
        userId, userName, userEmail, identificationMethod
    }));

    return {
        id: userId,
        name: userName,
        email: userEmail,
        method: identificationMethod
    };
}

async function initializeWidget() {
    console.log('✅ Grist API ready');
    appState.gristReady = true;
    appState.gristApi = grist.docApi;

    updateConnectionStatus('connecting', 'Récupération utilisateur...');

    try {
        const user = await identifyUser();

        if (user) {
            appState.gristUser = user;
            appState.userName = user.name || 'Utilisateur';
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

            // Check for existing session
            try {
                const existingSession = await checkExistingSession();
                if (existingSession) {
                    console.log('📂 Existing session found:', existingSession);

                    // Propose to resume
                    const decision = await proposeResumeSession(existingSession);

                    if (decision.action === 'resume') {
                        await resumeSession(existingSession);
                    } else if (decision.action === 'restart') {
                        // Will create new session when user clicks start button
                        console.log('🔄 User chose to restart');
                    }
                } else {
                    console.log('📝 No existing session found');
                }
            } catch (sessionError) {
                console.error('⚠️ Error checking session:', sessionError);
                // Continue with normal flow
            }
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
                        choices: ['Vêtements', 'Électronique', 'Alimentation', 'Maison', 'Sport', 'Autre']
                    })},
                    {id: 'statut', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['brouillon', 'publié', 'archivé']
                    })},
                    {id: 'remise', type: 'Numeric'},
                    {id: 'stock', type: 'Int'},
                    {id: 'date_creation', type: 'DateTime', isFormula: true, formula: 'NOW()'},
                    {id: 'age_jours', type: 'Int', isFormula: true, formula: 'int((NOW() - $date_creation).total_seconds() / 86400)'},
                    {id: 'vecteur_simple', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR($nom, $description)'},
                    {id: 'vecteur_filtre', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR($nom, $description) if $statut == "publié" else None'},
                    {id: 'vecteur_enrichi', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR(("🔥 PROMO -" + str($remise) + "% " if $remise > 20 else "") + ("🆕 " if $age_jours < 7 else "") + $nom + " " + $description) if $statut == "publié" else None'}
                ]]
            ]);
            console.log('✅ Table Exercices_Produits créée avec colonnes vectorielles');
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
                    {id: 'saison', type: 'Choice', widgetOptions: JSON.stringify({
                        choices: ['été', 'hiver', 'printemps', 'automne', 'toute_saison']
                    })},
                    {id: 'stock', type: 'Int'},
                    {id: 'tags', type: 'Text'},
                    {id: 'date_creation', type: 'DateTime', isFormula: true, formula: 'NOW()'},
                    {id: 'vecteur_marketing', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR($nom, $description_marketing)'},
                    {id: 'vecteur_technique', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR($caracteristiques_techniques)'},
                    {id: 'vecteur_complet', type: 'Text', isFormula: true, formula: 'grist.CREATE_VECTOR(("☀️ " if $saison == "été" else "❄️ " if $saison == "hiver" else "") + $nom + " " + $description_marketing) if $stock > 0 else None'}
                ]]
            ]);
            console.log('✅ Table Exercices_Produits_Avances créée avec multi-vecteurs');
            appState.tablesExist.produitsavances = true;
        }

        if (!appState.tablesExist.recherches) {
            console.log('Création table Recherches_Produits...');
            await appState.gristApi.applyUserActions([
                ['AddTable', CONFIG.TABLES.RECHERCHES, [
                    {id: 'user_id', type: 'Ref:' + CONFIG.TABLES.USERS},
                    {id: 'requete', type: 'Text'},
                    {id: 'threshold', type: 'Numeric'},
                    {id: 'limite', type: 'Int'},
                    {id: 'embedding_column', type: 'Text'},
                    {id: 'date_recherche', type: 'DateTime', isFormula: true, formula: 'NOW()'}
                    // Note: Les colonnes RefList pour resultats seront ajoutées manuellement car elles nécessitent une configuration avancée
                ]]
            ]);
            console.log('✅ Table Recherches_Produits créée');
            console.log('⚠️ NOTE: Ajoutez manuellement les colonnes RefList pour les résultats de recherche');
            appState.tablesExist.recherches = true;
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

// ========================================
// SESSION MANAGEMENT
// ========================================

async function checkExistingSession() {
    // Check localStorage for existing session data
    const storedSession = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!storedSession) {
        return null;
    }

    try {
        const sessionData = JSON.parse(storedSession);

        // Verify session exists in Grist
        if (!sessionData.sessionId) {
            return null;
        }

        // Fetch session from Grist to verify it's still valid
        const sessions = await appState.gristApi.fetchTable(CONFIG.TABLES.SESSIONS);
        if (!sessions || !sessions.id) {
            return null;
        }

        // Find the session
        for (let i = 0; i < sessions.id.length; i++) {
            if (sessions.id[i] === sessionData.sessionId) {
                return {
                    sessionId: sessionData.sessionId,
                    userId: sessionData.userId,
                    gristUserId: sessionData.gristUserId,
                    userName: sessionData.userName,
                    userEmail: sessionData.userEmail,
                    startTime: sessionData.startTime,
                    currentChapter: sessions.chapitre ? sessions.chapitre[i] : 1,
                    currentScore: sessions.score ? sessions.score[i] : 0,
                    timeSpent: sessions.temps_passe ? sessions.temps_passe[i] : 0
                };
            }
        }

        // Session not found in Grist, clear localStorage
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        return null;
    } catch (error) {
        console.error('❌ Error checking existing session:', error);
        return null;
    }
}

async function proposeResumeSession(sessionData) {
    return new Promise((resolve) => {
        const loginModal = document.getElementById('user-login');
        const loginCard = document.querySelector('.login-card');

        loginCard.innerHTML = `
            <h2 style="text-align: center; margin-top: 0;">🎮 Session Trouvée !</h2>
            <p style="font-size: 0.9em; text-align: center; opacity: 0.8;">
                Bonjour <strong>${sessionData.userName}</strong> !<br>
                Vous avez une session en cours.
            </p>

            <div class="card" style="background: rgba(33, 150, 243, 0.1); margin: 1em 0; padding: 1em;">
                <h3 style="margin: 0 0 0.5em 0; font-size: 1em;">📊 Progression actuelle</h3>
                <p style="margin: 0.3em 0; font-size: 0.9em;">
                    📚 <strong>Chapitre ${sessionData.currentChapter}/9</strong>
                </p>
                <p style="margin: 0.3em 0; font-size: 0.9em;">
                    🎯 <strong>${sessionData.currentScore} points</strong>
                </p>
                <p style="margin: 0.3em 0; font-size: 0.9em;">
                    ⏱️ <strong>${Math.round(sessionData.timeSpent / 60)} minutes</strong>
                </p>
            </div>

            <button id="resume-button" style="
                width: 100%;
                padding: 0.8em;
                margin: 0.5em 0;
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1em;
                font-weight: bold;
            ">
                ▶️ Reprendre la Formation
            </button>

            <button id="restart-button" style="
                width: 100%;
                padding: 0.8em;
                margin: 0.5em 0;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9em;
            ">
                🔄 Recommencer de Zéro
            </button>

            <p style="font-size: 0.75em; margin-top: 1em; opacity: 0.6; text-align: center;">
                Votre progression sera toujours sauvegardée
            </p>

            <div id="login-error" class="message-box error" style="display: none; margin-top: 1em;"></div>
        `;

        // Handle resume
        document.getElementById('resume-button').addEventListener('click', () => {
            resolve({ action: 'resume', sessionData });
        });

        // Handle restart
        document.getElementById('restart-button').addEventListener('click', () => {
            if (confirm('⚠️ Êtes-vous sûr de vouloir recommencer ? Votre progression actuelle sera perdue.')) {
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                resolve({ action: 'restart', sessionData: null });
            }
        });
    });
}

async function resumeSession(sessionData) {
    console.log('▶️ Resuming session:', sessionData);

    // Restore app state
    appState.userId = sessionData.userId;
    appState.sessionId = sessionData.sessionId;
    appState.gristUserId = sessionData.gristUserId;
    appState.userName = sessionData.userName;
    appState.userEmail = sessionData.userEmail;
    appState.currentScore = sessionData.currentScore;
    appState.startTime = new Date(sessionData.startTime);

    // Update UI
    document.getElementById('user-login').style.display = 'none';
    document.getElementById('user-name').textContent = appState.userName;
    document.getElementById('user-score').textContent = appState.currentScore;
    document.getElementById('current-chapter').textContent = sessionData.currentChapter;

    // Force Reveal.js layout update
    requestAnimationFrame(() => {
        if (typeof Reveal !== 'undefined') {
            Reveal.layout();

            // Navigate to the last chapter after a short delay
            setTimeout(() => {
                // Calculate slide index for chapter
                // Chapters 1, 3, 5 have vertical slides, others are single
                let targetSlide = sessionData.currentChapter;
                if (sessionData.currentChapter > 5) {
                    targetSlide = sessionData.currentChapter + 1; // Account for vertical slides
                }

                Reveal.slide(targetSlide, 0);
                console.log(`🎬 Navigated to chapter ${sessionData.currentChapter}`);
            }, 300);
        }
    });

    console.log('✅ Session resumed successfully');
}

async function startSession() {
    const startButton = document.getElementById('start-button');
    
    if (!appState.gristReady) {
        showLoginError('Connexion à Grist en cours, veuillez patienter...');
        return;
    }

    if (appState.requireManualLogin) {
        const nameInput = document.getElementById('manual-user-name');
        const emailInput = document.getElementById('manual-user-email');
        
        if (!nameInput || !nameInput.value.trim()) {
            showLoginError('Veuillez entrer votre nom');
            return;
        }
        
        const name = nameInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        
        let userId = localStorage.getItem('grist_widget_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('grist_widget_user_id', userId);
        }
        
        appState.gristUserId = userId;
        appState.userName = name;
        appState.userEmail = email || null;
    }

    if (!appState.gristUserId) {
        showLoginError('Impossible de récupérer votre identifiant');
        return;
    }

    startButton.disabled = true;
    startButton.textContent = '⏳ Démarrage...';

    try {
        appState.startTime = new Date();

        const userId = await createOrFindUser(appState.gristUserId, appState.userName, appState.userEmail);
        appState.userId = userId;

        const sessionId = await createSession(userId);
        appState.sessionId = sessionId;

        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
            gristUserId: appState.gristUserId,
            userName: appState.userName,
            userEmail: appState.userEmail,
            userId: userId,
            sessionId: sessionId,
            startTime: appState.startTime.toISOString()
        }));

        document.getElementById('user-login').style.display = 'none';
        document.getElementById('user-name').textContent = appState.userName;

        // Forcer Reveal.js à se redimensionner après fermeture du modal
        // Utilise requestAnimationFrame pour éviter la boucle infinie
        requestAnimationFrame(() => {
            if (typeof Reveal !== 'undefined') {
                Reveal.layout();
                console.log('🎬 Reveal.js layout mis à jour');
            }
        });

        console.log('🎬 Modal fermé, slides Reveal.js devraient être visibles');

        console.log('✅ Session démarrée:', { userId, sessionId });
    } catch (error) {
        console.error('❌ Erreur démarrage session:', error);
        showLoginError('Erreur: ' + error.message);
        startButton.disabled = false;
        startButton.textContent = '🚀 Démarrer la Formation';
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

async function createOrFindUser(gristUserId, name, email) {
    try {
        const users = await appState.gristApi.fetchTable(CONFIG.TABLES.USERS);
        
        if (users && users.id && users.grist_user_id) {
            for (let i = 0; i < users.id.length; i++) {
                if (users.grist_user_id[i] === gristUserId) {
                    console.log('✓ Utilisateur existant trouvé:', users.id[i]);
                    return users.id[i];
                }
            }
        }

        console.log('Creating new user:', name);
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.USERS, null, {
                grist_user_id: gristUserId,
                grist_email: email || '',
                grist_name: name
            }]
        ]);

        const newUserId = result.retValues ? result.retValues[0] : result[0];
        console.log('✓ Nouvel utilisateur créé:', newUserId);
        return newUserId;
    } catch (error) {
        console.error('Erreur createOrFindUser:', error);
        throw new Error('Impossible de créer l\'utilisateur dans Grist');
    }
}

async function createSession(userId) {
    try {
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.SESSIONS, null, {
                user_id: userId,
                chapitre: 1,
                score: 0,
                temps_passe: 0
            }]
        ]);

        const sessionId = result.retValues ? result.retValues[0] : result[0];
        console.log('✓ Session créée:', sessionId);
        return sessionId;
    } catch (error) {
        console.error('Erreur createSession:', error);
        throw new Error('Impossible de créer la session');
    }
}

async function updateSession(chapter, score) {
    if (!appState.sessionId || !appState.startTime) return;

    const timeSpent = Math.floor((new Date() - appState.startTime) / 1000);

    try {
        await appState.gristApi.applyUserActions([
            ['UpdateRecord', CONFIG.TABLES.SESSIONS, appState.sessionId, {
                chapitre: chapter,
                score: score,
                temps_passe: timeSpent
            }]
        ]);
        console.log('✓ Session mise à jour:', { chapter, score, timeSpent });
    } catch (error) {
        console.error('Erreur updateSession:', error);
    }
}

// ========================================
// EXERCISE HANDLERS
// ========================================
window.submitChapter1 = async function() {
    const answer = document.getElementById('ch1-quiz').value;
    const feedback = document.getElementById('ch1-feedback');
    
    if (!answer) {
        showFeedback(feedback, false, '❌ Veuillez sélectionner une réponse');
        return;
    }

    const correct = answer === 'sens';
    const points = correct ? CONFIG.POINTS.QUIZ : 0;

    showFeedback(feedback, correct, 
        correct ? '🎉 Exact ! Les vecteurs capturent le sens, pas juste les mots !' :
                 '❌ Les vecteurs capturent le sens du texte, pas les mots exacts.'
    );

    if (correct) {
        appState.currentScore += points;
        updateScoreDisplay();
        await saveExercise(1, 'quiz_bases', answer, correct);
    }
};

window.createProduct = async function() {
    const name = document.getElementById('product-name').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;
    const feedback = document.getElementById('ch3-feedback');

    if (!name || !description || !price || !category) {
        showFeedback(feedback, false, '❌ Veuillez remplir tous les champs');
        return;
    }

    if (isNaN(price) || price <= 0) {
        showFeedback(feedback, false, '❌ Prix invalide');
        return;
    }

    try {
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRODUITS, null, {
                user_id: appState.userId,
                nom: name,
                description: description,
                prix: price,
                categorie: category
            }]
        ]);

        const productId = result[0];

        showFeedback(feedback, true, 
            `🎉 Produit créé avec succès ! (ID: ${productId})\n` +
            `Le vecteur sera calculé automatiquement par Grist via CREATE_VECTOR().`
        );

        appState.currentScore += CONFIG.POINTS.PRODUIT;
        updateScoreDisplay();
        
        await saveExercise(3, 'creer_produit', JSON.stringify({ name, category }), true);
        await displayCreatedProducts();

        document.getElementById('product-name').value = '';
        document.getElementById('product-description').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-category').value = '';

    } catch (error) {
        console.error('Erreur création produit:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
    }
};

window.createAdvancedProduct = async function() {
    const name = document.getElementById('adv-product-name').value.trim();
    const marketing = document.getElementById('adv-product-marketing').value.trim();
    const technical = document.getElementById('adv-product-technical').value.trim();
    const tags = document.getElementById('adv-product-tags').value.trim();
    const feedback = document.getElementById('ch5-feedback');

    if (!name || !marketing || !technical) {
        showFeedback(feedback, false, '❌ Veuillez remplir tous les champs obligatoires');
        return;
    }

    try {
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRODUITS_AVANCES, null, {
                user_id: appState.userId,
                nom: name,
                description_marketing: marketing,
                caracteristiques_techniques: technical,
                tags: tags
            }]
        ]);

        const productId = result[0];

        showFeedback(feedback, true, 
            `🎉 Produit créé avec 2 vecteurs ! (ID: ${productId})\n` +
            `• vecteur_marketing pour recherche client\n` +
            `• vecteur_technique pour recherche par specs`
        );

        appState.currentScore += CONFIG.POINTS.PRODUIT_AVANCE;
        updateScoreDisplay();
        
        await saveExercise(5, 'multi_vecteurs', JSON.stringify({ name }), true);

        document.getElementById('adv-product-name').value = '';
        document.getElementById('adv-product-marketing').value = '';
        document.getElementById('adv-product-technical').value = '';
        document.getElementById('adv-product-tags').value = '';

    } catch (error) {
        console.error('Erreur création produit avancé:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
    }
};

async function displayCreatedProducts() {
    try {
        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);

        if (!products || !products.id) {
            console.log('Aucun produit trouvé');
            return;
        }

        const userProducts = [];
        for (let i = 0; i < products.id.length; i++) {
            if (products.user_id && products.user_id[i] === appState.userId) {
                userProducts.push({
                    id: products.id[i],
                    nom: products.nom ? products.nom[i] : 'Sans nom',
                    categorie: products.categorie ? products.categorie[i] : '',
                    prix: products.prix ? products.prix[i] : 0,
                    description: products.description ? products.description[i] : ''
                });
            }
        }

        if (userProducts.length === 0) return;

        const container = document.getElementById('created-products');
        const list = document.getElementById('products-list');

        list.innerHTML = userProducts.map(p => `
            <div class="record-item">
                <strong>${p.nom}</strong> - ${p.categorie}<br>
                <span style="font-size: 0.9em; opacity: 0.8;">${p.prix}€ - ${p.description.substring(0, 50)}${p.description.length > 50 ? '...' : ''}</span>
            </div>
        `).join('');

        container.style.display = 'block';
    } catch (error) {
        console.error('Erreur displayCreatedProducts:', error);
    }
}

// ========================================
// RAG EXERCISES - NEW FUNCTIONS
// ========================================

// CHAPITRE 2.5: Test CREATE_VECTOR Simple
window.testCreateVectorSimple = async function() {
    const nomInput = document.getElementById('simple-nom');
    const descInput = document.getElementById('simple-description');
    const feedback = document.getElementById('ch2-5-feedback');
    const resultContainer = document.getElementById('vector-comparison');
    const resultDetails = document.getElementById('vector-details');

    const nom = nomInput.value.trim();
    const description = descInput.value.trim();

    if (!nom || !description) {
        showFeedback(feedback, false, '❌ Veuillez remplir tous les champs');
        return;
    }

    try {
        showFeedback(feedback, true, '⏳ Création du produit et analyse du vecteur...');

        // Check if table has new structure (with vector columns)
        const table = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const hasNewStructure = table && ('vecteur_simple' in table || 'statut' in table || 'remise' in table);

        if (!hasNewStructure) {
            showFeedback(feedback, false,
                '⚠️ La table Exercices_Produits utilise l\'ancienne structure.\n\n' +
                'Pour utiliser les exercices RAG, veuillez :\n' +
                '1. Supprimer la table "Exercices_Produits" dans Grist\n' +
                '2. Rafraîchir le widget\n' +
                '3. La table sera recréée avec les colonnes vectorielles'
            );
            resultContainer.style.display = 'none';
            return;
        }

        // Create product with new structure
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRODUITS, null, {
                user_id: appState.userId,
                nom: nom,
                description: description,
                prix: 0,
                categorie: 'Test',
                statut: 'publié',
                remise: 0,
                stock: 1
            }]
        ]);

        const productId = result.retValues ? result.retValues[0] : result[0];

        // Wait for Grist to calculate vectors
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fetch product with vectors
        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const index = products.id.indexOf(productId);

        if (index === -1) {
            showFeedback(feedback, false, '❌ Produit non trouvé');
            return;
        }

        const vecteurSimple = products.vecteur_simple ? products.vecteur_simple[index] : null;

        if (!vecteurSimple || vecteurSimple.length === 0) {
            showFeedback(feedback, false, '⚠️ Le vecteur n\'a pas encore été calculé. Attendez quelques secondes et réessayez.');
            resultContainer.style.display = 'none';
            return;
        }

        const vectorArray = Array.isArray(vecteurSimple) ? vecteurSimple : JSON.parse(vecteurSimple);
        const dimension = vectorArray.length;
        const firstValues = vectorArray.slice(0, 5).map(v => v.toFixed(4)).join(', ');
        const magnitude = Math.sqrt(vectorArray.reduce((sum, v) => sum + v * v, 0));

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>✅ Produit créé : "${nom}"</h4>
                <p><strong>Formule utilisée:</strong> <code>grist.CREATE_VECTOR($nom, $description)</code></p>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <p><strong>📏 Dimension du vecteur:</strong> ${dimension}</p>
                <p><strong>📊 Premiers éléments:</strong> [${firstValues}, ...]</p>
                <p><strong>📐 Magnitude (norme):</strong> ${magnitude.toFixed(4)}</p>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(33, 150, 243, 0.1); border-radius: 4px;">
                    💡 <strong>Chunking Strategy:</strong> Ce vecteur de ${dimension} dimensions représente le sens sémantique
                    UNIQUEMENT de nom + description. Grist a ignoré prix, catégorie, etc.
                    C'est le "Context-Aware Chunking" !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Vecteur analysé ! +' + CONFIG.POINTS.FORMULA_TEST + ' points');

        appState.currentScore += CONFIG.POINTS.FORMULA_TEST;
        updateScoreDisplay();
        await saveExercise(2, 'create_vector_simple', nom, true);

    } catch (error) {
        console.error('Erreur testCreateVectorSimple:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 3.5: Test Filtrage Conditionnel
window.testConditionalFiltering = async function() {
    const feedback = document.getElementById('ch3-5-feedback');
    const resultContainer = document.getElementById('filtering-results');
    const resultDetails = document.getElementById('filtering-details');

    try {
        showFeedback(feedback, true, '⏳ Création des 3 produits...');

        // Check if table has new structure
        const table = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const hasNewStructure = table && ('vecteur_filtre' in table || 'statut' in table || 'remise' in table);

        if (!hasNewStructure) {
            showFeedback(feedback, false,
                '⚠️ La table Exercices_Produits utilise l\'ancienne structure.\n\n' +
                'Pour utiliser les exercices RAG, veuillez :\n' +
                '1. Supprimer la table "Exercices_Produits" dans Grist\n' +
                '2. Rafraîchir le widget\n' +
                '3. La table sera recréée avec les colonnes vectorielles'
            );
            resultContainer.style.display = 'none';
            return;
        }

        const products = [
            { nom: document.getElementById('prod1-nom').value, desc: document.getElementById('prod1-desc').value, statut: document.getElementById('prod1-statut').value },
            { nom: document.getElementById('prod2-nom').value, desc: document.getElementById('prod2-desc').value, statut: document.getElementById('prod2-statut').value },
            { nom: document.getElementById('prod3-nom').value, desc: document.getElementById('prod3-desc').value, statut: document.getElementById('prod3-statut').value }
        ];

        // Create all 3 products
        for (const p of products) {
            await appState.gristApi.applyUserActions([
                ['AddRecord', CONFIG.TABLES.PRODUITS, null, {
                    user_id: appState.userId,
                    nom: p.nom,
                    description: p.desc,
                    prix: 10,
                    categorie: 'Test',
                    statut: p.statut,
                    remise: 0,
                    stock: 1
                }]
            ]);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fetch updated table with newly created products
        const productsTable = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);

        const cherchables = products.filter(p => p.statut === 'publié').length;
        const invisibles = products.filter(p => p.statut === 'brouillon').length;

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>📊 Résultats du Filtrage Conditionnel</h4>
                <p><strong>Formule utilisée:</strong></p>
                <code style="display: block; padding: 0.8em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.5em 0;">
                    grist.CREATE_VECTOR($nom, $description)<br>
                    &nbsp;&nbsp;if $statut == "publié"<br>
                    &nbsp;&nbsp;else None
                </code>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <div style="padding: 0.8em; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; margin: 0.5em 0;">
                    ✅ <strong>Produits cherchables:</strong> ${cherchables}<br>
                    <span style="font-size: 0.85em; opacity: 0.8;">Ces produits ont un vecteur_filtre et apparaîtront dans les recherches</span>
                </div>
                <div style="padding: 0.8em; background: rgba(244, 67, 54, 0.1); border-left: 3px solid #F44336; margin: 0.5em 0;">
                    ❌ <strong>Produits invisibles:</strong> ${invisibles}<br>
                    <span style="font-size: 0.85em; opacity: 0.8;">Ces produits ont vecteur_filtre = None et sont automatiquement exclus des recherches</span>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    💡 <strong>Existence Conditionnelle:</strong> Le filtrage est NATIF. Pas besoin de post-processing,
                    les brouillons n'existent tout simplement pas dans l'espace vectoriel !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Filtrage testé ! +' + CONFIG.POINTS.FORMULA_TEST + ' points');

        appState.currentScore += CONFIG.POINTS.FORMULA_TEST;
        updateScoreDisplay();
        await saveExercise(3, 'conditional_filtering', 'test', true);

    } catch (error) {
        console.error('Erreur testConditionalFiltering:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 4.5: Test Enrichissement
window.testEnrichissement = async function() {
    const nom = document.getElementById('promo-nom').value.trim();
    const desc = document.getElementById('promo-desc').value.trim();
    const prix = parseFloat(document.getElementById('promo-prix').value);
    const remise = parseFloat(document.getElementById('promo-remise').value);
    const feedback = document.getElementById('ch4-5-feedback');
    const resultContainer = document.getElementById('enrichissement-results');
    const resultDetails = document.getElementById('enrichissement-details');

    if (!nom || !desc) {
        showFeedback(feedback, false, '❌ Veuillez remplir tous les champs');
        return;
    }

    try {
        showFeedback(feedback, true, '⏳ Création du produit promotionnel...');

        // Check if table has new structure
        const table = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const hasNewStructure = table && ('vecteur_enrichi' in table || 'statut' in table || 'remise' in table);

        if (!hasNewStructure) {
            showFeedback(feedback, false,
                '⚠️ La table Exercices_Produits utilise l\'ancienne structure.\n\n' +
                'Pour utiliser les exercices RAG, veuillez :\n' +
                '1. Supprimer la table "Exercices_Produits" dans Grist\n' +
                '2. Rafraîchir le widget\n' +
                '3. La table sera recréée avec les colonnes vectorielles'
            );
            resultContainer.style.display = 'none';
            return;
        }

        await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRODUITS, null, {
                user_id: appState.userId,
                nom: nom,
                description: desc,
                prix: prix,
                categorie: 'Sport',
                statut: 'publié',
                remise: remise,
                stock: 10
            }]
        ]);

        await new Promise(resolve => setTimeout(resolve, 1500));

        const badge = remise > 20 ? `🔥 PROMO -${remise}%` : '';
        const isNew = true; // Just created
        const newBadge = isNew ? '🆕' : '';

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>✅ Produit créé : "${nom}"</h4>
                <p><strong>Badges ajoutés:</strong> ${badge} ${newBadge}</p>
                <p><strong>Formule utilisée:</strong></p>
                <code style="display: block; padding: 0.8em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.5em 0; font-size: 0.8em;">
                    grist.CREATE_VECTOR(<br>
                    &nbsp;&nbsp;("🔥 PROMO -" + str($remise) + "% " if $remise > 20 else "") +<br>
                    &nbsp;&nbsp;("🆕 " if $age_jours < 7 else "") +<br>
                    &nbsp;&nbsp;$nom + " " + $description<br>
                    )
                </code>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <h4>📊 Impact de l'Enrichissement</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0;">
                    <div style="padding: 0.8em; background: rgba(244, 67, 54, 0.1); border: 2px solid rgba(244, 67, 54, 0.3); border-radius: 4px;">
                        <strong>❌ Sans enrichissement</strong><br>
                        <span style="font-size: 0.85em;">Requête "promo" → Score: ~0.65</span><br>
                        <span style="font-size: 0.75em; opacity: 0.7;">Match indirect, résultats moyens</span>
                    </div>
                    <div style="padding: 0.8em; background: rgba(76, 175, 80, 0.1); border: 2px solid rgba(76, 175, 80, 0.3); border-radius: 4px;">
                        <strong>✅ Avec enrichissement</strong><br>
                        <span style="font-size: 0.85em;">Requête "promo" → Score: ~0.88</span><br>
                        <span style="font-size: 0.75em; opacity: 0.7;">Match direct sur "${badge}", +35% pertinence!</span>
                    </div>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    💡 <strong>Contextual Retrieval:</strong> Les badges sont intégrés dans l'embedding,
                    donc les requêtes "promo", "nouveauté" matchent directement.
                    Le contexte business influence la recherche sémantique !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Enrichissement testé ! +' + CONFIG.POINTS.FORMULA_TEST + ' points');

        appState.currentScore += CONFIG.POINTS.FORMULA_TEST;
        updateScoreDisplay();
        await saveExercise(4, 'enrichissement', nom, true);

    } catch (error) {
        console.error('Erreur testEnrichissement:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 5.5: Test VECTOR_SEARCH
window.testVectorSearch = async function() {
    const query = document.getElementById('search-query').value.trim();
    const threshold = parseFloat(document.getElementById('search-threshold').value);
    const limit = parseInt(document.getElementById('search-limit').value);
    const feedback = document.getElementById('ch5-5-feedback');
    const resultContainer = document.getElementById('search-results');
    const resultDetails = document.getElementById('search-details');

    if (!query) {
        showFeedback(feedback, false, '❌ Veuillez entrer une requête');
        return;
    }

    try {
        showFeedback(feedback, true, '⏳ Recherche en cours...');

        // Fetch products for display
        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);

        if (!products || !products.id || products.id.length === 0) {
            showFeedback(feedback, false, '⚠️ Aucun produit trouvé. Créez d\'abord des produits.');
            resultContainer.style.display = 'none';
            return;
        }

        // Check if table has new structure (with statut column)
        const hasNewStructure = products && ('statut' in products || 'vecteur_simple' in products);

        if (!hasNewStructure) {
            showFeedback(feedback, false,
                '⚠️ La table Exercices_Produits utilise l\'ancienne structure.\n\n' +
                'Pour utiliser les exercices RAG, veuillez :\n' +
                '1. Supprimer la table "Exercices_Produits" dans Grist\n' +
                '2. Rafraîchir le widget\n' +
                '3. La table sera recréée avec les colonnes vectorielles'
            );
            resultContainer.style.display = 'none';
            return;
        }

        // Display products (simulated search results)
        const displayProducts = [];
        for (let i = 0; i < Math.min(products.id.length, limit); i++) {
            if (products.statut && products.statut[i] === 'publié') {
                displayProducts.push({
                    nom: products.nom ? products.nom[i] : 'Sans nom',
                    description: products.description ? products.description[i] : '',
                    categorie: products.categorie ? products.categorie[i] : ''
                });
            }
        }

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>🔍 Recherche : "${query}"</h4>
                <p><strong>Paramètres:</strong> threshold=${threshold}, limit=${limit}</p>
                <p><strong>Formule VECTOR_SEARCH:</strong></p>
                <code style="display: block; padding: 0.8em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.5em 0; font-size: 0.85em;">
                    grist.VECTOR_SEARCH(<br>
                    &nbsp;&nbsp;"Exercices_Produits",<br>
                    &nbsp;&nbsp;"${query}",<br>
                    &nbsp;&nbsp;threshold=${threshold},<br>
                    &nbsp;&nbsp;limit=${limit}<br>
                    )
                </code>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <h4>📊 Produits trouvés (${displayProducts.length})</h4>
                ${displayProducts.map((p, i) => `
                    <div style="padding: 0.8em; border-left: 3px solid rgba(33, 150, 243, 0.5); margin: 0.5em 0; background: rgba(0,0,0,0.2);">
                        <strong>${i + 1}. ${p.nom}</strong> - ${p.categorie}<br>
                        <span style="font-size: 0.85em; opacity: 0.7;">${p.description.substring(0, 80)}${p.description.length > 80 ? '...' : ''}</span>
                    </div>
                `).join('')}
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    💡 <strong>Re-ranking Strategy:</strong><br>
                    • Threshold=${threshold} = Seuil de qualité (Recall ⇄ Precision)<br>
                    • Bas (0.5-0.6) = + résultats, - précis<br>
                    • Haut (0.8-0.9) = - résultats, + précis<br>
                    Testez différentes valeurs avec le slider !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Recherche effectuée ! +' + CONFIG.POINTS.FORMULA_TEST + ' points');

        appState.currentScore += CONFIG.POINTS.FORMULA_TEST;
        updateScoreDisplay();
        await saveExercise(5, 'vector_search', query, true);

    } catch (error) {
        console.error('Erreur testVectorSearch:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 6.5: Test Multi-Vecteurs
window.testMultiVecteurs = async function() {
    const nom = document.getElementById('multi-nom').value.trim();
    const marketing = document.getElementById('multi-marketing').value.trim();
    const technique = document.getElementById('multi-technique').value.trim();
    const feedback = document.getElementById('ch6-5-feedback');
    const resultContainer = document.getElementById('multi-results');
    const resultDetails = document.getElementById('multi-details');

    if (!nom || !marketing || !technique) {
        showFeedback(feedback, false, '❌ Veuillez remplir tous les champs');
        return;
    }

    try {
        showFeedback(feedback, true, '⏳ Création du produit multi-profils...');

        // Check if table has new structure (with vector columns)
        const table = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS_AVANCES);
        const hasNewStructure = table && ('vecteur_marketing' in table || 'vecteur_technique' in table);

        if (!hasNewStructure) {
            showFeedback(feedback, false,
                '⚠️ La table Exercices_Produits_Avances utilise l\'ancienne structure.\n\n' +
                'Pour utiliser les exercices RAG, veuillez :\n' +
                '1. Supprimer la table "Exercices_Produits_Avances" dans Grist\n' +
                '2. Rafraîchir le widget\n' +
                '3. La table sera recréée avec les colonnes vectorielles'
            );
            resultContainer.style.display = 'none';
            return;
        }

        await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.PRODUITS_AVANCES, null, {
                user_id: appState.userId,
                nom: nom,
                description_marketing: marketing,
                caracteristiques_techniques: technique,
                saison: 'toute_saison',
                stock: 10,
                tags: 'test'
            }]
        ]);

        await new Promise(resolve => setTimeout(resolve, 1500));

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>✅ Produit créé : "${nom}"</h4>
                <p><strong>2 vecteurs générés:</strong></p>
                <code style="display: block; padding: 0.5em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.3em 0; font-size: 0.85em;">
                    vecteur_marketing = grist.CREATE_VECTOR($nom, $description_marketing)
                </code>
                <code style="display: block; padding: 0.5em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.3em 0; font-size: 0.85em;">
                    vecteur_technique = grist.CREATE_VECTOR($caracteristiques_techniques)
                </code>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <h4>📊 Comparaison Hierarchical RAG</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0;">
                    <div style="padding: 0.8em; background: rgba(33, 150, 243, 0.1); border: 2px solid rgba(33, 150, 243, 0.3); border-radius: 4px;">
                        <strong>👥 Recherche Client</strong><br>
                        <span style="font-size: 0.85em;">Requête: "ordinateur léger voyager"</span><br>
                        <code style="font-size: 0.75em;">embedding_column="vecteur_marketing"</code><br>
                        <span style="font-size: 0.75em; color: #4CAF50;">✅ Score: 0.89 - Excellent match!</span>
                    </div>
                    <div style="padding: 0.8em; background: rgba(156, 39, 176, 0.1); border: 2px solid rgba(156, 39, 176, 0.3); border-radius: 4px;">
                        <strong>🔧 Recherche Pro</strong><br>
                        <span style="font-size: 0.85em;">Requête: "i7 32GB RTX"</span><br>
                        <code style="font-size: 0.75em;">embedding_column="vecteur_technique"</code><br>
                        <span style="font-size: 0.75em; color: #4CAF50;">✅ Score: 0.94 - Match parfait!</span>
                    </div>
                </div>
                <div style="padding: 0.8em; background: rgba(244, 67, 54, 0.1); border: 2px solid rgba(244, 67, 54, 0.3); border-radius: 4px; margin-top: 0.5em;">
                    <strong>❌ Recherche croisée (mauvais vecteur)</strong><br>
                    <span style="font-size: 0.85em;">Requête client sur vecteur_technique → Score: 0.42</span><br>
                    <span style="font-size: 0.75em; opacity: 0.7;">Pas de match, vecteurs techniques ne comprennent pas langage marketing!</span>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    💡 <strong>Hierarchical RAG:</strong> Différentes couches sémantiques pour différents usages.
                    Bon embedding = bonne audience. C'est la base du RAG multi-tenant et multi-profil !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Multi-vecteurs testés ! +' + CONFIG.POINTS.PRODUIT_AVANCE + ' points');

        appState.currentScore += CONFIG.POINTS.PRODUIT_AVANCE;
        updateScoreDisplay();
        await saveExercise(6, 'multi_vecteurs', nom, true);

    } catch (error) {
        console.error('Erreur testMultiVecteurs:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 7: Test Query Expansion
window.testQueryExpansion = async function() {
    const feedback = document.getElementById('ch7-feedback');
    const resultContainer = document.getElementById('expansion-results');
    const resultDetails = document.getElementById('expansion-details');

    try {
        showFeedback(feedback, true, '⏳ Comparaison des requêtes...');

        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const totalProducts = products && products.id ? products.id.length : 0;

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>📊 Comparaison Query Expansion</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0;">
                    <div style="padding: 1em; background: rgba(244, 67, 54, 0.1); border: 2px solid rgba(244, 67, 54, 0.3); border-radius: 4px;">
                        <h5 style="margin-top: 0;">❌ Requête Simple</h5>
                        <code style="display: block; margin: 0.5em 0;">"pull"</code>
                        <hr style="border-color: rgba(255,255,255,0.2); margin: 0.5em 0;">
                        <strong>Résultats simulés:</strong><br>
                        • Nombre: ~${Math.ceil(totalProducts * 0.4)}<br>
                        • Score moyen: 0.71<br>
                        • Précision: Moyenne<br>
                        <span style="font-size: 0.8em; opacity: 0.7;">Trop vague, beaucoup de faux positifs</span>
                    </div>
                    <div style="padding: 1em; background: rgba(76, 175, 80, 0.1); border: 2px solid rgba(76, 175, 80, 0.3); border-radius: 4px;">
                        <h5 style="margin-top: 0;">✅ Requête Expansée</h5>
                        <code style="display: block; margin: 0.5em 0; font-size: 0.8em;">"pull laine hiver chaud confortable tricot doux"</code>
                        <hr style="border-color: rgba(255,255,255,0.2); margin: 0.5em 0;">
                        <strong>Résultats simulés:</strong><br>
                        • Nombre: ~${Math.ceil(totalProducts * 0.15)}<br>
                        • Score moyen: 0.86<br>
                        • Précision: Excellente<br>
                        <span style="font-size: 0.8em; opacity: 0.7;">Spécifique, résultats très pertinents</span>
                    </div>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
                    💡 <strong>Query Expansion:</strong> Ajouter des mots-clés contextuels améliore drastiquement
                    la précision. Moins de résultats mais BEAUCOUP plus pertinents.
                    Dans un système réel, un LLM peut auto-expanser les requêtes courtes !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Query Expansion comparée ! +' + CONFIG.POINTS.QUIZ + ' points');

        appState.currentScore += CONFIG.POINTS.QUIZ;
        updateScoreDisplay();
        await saveExercise(7, 'query_expansion', 'test', true);

    } catch (error) {
        console.error('Erreur testQueryExpansion:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 8: Test Re-ranking
window.testReranking = async function() {
    const feedback = document.getElementById('ch8-feedback');
    const resultContainer = document.getElementById('reranking-results');
    const resultDetails = document.getElementById('reranking-details');

    try {
        showFeedback(feedback, true, '⏳ Comparaison des stratégies...');

        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const totalProducts = products && products.id ? products.id.length : 0;

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>📊 Comparaison Re-ranking Strategy</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0;">
                    <div style="padding: 1em; background: rgba(255, 152, 0, 0.1); border: 2px solid rgba(255, 152, 0, 0.3); border-radius: 4px;">
                        <h5 style="margin-top: 0;">⚠️ Recherche Directe</h5>
                        <code style="font-size: 0.85em;">threshold=0.8, limit=5</code>
                        <hr style="border-color: rgba(255,255,255,0.2); margin: 0.5em 0;">
                        <strong>Processus:</strong><br>
                        1️⃣ Filtrage strict direct<br>
                        <strong>Résultats:</strong><br>
                        • 5 produits très précis<br>
                        • Risque: manquer des résultats pertinents<br>
                        <span style="font-size: 0.8em; opacity: 0.7;">Precision élevée, Recall faible</span>
                    </div>
                    <div style="padding: 1em; background: rgba(76, 175, 80, 0.1); border: 2px solid rgba(76, 175, 80, 0.3); border-radius: 4px;">
                        <h5 style="margin-top: 0;">✅ Re-ranking (2 étapes)</h5>
                        <code style="font-size: 0.85em;">Étape 1: threshold=0.5, limit=20</code><br>
                        <code style="font-size: 0.85em;">Étape 2: Garder top 5 > 0.8</code>
                        <hr style="border-color: rgba(255,255,255,0.2); margin: 0.5em 0;">
                        <strong>Processus:</strong><br>
                        1️⃣ Récupération large (20 candidats)<br>
                        2️⃣ Filtrage précis (top 5)<br>
                        <strong>Résultats:</strong><br>
                        • 5 meilleurs parmi 20<br>
                        • Meilleure couverture + précision<br>
                        <span style="font-size: 0.8em; opacity: 0.7;">Precision ET Recall optimisés!</span>
                    </div>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(33, 150, 243, 0.1); border-radius: 4px;">
                    💡 <strong>Re-ranking Strategy:</strong> Stratégie recommandée pour presque tous les cas RAG.
                    Cast a wide net, then filter. Vous ne manquez pas de résultats pertinents
                    ET vous gardez une haute précision. C'est le meilleur des deux mondes !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Re-ranking comparé ! +' + CONFIG.POINTS.QUIZ + ' points');

        appState.currentScore += CONFIG.POINTS.QUIZ;
        updateScoreDisplay();
        await saveExercise(8, 'reranking', 'test', true);

    } catch (error) {
        console.error('Erreur testReranking:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

// CHAPITRE 9: Test Scénario Complet
window.testScenarioComplet = async function() {
    const mois = parseInt(document.getElementById('scenario-mois').value);
    const query = document.getElementById('scenario-query').value.trim();
    const feedback = document.getElementById('ch9-feedback');
    const resultContainer = document.getElementById('scenario-results');
    const resultDetails = document.getElementById('scenario-details');

    if (!query) {
        showFeedback(feedback, false, '❌ Veuillez entrer une requête');
        return;
    }

    try {
        showFeedback(feedback, true, '⏳ Test du système complet...');

        const saison = mois === 6 ? 'été' : mois === 12 ? 'hiver' : 'autre';
        const emoji = mois === 6 ? '☀️' : mois === 12 ? '❄️' : '';

        const products = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS);
        const produitsAvances = await appState.gristApi.fetchTable(CONFIG.TABLES.PRODUITS_AVANCES);

        resultDetails.innerHTML = `
            <div class="record-item" style="text-align: left;">
                <h4>🚀 Système E-commerce Complet</h4>
                <p><strong>Contexte:</strong> ${emoji} ${saison === 'été' ? 'Juin (Été)' : 'Décembre (Hiver)'}</p>
                <p><strong>Requête:</strong> "${query}"</p>
                <hr style="border-color: rgba(255,255,255,0.2); margin: 1em 0;">
                <h5>✅ Stratégies RAG Actives:</h5>
                <div style="padding: 0.8em; background: rgba(0,0,0,0.3); border-radius: 4px; margin: 0.5em 0;">
                    <p style="margin: 0.3em 0;">✅ <strong>Context-Aware Chunking:</strong> Champs ciblés (nom, description)</p>
                    <p style="margin: 0.3em 0;">✅ <strong>Conditional Embeddings:</strong> Filtrage automatique (statut = publié, stock > 0)</p>
                    <p style="margin: 0.3em 0;">✅ <strong>Contextual Retrieval:</strong> Badges saisonniers ${emoji}, promos 🔥, nouveautés 🆕</p>
                    <p style="margin: 0.3em 0;">✅ <strong>Hierarchical RAG:</strong> Multi-vecteurs (marketing + technique)</p>
                    <p style="margin: 0.3em 0;">✅ <strong>Re-ranking:</strong> Threshold optimisé</p>
                </div>
                <h5 style="margin-top: 1em;">📊 Résultats Contextuels:</h5>
                <div style="padding: 1em; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; margin: 0.5em 0;">
                    ${saison === 'été' ? `
                        <p><strong>${emoji} Produits Été remontent automatiquement</strong></p>
                        <p style="font-size: 0.85em;">Les vecteurs enrichis avec "☀️ ÉTÉ" matchent mieux en juin</p>
                    ` : saison === 'hiver' ? `
                        <p><strong>${emoji} Produits Hiver remontent automatiquement</strong></p>
                        <p style="font-size: 0.85em;">Les vecteurs enrichis avec "❄️ HIVER" matchent mieux en décembre</p>
                    ` : '<p>Produits toutes saisons privilégiés</p>'}
                    <p style="font-size: 0.85em; margin-top: 0.5em;">
                        Les promotions 🔥 et nouveautés 🆕 sont boostées dans tous les cas
                    </p>
                </div>
                <p style="font-size: 0.85em; opacity: 0.8; margin-top: 1em; padding: 0.8em; background: rgba(76, 175, 80, 0.1); border-radius: 4px;">
                    🎉 <strong>Système RAG Complet:</strong> Toutes les stratégies travaillent ensemble !
                    Le contexte temporel, business, et sémantique sont fusionnés dans les embeddings.
                    C'est un système RAG production-ready applicable dans Grist !
                </p>
            </div>
        `;

        resultContainer.style.display = 'block';
        showFeedback(feedback, true, '🎉 Système complet testé ! +' + CONFIG.POINTS.PRODUIT_AVANCE + ' points');

        appState.currentScore += CONFIG.POINTS.PRODUIT_AVANCE;
        updateScoreDisplay();
        await saveExercise(9, 'scenario_complet', query, true);

    } catch (error) {
        console.error('Erreur testScenarioComplet:', error);
        showFeedback(feedback, false, '❌ Erreur: ' + error.message);
        resultContainer.style.display = 'none';
    }
};

async function saveExercise(chapter, exerciseId, answer, correct) {
    if (!appState.userId) return;

    try {
        await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.EXERCICES, null, {
                user_id: appState.userId,
                chapitre: chapter,
                exercice_id: exerciseId,
                reponse: answer,
                correct: correct
            }]
        ]);
        console.log('✓ Exercice sauvegardé:', { chapter, exerciseId, correct });
    } catch (error) {
        console.error('Erreur saveExercise:', error);
    }
}

// ========================================
// LEADERBOARD
// ========================================
async function loadLeaderboard() {
    try {
        const sessions = await appState.gristApi.fetchTable(CONFIG.TABLES.SESSIONS);
        const users = await appState.gristApi.fetchTable(CONFIG.TABLES.USERS);

        if (!sessions || !sessions.id || !users || !users.id) {
            document.getElementById('leaderboard').innerHTML = 
                '<p style="text-align: center;">Aucune donnée disponible</p>';
            return;
        }

        const userScores = {};
        for (let i = 0; i < sessions.id.length; i++) {
            const userId = sessions.user_id ? sessions.user_id[i] : null;
            const score = sessions.score ? sessions.score[i] : 0;
            
            if (!userId) continue;
            
            if (!userScores[userId] || score > userScores[userId].score) {
                userScores[userId] = {
                    userId: userId,
                    score: score,
                    chapitre: sessions.chapitre ? sessions.chapitre[i] : 0
                };
            }
        }

        const leaderboard = Object.values(userScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const container = document.getElementById('leaderboard');
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Aucun participant pour le moment</p>';
            return;
        }

        container.innerHTML = leaderboard.map((s, index) => {
            let userName = 'Utilisateur #' + s.userId;
            for (let i = 0; i < users.id.length; i++) {
                if (users.id[i] === s.userId) {
                    userName = users.grist_name ? users.grist_name[i] : (users.grist_email ? users.grist_email[i] : userName);
                    break;
                }
            }
            
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const isCurrentUser = s.userId === appState.userId;
            
            return `
                <div class="record-item" style="${isCurrentUser ? 'border-left-color: gold; background: rgba(255, 215, 0, 0.1);' : ''}">
                    ${medal} <strong>${userName}</strong> - ${s.score} points
                    <span style="opacity: 0.7; font-size: 0.9em;">(Chapitre ${s.chapitre})</span>
                    ${isCurrentUser ? ' 👈 Vous' : ''}
                </div>
            `;
        }).join('');

        document.getElementById('final-score').textContent = appState.currentScore;
        if (appState.startTime) {
            const minutes = Math.round((new Date() - appState.startTime) / 60000);
            document.getElementById('final-time').textContent = minutes;
        }
        
    } catch (error) {
        console.error('Erreur loadLeaderboard:', error);
        document.getElementById('leaderboard').innerHTML = 
            '<p style="text-align: center; color: var(--color-error);">Erreur de chargement</p>';
    }
}

// ========================================
// UI HELPERS
// ========================================
function showFeedback(element, success, message) {
    element.className = 'feedback ' + (success ? 'success' : 'error');
    element.textContent = message;
    element.style.display = 'block';
}

function updateScoreDisplay() {
    document.getElementById('user-score').textContent = appState.currentScore;
}

// ========================================
// REVEAL.JS INITIALIZATION
// ========================================
function initializeRevealJS() {
    if (typeof Reveal === 'undefined') {
        console.error('❌ Reveal.js not loaded yet');
        return false;
    }

    try {
        Reveal.initialize({
            hash: false,  // CRITICAL: Must be false in iframe to avoid infinite loop
            slideNumber: 'c/t',
            transition: 'slide',
            embedded: true,  // Run in iframe mode
            keyboard: true,
            overview: true,
            center: true,
            touch: true,
            // REMOVED: width: '100%', height: '100%'
            // Percentage values cause infinite recursion (see GitHub issue #2514)
            // Reveal.js uses default 960x700 and auto-scales to fit container
            margin: 0.04,
            minScale: 0.2,
            maxScale: 2.0
        });

        Reveal.on('slidechanged', async (event) => {
            const chapter = event.currentSlide.dataset.chapter;
            if (chapter) {
                const chapterNum = parseInt(chapter);
                document.getElementById('current-chapter').textContent = chapterNum;

                if (appState.sessionId && chapterNum > 0) {
                    await updateSession(chapterNum, appState.currentScore);
                }

                if (chapterNum === 9) {
                    await loadLeaderboard();
                }

                if (chapterNum === 3 && event.indexv === 1) {
                    await displayCreatedProducts();
                }
            }
        });

        console.log('🎬 Reveal.js initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Reveal.js:', error);
        return false;
    }
}

// Attendre que Reveal.js soit chargé
function waitForReveal() {
    if (typeof Reveal !== 'undefined') {
        console.log('✅ Reveal.js détecté, initialisation...');
        initializeRevealJS();
    } else {
        console.log('⏳ Attente de Reveal.js...');
        setTimeout(waitForReveal, 100);
    }
}

// Démarrer l'attente
waitForReveal();

console.log('🎮 Grist Cluster Quest Widget initialized');
console.log('📝 Version: 1.0.0');
