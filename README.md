# DeskPA

A personal assistant for English and romanized Telugu. In Auto, enter a task and include its web address for website work. A plain URL or a simple open-link instruction opens a tab immediately. Ask AI and Browser task provide explicit overrides.

## Run from a checkout

Use Node 22+ and Python 3. Set DESKPA_PUBLIC_ORIGIN to the external origin before building and starting. For a local terminal on macOS or Linux:

    export DESKPA_PUBLIC_ORIGIN=http://localhost:5173
    npm run build
    npm test
    npm start

In Windows PowerShell use `$env:DESKPA_PUBLIC_ORIGIN="http://localhost:5173"` and, if python3 is unavailable, run `py -3 build.py` for the build. Visit the configured address. There are no npm dependencies.

## Deploy

Use a Node web service with HTTPS, build command `npm run build` and start command `npm start`. The server reads PORT. On Render, the build automatically uses `RENDER_EXTERNAL_URL` to create a companion ZIP for the service's `onrender.com` hostname. If you use a custom domain, set `DESKPA_PUBLIC_ORIGIN` to that HTTPS origin in the Render service environment and redeploy. Provide an owner-only access gate when deploying a private workspace. GitHub Pages alone cannot run the provider API proxy. A Worker ES module is also generated at `dist/server/index.js`.

## Set up and test

Open Settings, enter a fresh key and select Test key. Keys stay in tab memory until refresh. Add a second provider for fallback. Local history is stored per browser origin. Avoid credentials in instructions. Each configured provider can receive the prompt and visible task-page text.

For browser actions, install the companion ZIP from Settings in Chrome or Edge. The ZIP is generated for the configured deployment origin. After a hostname change, download and install the new companion. Reload DeskPA after installation, then enter the key. Enter login credentials directly on the destination website.

Smoke tests: open a URL with no key; ask an AI question with a tested key; ask DeskPA to summarize a public page with the companion connected; inspect the activity log and page evidence. Automated provider tests simulate upstream responses.
