// Propriétés spécifiques pour chaque type de composant
// Ce fichier contient les fonctions pour générer les panneaux de propriétés

function getPropertiesHTML(comp) {
    // Calculer les pourcentages à partir des pixels
    const xPercent = comp.x_canvas !== undefined ? ((comp.x_canvas / 960) * 100).toFixed(1) : '';
    const yPercent = comp.y_canvas !== undefined ? ((comp.y_canvas / 700) * 100).toFixed(1) : '';
    const widthPercent = comp.width !== undefined ? ((comp.width / 960) * 100).toFixed(1) : '';
    const heightPercent = comp.height !== undefined ? ((comp.height / 700) * 100).toFixed(1) : '';

    // Propriétés communes
    let html = `
        <div class="property-group">
            <h4>Type</h4>
            <p style="margin: 0;">${comp.type}</p>
        </div>

        <div class="property-group">
            <h4>Position relative (%)</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>X (%)</label>
                    <input type="number" step="0.1" id="prop-x-percent" value="${xPercent}">
                    <small style="opacity: 0.6; font-size: 0.85em;">${comp.x_canvas !== undefined ? comp.x_canvas + 'px' : ''}</small>
                </div>
                <div class="form-group">
                    <label>Y (%)</label>
                    <input type="number" step="0.1" id="prop-y-percent" value="${yPercent}">
                    <small style="opacity: 0.6; font-size: 0.85em;">${comp.y_canvas !== undefined ? comp.y_canvas + 'px' : ''}</small>
                </div>
            </div>
        </div>

        <div class="property-group">
            <h4>Taille relative (%)</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Largeur (%)</label>
                    <input type="number" step="0.1" id="prop-width-percent" value="${widthPercent}">
                    <small style="opacity: 0.6; font-size: 0.85em;">${comp.width || ''}${comp.width ? 'px' : ''}</small>
                </div>
                <div class="form-group">
                    <label>Hauteur (%)</label>
                    <input type="number" step="0.1" id="prop-height-percent" value="${heightPercent}">
                    <small style="opacity: 0.6; font-size: 0.85em;">${comp.height || ''}${comp.height ? 'px' : ''}</small>
                </div>
            </div>
        </div>
    `;

    // Propriétés spécifiques au type
    switch (comp.type) {
        case 'text':
            html += getTextProperties(comp);
            break;
        case 'image':
            html += getImageProperties(comp);
            break;
        case 'code':
            html += getCodeProperties(comp);
            break;
        case 'list':
            html += getListProperties(comp);
            break;
        case 'quote':
            html += getQuoteProperties(comp);
            break;
        case 'table':
            html += getTableProperties(comp);
            break;
        case 'video':
            html += getVideoProperties(comp);
            break;
        case 'iframe':
            html += getIframeProperties(comp);
            break;
        case 'chart':
            html += getChartProperties(comp);
            break;
        case 'shape':
            html += getShapeProperties(comp);
            break;
        case 'button':
            html += getButtonProperties(comp);
            break;
    }

    html += `
        <button class="btn-primary" style="width: 100%; margin-top: 1em;" onclick="saveProperties()">
            💾 Appliquer
        </button>
    `;

    return html;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTextProperties(comp) {
    return `
    <div class="property-group">
        <h4>Texte</h4>
        <div class="form-group">
            <label>Contenu</label>
            <textarea id="prop-content" rows="4">${escapeHTML(comp.content || '')}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Taille (px)</label>
                <input type="number" id="prop-font-size" value="${comp.font_size || '24'}">
            </div>
            <div class="form-group">
                <label>Couleur</label>
                <input type="color" id="prop-color" value="${comp.color || '#ffffff'}">
            </div>
        </div>
    </div>`;
}

function getImageProperties(comp) {
    return `
    <div class="property-group">
        <h4>Image</h4>
        <div class="form-group">
            <label>URL</label>
            <input type="text" id="prop-url" value="${comp.url || ''}" placeholder="https://...">
        </div>
        <div class="form-group">
            <label>Texte alternatif</label>
            <input type="text" id="prop-content" value="${comp.content || ''}" placeholder="Description">
        </div>
    </div>`;
}

function getCodeProperties(comp) {
    return `
    <div class="property-group">
        <h4>Code</h4>
        <div class="form-group">
            <label>Code source</label>
            <textarea id="prop-content" rows="6" style="font-family: monospace;">${escapeHTML(comp.content || '// Code here')}</textarea>
        </div>
        <div class="form-group">
            <label>Couleur texte</label>
            <input type="color" id="prop-color" value="${comp.color || '#00ff00'}">
        </div>
    </div>`;
}

function getListProperties(comp) {
    return `
    <div class="property-group">
        <h4>Liste</h4>
        <div class="form-group">
            <label>Éléments (un par ligne)</label>
            <textarea id="prop-content" rows="5">${escapeHTML(comp.content || 'Item 1\nItem 2\nItem 3')}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Taille (px)</label>
                <input type="number" id="prop-font-size" value="${comp.font_size || '20'}">
            </div>
            <div class="form-group">
                <label>Couleur</label>
                <input type="color" id="prop-color" value="${comp.color || '#ffffff'}">
            </div>
        </div>
    </div>`;
}

function getQuoteProperties(comp) {
    return `
    <div class="property-group">
        <h4>Citation</h4>
        <div class="form-group">
            <label>Citation</label>
            <textarea id="prop-content" rows="4">${escapeHTML(comp.content || '"Citation"\n— Auteur')}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Taille (px)</label>
                <input type="number" id="prop-font-size" value="${comp.font_size || '24'}">
            </div>
            <div class="form-group">
                <label>Couleur</label>
                <input type="color" id="prop-color" value="${comp.color || '#ffffff'}">
            </div>
        </div>
    </div>`;
}

function getTableProperties(comp) {
    return `
    <div class="property-group">
        <h4>Tableau</h4>
        <div class="form-group">
            <label>Données CSV (première ligne = en-têtes)</label>
            <textarea id="prop-content" rows="5">${escapeHTML(comp.content || 'Col1,Col2\nVal1,Val2')}</textarea>
        </div>
        <div class="form-group">
            <label>Couleur texte</label>
            <input type="color" id="prop-color" value="${comp.color || '#ffffff'}">
        </div>
    </div>`;
}

function getVideoProperties(comp) {
    return `
    <div class="property-group">
        <h4>Vidéo</h4>
        <div class="form-group">
            <label>URL</label>
            <input type="text" id="prop-url" value="${comp.url || ''}" placeholder="https://youtube.com/...">
        </div>
        <p style="font-size: 0.8em; opacity: 0.7; margin: 0.5em 0;">Supports: YouTube, Vimeo, MP4</p>
    </div>`;
}

function getIframeProperties(comp) {
    return `
    <div class="property-group">
        <h4>Iframe</h4>
        <div class="form-group">
            <label>URL</label>
            <input type="text" id="prop-url" value="${comp.url || ''}" placeholder="https://...">
        </div>
    </div>`;
}

function getChartProperties(comp) {
    return `
    <div class="property-group">
        <h4>Graphique</h4>
        <div class="form-group">
            <label>Configuration Chart.js (JSON)</label>
            <textarea id="prop-content" rows="8" style="font-family: monospace;">${escapeHTML(comp.content || '{"type":"bar","data":{"labels":["A","B"],"datasets":[{"data":[10,20]}]}}')}</textarea>
        </div>
        <p style="font-size: 0.8em; opacity: 0.7; margin: 0.5em 0;">Format: JSON Chart.js</p>
    </div>`;
}

function getShapeProperties(comp) {
    return `
    <div class="property-group">
        <h4>Forme</h4>
        <div class="form-group">
            <label>Couleur de remplissage</label>
            <input type="color" id="prop-color" value="${comp.color || '#4CAF50'}">
        </div>
    </div>`;
}

function getButtonProperties(comp) {
    return `
    <div class="property-group">
        <h4>Bouton</h4>
        <div class="form-group">
            <label>Texte du bouton</label>
            <input type="text" id="prop-content" value="${comp.content || 'Button'}">
        </div>
        <div class="form-group">
            <label>URL/Action</label>
            <input type="text" id="prop-url" value="${comp.url || ''}" placeholder="https:// ou slide:1">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Couleur texte</label>
                <input type="color" id="prop-color" value="${comp.color || '#ffffff'}">
            </div>
            <div class="form-group">
                <label>Couleur fond</label>
                <input type="color" id="prop-background" value="${comp.background || '#4CAF50'}">
            </div>
        </div>
    </div>`;
}
