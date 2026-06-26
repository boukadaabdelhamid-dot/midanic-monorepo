---
name: Expo web as a Replit sub-path preview (static export)
description: How to serve an Expo Router web app at a Replit artifact sub-path preview (e.g. /mobile) and why `expo start` dev cannot do it
---

# Expo web under a Replit artifact sub-path preview

## The base-path / dev-mode trap (the real blocker)
- expo-router's `stripBaseUrl()` strips the configured base path **only in production**: its source is literally `if (process.env.NODE_ENV !== 'development') { strip }`. Under `expo start` (dev), the base is NEVER stripped, so a base-pathed URL like `/mobile` always renders **"Unmatched Route"**. This is NOT a trailing-slash or `--host` bug — do not chase those.
- **Therefore:** to serve an Expo web app at a Replit sub-path preview, do a PRODUCTION web export and serve the static output, not `expo start`:
  - `NODE_ENV=production pnpm --filter <pkg> exec expo export -p web` → emits `dist/` with assets prefixed by the configured base.
  - `app.json`: `experiments.baseUrl="/<base>"` (asset + router base) and `web.output="single"` (SPA → needs index.html fallback).
  - Serve `dist/` mounted under `/<base>/` with SPA fallback (extensionless → index.html, missing file-with-extension → 404), binding `0.0.0.0:PORT`. A tiny zero-dep Node static server works (e.g. `.replit-artifact/serve.mjs`); `expo serve dist` is NOT suitable — it serves at root only while the HTML references `/<base>/...`.

**Why:** `expo start` dev can never strip the base, so a Metro/HMR dev preview at a sub-path is impossible. Trade-off of the export approach: no Metro HMR, and a full re-export runs on every workflow restart (~tens of seconds before the port binds).

## Replit artifact-managed web workflows
- A web artifact's `.replit-artifact/artifact.toml` drives everything: `previewPath` + `title` define the **named** preview (e.g. "Midanic Mobile"); `[[services]].localPort` + `[services.env] PORT` bind it; `[services.development].run` is the command.
- The generated workflow "artifacts/<x>: web" is **artifact-managed**: `configureWorkflow` on it fails with `PROHIBITED_ACTION "managed by an artifact"`. Direct `.replit` edits are also blocked. Change the run command by editing `artifact.toml` via `verifyAndReplaceArtifactToml` (write a sibling temp toml, then replace), then `restart_workflow`.
- **CWD of `[services.development].run` is the artifact dir** (not repo root) — reference scripts relative to it (`node .replit-artifact/serve.mjs`, not `node artifacts/<x>/.replit-artifact/serve.mjs`).
- `.replit [userenv.shared]` may set `NODE_ENV=development` globally — so the export command MUST set `NODE_ENV=production` explicitly or stripBaseUrl won't strip.

**How to apply:** New sub-path web preview → set artifact.toml (previewPath/title/localPort/PORT) + app.json baseUrl/output + a static export-then-serve run command; restart the workflow; verify `/<base>/` renders (screenshot) and other artifacts still run. Replit auto-maps the workflow's port into `.replit [[ports]]` once detected — never add ports by hand.
