# Guide: Creating Grist Widgets with Reveal.js

This guide provides comprehensive instructions for LLM coding agents and developers to create Grist custom widgets that use Reveal.js for presentation-style interfaces.

## Table of Contents
1. [Overview](#overview)
2. [Critical Requirements](#critical-requirements)
3. [Minimal Working Structure](#minimal-working-structure)
4. [Reveal.js Configuration](#revealjs-configuration)
5. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
6. [Grist Integration Patterns](#grist-integration-patterns)
7. [Testing & Deployment](#testing--deployment)

---

## Overview

**What is this for?**
- Creating interactive presentation-style widgets within Grist documents
- Leveraging Reveal.js for slide-based UIs inside Grist iframes
- Combining Grist data API with rich visual presentations

**Key Challenge:**
Reveal.js was not designed to run inside complex iframe environments like Grist widgets. This guide addresses all technical challenges discovered through production debugging.

---

## Critical Requirements

### ⚠️ MUST-FOLLOW Rules

These rules are **non-negotiable** and based on real bugs encountered:

1. **NEVER use percentage values for Reveal.js width/height**
   ```javascript
   // ❌ WRONG - Causes infinite recursion
   Reveal.initialize({
     width: '100%',
     height: '100%'
   });

   // ✅ CORRECT - Use defaults or pixel values
   Reveal.initialize({
     // Omit width/height, let Reveal.js use defaults (960x700)
     // It will auto-scale to fit the container
   });
   ```
   **Reason:** Percentage values trigger an infinite loop: `layout()` → `resize event` → `onWindowResize()` → `layout()` → ∞
   **Reference:** [hakimel/reveal.js#2514](https://github.com/hakimel/reveal.js/issues/2514)

2. **ALWAYS set `hash: false` in iframe contexts**
   ```javascript
   Reveal.initialize({
     hash: false,  // CRITICAL for Grist iframes
   });
   ```
   **Reason:** Grist iframe URLs are extremely complex with query parameters. Setting `hash: true` causes Reveal.js to parse these URLs recursively, leading to stack overflow.

3. **ALWAYS use polling to wait for Reveal.js CDN load**
   ```javascript
   function waitForReveal() {
     if (typeof Reveal !== 'undefined') {
       console.log('✅ Reveal.js loaded, initializing...');
       initializeRevealJS();
     } else {
       console.log('⏳ Waiting for Reveal.js...');
       setTimeout(waitForReveal, 100);
     }
   }
   waitForReveal();
   ```
   **Reason:** CDN scripts load asynchronously. Your app.js may execute before Reveal.js is available.

4. **ALWAYS call `Reveal.layout()` after DOM changes**
   ```javascript
   // After hiding modal, showing content, etc.
   requestAnimationFrame(() => {
     if (typeof Reveal !== 'undefined') {
       Reveal.layout();
     }
   });
   ```
   **Reason:** Reveal.js won't auto-update when container visibility changes. Use `requestAnimationFrame` to avoid triggering the layout during event handling (which can cause recursion).

5. **NEVER call `Reveal.sync()` in iframe contexts**
   ```javascript
   // ❌ WRONG - Causes infinite loop with complex iframe URLs
   Reveal.sync();

   // ✅ CORRECT - Use Reveal.layout() instead
   requestAnimationFrame(() => Reveal.layout());
   ```

---

## Minimal Working Structure

### File Structure
```
my-reveal-widget/
├── public/
│   ├── index.html    # Main HTML with Reveal.js structure
│   ├── app.js        # Widget logic with Grist API
│   └── styles.css    # Custom styles
└── README.md
```

### 1. index.html (Minimal Template)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Reveal Widget</title>

    <!-- REQUIRED: Grist Plugin API -->
    <script src="https://docs.getgrist.com/grist-plugin-api.js"></script>

    <!-- REQUIRED: Reveal.js CDN (use specific version) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/black.css">

    <link rel="stylesheet" href="./styles.css">
</head>
<body>
    <!-- Optional: Initial modal/loading screen -->
    <div id="loading-screen" style="display: flex; position: fixed; inset: 0;
                                     background: rgba(0,0,0,0.95); z-index: 2000;
                                     justify-content: center; align-items: center;">
        <div>
            <h2>Loading...</h2>
            <button id="start-btn">Start Presentation</button>
        </div>
    </div>

    <!-- REQUIRED: Reveal.js container structure -->
    <div class="reveal">
        <div class="slides">
            <!-- Your slides here -->
            <section>
                <h1>Welcome</h1>
                <p>First slide</p>
            </section>

            <section>
                <h2>Second Slide</h2>
                <p>Content here</p>
            </section>

            <!-- Add more sections as needed -->
        </div>
    </div>

    <!-- CRITICAL: Load Reveal.js BEFORE your app.js -->
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
    <script src="./app.js"></script>
</body>
</html>
```

**HTML Structure Rules:**
- ✅ `<div class="reveal">` is the main container
- ✅ `<div class="slides">` wraps all slide content
- ✅ Each `<section>` is a slide
- ✅ Nested `<section>` elements create vertical slides
- ✅ Load `reveal.js` **before** your `app.js`
- ✅ Close with `</body></html>` (NOT `</head></html>`)

### 2. styles.css (Required CSS)

```css
/* REQUIRED: Ensure body takes full space without scroll */
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
}

/* REQUIRED: Set explicit dimensions for .reveal */
.reveal {
    width: 100%;
    height: 100vh;
    position: relative;
    z-index: 1;
}

/* Optional: Custom styling */
.reveal h1, .reveal h2, .reveal h3 {
    text-transform: none;  /* Override Reveal.js defaults */
}

/* Optional: Loading screen styles */
#loading-screen {
    /* Your modal styles */
}
```

**CSS Rules:**
- ✅ Set `overflow: hidden` on `body`
- ✅ Set explicit `width: 100%` and `height: 100vh` on `.reveal`
- ✅ Use `position: relative` for proper stacking
- ✅ Add `z-index: 1` to ensure visibility

### 3. app.js (Initialization Pattern)

```javascript
// ========================================
// GLOBAL STATE
// ========================================
let gristApi;
let docApi;
let appState = {
    ready: false,
    // Your app state here
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

            // CRITICAL: DO NOT set width/height with percentage values
            // width: 960,     // Optional: use pixel values or omit
            // height: 700,    // Optional: use pixel values or omit

            // Recommended: iframe-friendly settings
            embedded: true,      // Run in embedded mode
            slideNumber: 'c/t',  // Show slide numbers
            transition: 'slide', // Transition effect
            keyboard: true,      // Enable keyboard navigation
            overview: true,      // Enable overview mode (ESC key)
            center: true,        // Center slides vertically
            touch: true,         // Enable touch navigation

            // Scaling options (works better than percentage width/height)
            margin: 0.04,
            minScale: 0.2,
            maxScale: 2.0
        });

        // Event listeners
        Reveal.on('slidechanged', (event) => {
            console.log('Slide changed:', event.indexh, event.indexv);
            // Handle slide changes here
        });

        console.log('🎬 Reveal.js initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Reveal.js:', error);
        return false;
    }
}

// CRITICAL: Polling mechanism to wait for Reveal.js
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

        // Get document API
        docApi = gristApi.docApi;

        // Configure widget (tell Grist what columns we need)
        await gristApi.ready({
            requiredAccess: 'full',
            columns: [
                // Define required columns here
                // { name: 'myColumn', optional: false }
            ]
        });

        // Listen for data updates
        gristApi.onRecords((records) => {
            console.log('Received records:', records.length);
            // Handle Grist data here
        });

        appState.ready = true;
    } catch (error) {
        console.error('❌ Error initializing Grist API:', error);
    }
}

// ========================================
// MODAL/LOADING SCREEN HANDLERS
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

// Example: Start button handler
document.getElementById('start-btn')?.addEventListener('click', () => {
    hideLoadingScreen();
});

// ========================================
// INITIALIZATION SEQUENCE
// ========================================
// Start both initialization processes in parallel
waitForReveal();
initializeGristAPI();

console.log('🎮 Widget initialized');
```

---

## Reveal.js Configuration

### Safe Configuration Template

```javascript
Reveal.initialize({
    // ==========================================
    // CRITICAL SETTINGS (DO NOT CHANGE)
    // ==========================================
    hash: false,          // MUST be false in iframe contexts
    embedded: true,       // MUST be true for iframe mode

    // DO NOT SET: width, height with percentage values
    // BAD:  width: '100%', height: '100%'
    // GOOD: width: 960, height: 700  (or omit entirely)

    // ==========================================
    // RECOMMENDED SETTINGS
    // ==========================================
    slideNumber: 'c/t',   // Show "current/total" slide numbers
    transition: 'slide',  // 'none', 'fade', 'slide', 'convex', 'concave', 'zoom'
    transitionSpeed: 'default', // 'default', 'fast', 'slow'

    // Navigation
    controls: true,       // Show navigation arrows
    progress: true,       // Show progress bar
    keyboard: true,       // Enable keyboard shortcuts
    overview: true,       // Enable overview mode (ESC)
    center: true,         // Vertically center slides
    touch: true,          // Enable touch navigation
    loop: false,          // Don't loop slides
    rtl: false,          // Right-to-left text direction

    // Fragments (step-by-step reveals)
    fragments: true,
    fragmentInURL: false, // Don't add fragment state to URL (keep false)

    // Scaling (works with default width/height)
    margin: 0.04,         // Fraction of screen to leave empty
    minScale: 0.2,        // Minimum scale
    maxScale: 2.0,        // Maximum scale

    // ==========================================
    // OPTIONAL FEATURES
    // ==========================================
    // history: false,    // Push slide changes to browser history (keep false)
    // mouseWheel: false, // Navigate with mouse wheel
    // hideAddressBar: true, // Hide address bar on mobile
    // previewLinks: false, // Open links in iframe preview
    // autoSlide: 0,      // Auto-advance slides (0 = disabled)
    // autoSlideStoppable: true,
});
```

### Event Handlers

```javascript
// Slide changed
Reveal.on('slidechanged', (event) => {
    console.log('Current slide:', event.indexh, event.indexv);
    const slideElement = event.currentSlide;
    // Access data attributes: slideElement.dataset.chapter
});

// Ready event
Reveal.on('ready', (event) => {
    console.log('Reveal.js is ready');
});

// Fragment shown/hidden
Reveal.on('fragmentshown', (event) => {
    console.log('Fragment shown:', event.fragment);
});

Reveal.on('fragmenthidden', (event) => {
    console.log('Fragment hidden:', event.fragment);
});
```

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Stack Overflow Error
**Symptom:** `Uncaught RangeError: Maximum call stack size exceeded` at reveal.js:669

**Causes:**
1. Using `width: '100%'` or `height: '100%'`
2. Calling `Reveal.sync()` in iframe context
3. Setting `hash: true`

**Solutions:**
```javascript
// ✅ Remove percentage dimensions
Reveal.initialize({
    // width: '100%',  // DELETE THIS
    // height: '100%', // DELETE THIS
});

// ✅ Use Reveal.layout() with requestAnimationFrame
requestAnimationFrame(() => Reveal.layout());

// ✅ Set hash to false
Reveal.initialize({ hash: false });
```

### ❌ Pitfall 2: Blank Screen (Slides Don't Appear)
**Symptom:** Reveal.js initializes but slides are invisible

**Causes:**
1. Modal/overlay not hidden
2. `.reveal` container has no dimensions
3. `Reveal.layout()` never called after modal close

**Solutions:**
```css
/* ✅ Ensure .reveal has explicit dimensions */
.reveal {
    width: 100%;
    height: 100vh;
    position: relative;
    z-index: 1;
}
```

```javascript
// ✅ Call layout after hiding modal
function hideModal() {
    document.getElementById('modal').style.display = 'none';

    requestAnimationFrame(() => {
        if (typeof Reveal !== 'undefined') {
            Reveal.layout();
        }
    });
}
```

### ❌ Pitfall 3: Reveal is Undefined
**Symptom:** `Reveal is not defined` or `TypeError: Cannot read property 'initialize' of undefined`

**Cause:** Your app.js executes before reveal.js CDN loads

**Solution:**
```javascript
// ✅ Use polling mechanism
function waitForReveal() {
    if (typeof Reveal !== 'undefined') {
        initializeRevealJS();
    } else {
        setTimeout(waitForReveal, 100);
    }
}
waitForReveal();
```

### ❌ Pitfall 4: HTML Structure Errors
**Symptom:** Slides don't render, or layout is broken

**Common Mistakes:**
```html
<!-- ❌ WRONG: Missing .slides wrapper -->
<div class="reveal">
    <section>Content</section>
</div>

<!-- ❌ WRONG: Closing head instead of body -->
</head>
</html>

<!-- ✅ CORRECT: Proper structure -->
<div class="reveal">
    <div class="slides">
        <section>Content</section>
    </div>
</div>
</body>
</html>
```

### ❌ Pitfall 5: Z-index Issues
**Symptom:** Slides are behind other elements

**Solution:**
```css
/* ✅ Set proper z-index layers */
.reveal {
    z-index: 1;
}

#modal-overlay {
    z-index: 2000;  /* Above slides */
}

#fixed-header {
    z-index: 1000;  /* Above slides but below modal */
}
```

---

## Grist Integration Patterns

### Pattern 1: Display Grist Data in Slides

```javascript
// Fetch data from Grist table
async function loadDataIntoSlides() {
    try {
        const tableData = await docApi.fetchTable('MyTable');

        // Find or create slide for data
        const dataSlide = document.querySelector('[data-slide="data-display"]');
        if (dataSlide) {
            let html = '<h2>Data from Grist</h2><ul>';

            tableData.id.forEach((id, index) => {
                const name = tableData.name[index];
                const value = tableData.value[index];
                html += `<li><strong>${name}:</strong> ${value}</li>`;
            });

            html += '</ul>';
            dataSlide.innerHTML = html;

            // Force Reveal.js to update
            requestAnimationFrame(() => Reveal.layout());
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Listen for data changes
gristApi.onRecords((records) => {
    loadDataIntoSlides();
});
```

### Pattern 2: Track Slide Progress in Grist

```javascript
// Save current slide position to Grist
Reveal.on('slidechanged', async (event) => {
    const slideIndex = event.indexh;
    const verticalIndex = event.indexv;

    try {
        await docApi.applyUserActions([
            ['UpdateRecord', 'Progress', appState.progressRecordId, {
                current_slide: slideIndex,
                current_vertical: verticalIndex,
                last_updated: new Date().toISOString()
            }]
        ]);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
});
```

### Pattern 3: Interactive Exercises with Grist Storage

```javascript
// Example: Quiz answer submission
async function submitAnswer(questionId, answer) {
    try {
        const result = await docApi.applyUserActions([
            ['AddRecord', 'Answers', null, {
                question_id: questionId,
                user_answer: answer,
                timestamp: new Date().toISOString(),
                session_id: appState.sessionId
            }]
        ]);

        const answerId = result.retValues ? result.retValues[0] : result[0];
        console.log('Answer saved:', answerId);

        // Show feedback on slide
        showFeedback('Answer submitted!');

    } catch (error) {
        console.error('Error submitting answer:', error);
        showFeedback('Error: ' + error.message, 'error');
    }
}

// Add to slide
document.querySelector('#submit-btn').addEventListener('click', () => {
    const answer = document.querySelector('#answer-input').value;
    submitAnswer(1, answer);
});
```

### Pattern 4: User Authentication

```javascript
async function identifyUser() {
    try {
        // Get access token (contains user info)
        const access = await gristApi.docApi.getAccessToken();
        console.log('✅ Access token obtained');

        // Generate unique user ID from token
        const tokenHash = btoa(access.token).substring(0, 16);
        const userId = 'grist_' + tokenHash;

        // Check if user exists in Grist
        const usersTable = await docApi.fetchTable('Users');
        let userRecordId = null;

        usersTable.grist_id?.forEach((id, index) => {
            if (id === userId) {
                userRecordId = usersTable.id[index];
            }
        });

        // Create user if doesn't exist
        if (!userRecordId) {
            const result = await docApi.applyUserActions([
                ['AddRecord', 'Users', null, {
                    grist_id: userId,
                    created_at: new Date().toISOString()
                }]
            ]);
            userRecordId = result.retValues ? result.retValues[0] : result[0];
        }

        appState.userId = userId;
        appState.userRecordId = userRecordId;

        return { userId, userRecordId };
    } catch (error) {
        console.error('Error identifying user:', error);
        return null;
    }
}
```

---

## Testing & Deployment

### Local Testing

1. **Use a local server** (required for module loading):
```bash
# Python 3
python -m http.server 8000

# Node.js (if http-server installed)
npx http-server -p 8000
```

2. **Open in browser:**
```
http://localhost:8000/packages/my-reveal-widget/public/index.html
```

3. **Test in Grist:**
   - Open Grist document
   - Add Custom Widget
   - Set URL to: `http://localhost:8000/packages/my-reveal-widget/public/`
   - Configure required columns

### Deployment Checklist

- [ ] Remove all `console.log` debug statements (or keep only essential ones)
- [ ] Test in multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Verify all Grist API calls work
- [ ] Check browser console for errors
- [ ] Test with empty Grist tables (edge case)
- [ ] Test with large datasets (performance)
- [ ] Verify `hash: false` is set
- [ ] Verify no percentage width/height values
- [ ] Verify `Reveal.layout()` is called after DOM changes
- [ ] Test cache clearing (Ctrl+F5) after deployment

### GitHub Pages Deployment

If using GitHub Pages (like this repository):

1. **Ensure widget is in dist/ folder:**
   - Built widgets: Compiled from `src/` to `build/`, then copied to `dist/`
   - Static widgets: Copied from `public/` to `dist/`

2. **Check workflow deploys correctly:**
   - See `.github/workflows/deploy.yml`
   - Verify `prepare-dist` script runs
   - Check deployment logs

3. **Access widget:**
```
https://username.github.io/repository-name/widget-name/
```

### Common Deployment Issues

**Issue:** Widget shows old version after deployment
**Solution:** Clear browser cache (Ctrl+Shift+R) or use incognito mode

**Issue:** 404 on GitHub Pages
**Solution:** Verify `dist/` folder is deployed, check GitHub Pages settings

**Issue:** Widget works locally but not on GitHub Pages
**Solution:** Check for hardcoded `localhost` URLs, ensure all paths are relative

---

## Advanced Patterns

### Dynamic Slide Generation

```javascript
async function generateSlidesFromGrist() {
    const chapters = await docApi.fetchTable('Chapters');
    const slidesContainer = document.querySelector('.reveal .slides');

    chapters.id.forEach((id, index) => {
        const title = chapters.title[index];
        const content = chapters.content[index];

        const section = document.createElement('section');
        section.dataset.chapter = id;
        section.innerHTML = `
            <h2>${title}</h2>
            <div>${content}</div>
        `;

        slidesContainer.appendChild(section);
    });

    // CRITICAL: Re-initialize Reveal.js after adding slides
    if (typeof Reveal !== 'undefined' && Reveal.isReady()) {
        Reveal.sync(); // Safe here because we're not in an event handler
    }
}
```

### Custom Slide Backgrounds

```html
<!-- Image background -->
<section data-background-image="https://example.com/image.jpg">
    <h2>Slide with Background</h2>
</section>

<!-- Color background -->
<section data-background-color="#ff0000">
    <h2>Red Background</h2>
</section>

<!-- Video background -->
<section data-background-video="https://example.com/video.mp4">
    <h2>Video Background</h2>
</section>
```

### Fragments (Step-by-Step Reveals)

```html
<section>
    <h2>Reveal Step by Step</h2>
    <p class="fragment">First item</p>
    <p class="fragment">Second item</p>
    <p class="fragment fade-in-then-out">Third item (fades in then out)</p>
    <p class="fragment highlight-red">Fourth item (highlights red)</p>
</section>
```

---

## Reference: Reveal.js API

### Navigation
```javascript
Reveal.next();              // Go to next slide
Reveal.prev();              // Go to previous slide
Reveal.slide(h, v);         // Go to specific slide (h=horizontal, v=vertical)
Reveal.left();              // Go left
Reveal.right();             // Go right
Reveal.up();                // Go up (vertical)
Reveal.down();              // Go down (vertical)
```

### State
```javascript
Reveal.isReady();           // Returns true if initialized
Reveal.getIndices();        // Returns {h: 0, v: 0, f: 0}
Reveal.getCurrentSlide();   // Returns current slide element
Reveal.getTotalSlides();    // Returns total number of slides
```

### Layout
```javascript
Reveal.layout();            // Recalculate layout (SAFE to call)
// Reveal.sync();           // ⚠️ AVOID in iframe contexts
```

### Configuration
```javascript
Reveal.configure({          // Update configuration
    transition: 'fade'
});
```

---

## Quick Reference: Do's and Don'ts

### ✅ DO
- Use `hash: false` in `Reveal.initialize()`
- Use `embedded: true` for iframe mode
- Use polling (`waitForReveal()`) to check for Reveal.js availability
- Call `Reveal.layout()` after DOM visibility changes
- Wrap `Reveal.layout()` in `requestAnimationFrame()`
- Set explicit dimensions on `.reveal` in CSS
- Use pixel values or omit `width`/`height` entirely
- Test with browser cache disabled

### ❌ DON'T
- Don't use `width: '100%'` or `height: '100%'`
- Don't use `hash: true`
- Don't call `Reveal.sync()` in iframes
- Don't assume Reveal.js is loaded synchronously
- Don't forget to close with `</body></html>` (not `</head>`)
- Don't forget `<div class="slides">` wrapper
- Don't test with cached versions after deployment

---

## Troubleshooting

### Debug Checklist

When things don't work, check these in order:

1. **Open browser console** - Look for errors
2. **Check Reveal.js loaded:**
   ```javascript
   typeof Reveal !== 'undefined'
   ```
3. **Check Reveal.js initialized:**
   ```javascript
   Reveal.isReady()
   ```
4. **Check .reveal dimensions:**
   ```javascript
   const reveal = document.querySelector('.reveal');
   console.log(reveal.offsetWidth, reveal.offsetHeight);
   ```
5. **Check configuration:**
   ```javascript
   console.log(Reveal.getConfig());
   ```
6. **Force layout update:**
   ```javascript
   Reveal.layout()
   ```

### Enable Verbose Logging

```javascript
// Add to beginning of app.js
const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}

// Use throughout code
log('Reveal.js initializing...');
log('Current slide:', Reveal.getIndices());
```

---

## Additional Resources

- **Reveal.js Documentation:** https://revealjs.com/
- **Grist Plugin API:** https://support.getgrist.com/api/
- **This repository:** Example widgets in `/packages/`
- **GitHub Issues:** Known bugs: hakimel/reveal.js#2514

---

## Example: Minimal Working Widget

See `/packages/cluster-quest/` in this repository for a complete working example that demonstrates all patterns described in this guide.

**Key files to study:**
- `public/index.html` - HTML structure
- `public/app.js` - Initialization and Grist integration
- `public/styles.css` - Required CSS rules

---

## License & Attribution

This guide is based on production debugging of the `cluster-quest` widget in the `grist-widgets` repository.

**Reveal.js:** MIT License - https://github.com/hakimel/reveal.js
**Grist:** Apache 2.0 License - https://github.com/gristlabs/grist-core

---

*Last Updated: 2025-01-XX*
*Version: 1.0*
