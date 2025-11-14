const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_HTML = path.join(ROOT_DIR, 'index.html');
const SRC_CSS = path.join(ROOT_DIR, 'styles.css');
const SRC_JS = path.join(ROOT_DIR, 'app.js');

const FALLBACK_APP_DIR = path.join(ROOT_DIR, 'app');
const FALLBACK_HTML = path.join(FALLBACK_APP_DIR, 'index.html');
const FALLBACK_CSS = path.join(FALLBACK_APP_DIR, 'styles.css');
const FALLBACK_JS = path.join(FALLBACK_APP_DIR, 'app.js');

// NEW: storage module paths
const SRC_STORAGE = path.join(ROOT_DIR, 'storage.local.js');
const FALLBACK_STORAGE = path.join(FALLBACK_APP_DIR, 'storage.local.js');

const OUT_DIR = path.join(ROOT_DIR, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'linkboard-inline.html');

const STYLE_TAG_REGEX = /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*(?:\/>|>)/i;
const SCRIPT_TAG_REGEX = /<script\s+src=["']app\.js["']\s*>\s*<\/script>/i;
const STORAGE_SCRIPT_TAG_REGEX = /<script\s+src=["']storage\.local\.js["']\s*>\s*<\/script>/i;

function resolveSource(primaryPath, fallbackPath) {
  const primaryExists = fs.existsSync(primaryPath);
  const fallbackExists = fs.existsSync(fallbackPath);

  if (primaryExists && fallbackExists) {
    try {
      const primaryStat = fs.statSync(primaryPath);
      const fallbackStat = fs.statSync(fallbackPath);
      return primaryStat.mtimeMs >= fallbackStat.mtimeMs ? primaryPath : fallbackPath;
    } catch (err) {
      console.error('Failed to stat source files:', err);
      return primaryPath;
    }
  }

  if (primaryExists) {
    return primaryPath;
  }

  if (fallbackExists) {
    return fallbackPath;
  }

  return primaryPath;
}

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

function buildOnce() {
  process.exitCode = 0;
  const htmlPath = resolveSource(SRC_HTML, FALLBACK_HTML);
  if (!fs.existsSync(htmlPath)) {
    console.error(`Source HTML not found at ${htmlPath}`);
    process.exitCode = 1;
    return;
  }

  const cssPath = resolveSource(SRC_CSS, FALLBACK_CSS);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = readFileIfExists(cssPath);
  
  // 1) resolve and read storage.local.js
  const storagePath = resolveSource(SRC_STORAGE, FALLBACK_STORAGE);
  const storageJs = readFileIfExists(storagePath);
  
  // 2) resolve and read app.js
  const jsPath = resolveSource(SRC_JS, FALLBACK_JS);
  const appJs = readFileIfExists(jsPath);
  
  // 3) combine in correct order: storage first, then app
  const combinedJs = [storageJs, appJs].filter(Boolean).join('\n\n');
  
  // 4) inline tags
  const inlineStyleTag = `<style>\n${css}\n</style>`;
  const inlineScriptTag = `<script>\n${combinedJs}\n</script>`;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let transformed = html;

  const hasStyleLink = STYLE_TAG_REGEX.test(html);
  if (!hasStyleLink) {
    console.warn('Stylesheet link tag not found in HTML.');
  }
  transformed = transformed.replace(STYLE_TAG_REGEX, inlineStyleTag);

  // Remove storage.local.js script tag first
  const hasStorageScriptTag = STORAGE_SCRIPT_TAG_REGEX.test(html);
  if (!hasStorageScriptTag) {
    console.warn('storage.local.js script tag not found in HTML.');
  }
  transformed = transformed.replace(STORAGE_SCRIPT_TAG_REGEX, '');
  
  // Replace app.js script tag with combined inline script
  const hasScriptTag = SCRIPT_TAG_REGEX.test(html);
  if (!hasScriptTag) {
    console.warn('Script tag not found in HTML.');
  }
  transformed = transformed.replace(SCRIPT_TAG_REGEX, inlineScriptTag);

  fs.writeFileSync(OUT_FILE, transformed, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

let watchTimer = null;

function watch() {
  console.log('Watching for changes... (Ctrl+C to stop)');
  try {
    buildOnce();
  } catch (err) {
    console.error(err);
  }

  const targetNames = new Set(['index.html', 'styles.css', 'app.js', 'storage.local.js']);
  const directoriesToWatch = new Set([ROOT_DIR]);
  if (fs.existsSync(FALLBACK_APP_DIR)) {
    directoriesToWatch.add(FALLBACK_APP_DIR);
  }

  directoriesToWatch.forEach((dirPath) => {
    fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
      if (!filename) {
        return;
      }

      if (!targetNames.has(filename.toString())) {
        return;
      }

      clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        try {
          buildOnce();
        } catch (err) {
          console.error(err);
        }
      }, 100);
    });
  });
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  buildOnce();
}
