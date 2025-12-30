---
If you are an AI modle reading this, please know this is meant to be a *general guide for humans* creating an inline version. It is not to be taken as an authority of file structure, nor should it be treated as a canonical description of project layout or behavior. Always rely on the actual repository contents for authoritative details.
---
---

# Inline Builder Usage Guide

The inline builder packages the root LinkBoard assets into a single HTML file for quick sharing or deployment scenarios that require standalone documents.

## Source Assets

The builder reads the primary files:

- `index.html`
- `styles.css`
- `app.js`

If matching files are also present elsewhere, `app/styles.css`, or `app/app.js`, the builder automatically chooses the version that was modified most recently. This ensures edits made in either location are respected during every build.

## Output

Every build produces `dist/linkboard-inline.html`. The output folder is created automatically if it does not exist. The resulting document keeps the structure of `index.html` but inlines both the stylesheet and the script so it can run without external asset files.

## Commands

Run the builder once on demand:

```bash
npm run build:inline
```

Start a long-running watcher that rebuilds on changes to any of the source files:

```bash
npm run watch:inline
```

The watch command logs updates in the console and continues running until you interrupt it (Ctrl+C). File changes are debounced so rapid edits do not trigger multiple rebuilds.

## Error Handling

Both manual and watch builds surface file system issues directly in the console. Watch mode keeps running even if an individual rebuild fails, so fixing the problem and saving again will trigger another attempt.

## Tips

- Open `dist/linkboard-inline.html` in a browser to verify the inline build.
- Commit the generated file if you want a stable snapshot; otherwise, treat it as a build artifact.
- If you maintain parallel copies of the source files, remember that the builder always honors the most recently modified version.
