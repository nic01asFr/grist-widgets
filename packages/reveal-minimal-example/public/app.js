// ========================================
// MINIMAL REVEAL.JS WIDGET FOR GRIST
// Based on REVEAL_WIDGET_GUIDE.md
// ========================================

// Global state
let gristApi;
let docApi;
let appState = {
    ready: false,
    records: []
};

// ========================================
// REVEAL.JS INITIALIZATION (CRITICAL)
// ========================================
function initializeRevealJS() {
    if (typeof Reveal === 'undefined') {
        console.error('❌ Reveal.js not loaded yet');
        return false;
    }

    try {
        Reveal.initialize({
            // CRITICAL: Must be false in iframe
            hash: false,

            // CRITICAL: DO NOT use percentage values
            // width: '100%',  // ❌ NEVER DO THIS
            // height: '100%', // ❌ NEVER DO THIS

            // Recommended settings for Grist widgets
            embedded: true,
            slideNumber: 'c/t',
            transition: 'slide',
            keyboard: true,
            overview: true,
            center: true,
            touch: true,
            margin: 0.04,
            minScale: 0.2,
            maxScale: 2.0
        });

        // Event: Slide changed
        Reveal.on('slidechanged', (event) => {
            const slideId = event.currentSlide.dataset.slideId;
            console.log('📍 Slide changed:', slideId);

            // Example: Load data when reaching data slide
            if (slideId === 'data') {
                displayGristData();
            }
        });

        // Event: Ready
        Reveal.on('ready', () => {
            console.log('🎬 Reveal.js ready');
        });

        console.log('✅ Reveal.js initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Reveal.js:', error);
        return false;
    }
}

// CRITICAL: Polling mechanism to wait for Reveal.js CDN load
function waitForReveal() {
    if (typeof Reveal !== 'undefined') {
        console.log('✅ Reveal.js detected, initializing...');
        initializeRevealJS();
    } else {
        console.log('⏳ Waiting for Reveal.js...');
        setTimeout(waitForReveal, 100);
    }
}

// ========================================
// GRIST API INITIALIZATION
// ========================================
async function initializeGristAPI() {
    try {
        gristApi = await window.grist.ready();
        console.log('✅ Grist API ready');

        docApi = gristApi.docApi;

        // Configure widget (optional: specify required columns)
        await gristApi.ready({
            requiredAccess: 'full',
            columns: [
                // Example: { name: 'name', optional: false }
            ]
        });

        // Listen for record updates from Grist
        gristApi.onRecords((records) => {
            console.log('📊 Received records:', records.length);
            appState.records = records;

            // Update display if on data slide
            const currentSlide = Reveal.getCurrentSlide();
            if (currentSlide && currentSlide.dataset.slideId === 'data') {
                displayGristData();
            }
        });

        appState.ready = true;
        console.log('✅ Grist integration complete');
    } catch (error) {
        console.error('❌ Error initializing Grist API:', error);
    }
}

// ========================================
// DISPLAY GRIST DATA
// ========================================
function displayGristData() {
    const container = document.getElementById('grist-data-container');

    if (!appState.records || appState.records.length === 0) {
        container.innerHTML = '<p>No data available. Add some records in Grist!</p>';
        return;
    }

    let html = '<ul style="text-align: left;">';
    appState.records.forEach((record, index) => {
        html += `<li>Record ${record.id}: ${JSON.stringify(record)}</li>`;
        if (index >= 4) return; // Limit to 5 records
    });
    html += '</ul>';

    container.innerHTML = html;

    // CRITICAL: Update Reveal.js layout after content change
    requestAnimationFrame(() => {
        if (typeof Reveal !== 'undefined') {
            Reveal.layout();
        }
    });
}

// ========================================
// INTERACTIVE EXAMPLE: SAVE TO GRIST
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const userInput = document.getElementById('user-input');
    const feedback = document.getElementById('feedback');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const value = userInput.value.trim();

            if (!value) {
                showFeedback('Please enter something!', 'error');
                return;
            }

            try {
                // Example: Save to Grist table named "Inputs"
                // Adjust table name and columns as needed
                await docApi.applyUserActions([
                    ['AddRecord', 'Inputs', null, {
                        value: value,
                        timestamp: new Date().toISOString()
                    }]
                ]);

                showFeedback('✅ Saved to Grist!', 'success');
                userInput.value = '';
            } catch (error) {
                console.error('Error saving to Grist:', error);
                showFeedback('❌ Error: ' + error.message, 'error');
            }
        });
    }

    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = type;

        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }
});

// ========================================
// LOADING SCREEN HANDLER
// ========================================
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';

        // CRITICAL: Force Reveal.js to recalculate layout after modal closes
        // Use requestAnimationFrame to avoid infinite loop
        requestAnimationFrame(() => {
            if (typeof Reveal !== 'undefined') {
                Reveal.layout();
                console.log('🎬 Reveal.js layout updated');
            }
        });
    }
}

// Start button handler
document.getElementById('start-btn')?.addEventListener('click', () => {
    hideLoadingScreen();
});

// ========================================
// INITIALIZATION SEQUENCE
// ========================================
console.log('🚀 Minimal Reveal Widget starting...');

// Start both initialization processes in parallel
waitForReveal();
initializeGristAPI();

console.log('📝 Widget initialized - See REVEAL_WIDGET_GUIDE.md for details');
