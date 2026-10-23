# OTA Ticketing Officer Portal

Vite + React portal for ticketing-officer workflows. Tailwind CSS is configured through `@tailwindcss/vite`.

## Run locally

```sh
npm run dev
```

Set `VITE_API_BASE_URL` in a local `.env` file to point at the FastAPI base URL; it defaults to `http://localhost:8000`.

## Source structure

```text
src/
  api/                 Shared HTTP client and backend API modules
  components/
    auth/              Role/session guards
    layout/            Portal shell, sidebar, top bar (add with the pages)
    ui/                Reusable controls (add as needed)
  context/             Authentication/session state
  hooks/               Reusable UI state hooks (add as needed)
  pages/
    auth/              Login and password flows (next implementation step)
    drivers/           Driver account management (next implementation step)
    vehicles/          Vehicle management (next implementation step)
    dispatch/          Assignment/open/close workflows (next implementation step)
  styles/              Tailwind entry point and global styles
```

API modules currently wrap available FastAPI endpoints. The backend does not yet expose dispatcher account list/create endpoints or dispatcher-assignment list/open endpoints, so those cannot be wired into the UI until backend contracts exist.
