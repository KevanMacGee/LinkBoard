const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_HTML = path.join(ROOT_DIR, 'index.html');
const SRC_CSS = path.join(ROOT_DIR, 'styles.css');
const SRC_JS = path.join(ROOT_DIR, 'app.js');

const FALLBACK_APP_DIR = path.join(ROOT_DIR, 'app');

const OUT_DIR = path.join(ROOT_DIR, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'linkboard-inline.html');

const STYLE_TAG_REGEX = /<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*(?:\/>|>)/i;
const SCRIPT_TAG_REGEX = /<script\s+src=["']app\.js["']\s*>\s*<\/script>/i;

function resolveSourcePath(primaryPath, fileName) {
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const fallbackPath = path.join(FALLBACK_APP_DIR, fileName);
  if (fs.existsSync(fallbackPath)) {
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
  const htmlPath = resolveSourcePath(SRC_HTML, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`Source HTML not found at ${htmlPath}`);
    process.exitCode = 1;
    return;
  }

  const cssPath = resolveSourcePath(SRC_CSS, 'styles.css');
  const jsPath = resolveSourcePath(SRC_JS, 'app.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = readFileIfExists(cssPath);
  const js = readFileIfExists(jsPath);

  const inlineStyleTag = `<style>\n${css}\n</style>`;
  const inlineScriptTag = `<script>\n${js}\n</script>`;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let transformed = html;

  const hasStyleLink = STYLE_TAG_REGEX.test(html);
  if (!hasStyleLink) {
    console.warn('Stylesheet link tag not found in HTML.');
  }
  transformed = transformed.replace(STYLE_TAG_REGEX, inlineStyleTag);

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
  buildOnce();

  const targets = new Set(['index.html', 'styles.css', 'app.js']);

  const directoriesToWatch = new Set([ROOT_DIR]);
  if (fs.existsSync(FALLBACK_APP_DIR)) {
    directoriesToWatch.add(FALLBACK_APP_DIR);
  }

  directoriesToWatch.forEach((dirPath) => {
    fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
      if (!filename) {
        return;
      }

      if (!targets.has(filename.toString())) {
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
