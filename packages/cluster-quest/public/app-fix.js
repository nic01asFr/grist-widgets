async function createOrFindUser(gristUserId, name, email) {
    try {
        const users = await appState.gristApi.fetchTable(CONFIG.TABLES.USERS);
        
        // Vérifier si les colonnes grist_* existent
        const hasGristColumns = users && users.grist_user_id !== undefined;
        
        if (hasGristColumns && users.id) {
            // Chercher un utilisateur existant par grist_user_id
            for (let i = 0; i < users.id.length; i++) {
                if (users.grist_user_id[i] === gristUserId) {
                    console.log('✓ Utilisateur existant trouvé:', users.id[i]);
                    return users.id[i];
                }
            }
        } else if (users && users.id && users.id.length > 0) {
            // Table Users existe mais sans colonnes grist_* → Il faut les ajouter
            console.warn('⚠️ Table Users existe mais colonnes grist_* manquantes');
            throw new Error('La table Users existe mais ne contient pas les colonnes nécessaires. Veuillez supprimer la table Users et réessayer.');
        }

        // Créer un nouvel utilisateur
        console.log('Creating new user:', name);
        
        const userData = {};
        if (hasGristColumns) {
            // Si les colonnes existent, utiliser les bons noms
            userData.grist_user_id = gristUserId;
            userData.grist_email = email || '';
            userData.grist_name = name;
        } else {
            // Sinon, les colonnes seront créées lors de la création de table
            // Cela ne devrait pas arriver si createMissingTables a été appelé correctement
            throw new Error('Les colonnes utilisateur n\'existent pas. Veuillez créer les tables d\'abord.');
        }
        
        const result = await appState.gristApi.applyUserActions([
            ['AddRecord', CONFIG.TABLES.USERS, null, userData]
        ]);

        const newUserId = result[0];
        console.log('✓ Nouvel utilisateur créé:', newUserId);
        return newUserId;
    } catch (error) {
        console.error('Erreur createOrFindUser:', error);
        throw new Error('Impossible de créer l\'utilisateur dans Grist: ' + error.message);
    }
}