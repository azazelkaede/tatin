# Enrollment System

React and Vite frontend for the enrollment demo. The PHP and MySQL API lives in `backend/` and is currently intended for a local XAMPP setup.

## Run locally

```sh
npm install
npm run dev
```

To use login, registration, enrollment submission, and profile photos locally, start Apache and MySQL, import `backend/database.sql`, and follow `backend/README.md` to install the PHP API in XAMPP. The Vite development server proxies `/api` requests to that local API.

## Deploy the frontend to Render

The repository includes `render.yaml` for a free Render static site. In the Render Dashboard, create a Blueprint from this repository and deploy the `tatin-enrollment` static site. It builds with `npm ci && npm run build` and publishes `dist`. Render can redeploy the site after pushes to `main`.

This deploys only the frontend: Render publishes `dist`, not the `backend/` PHP files. Login, registration, enrollment submissions, and photo storage still need a separately hosted PHP API. Do not enter real student information into the preview.

For the PHP API and MySQL setup, see [backend/README.md](backend/README.md).

## Deploy the frontend to Vercel

Import this repository in Vercel and set the project root to `enrollment-system` if the repository contains this folder as a subdirectory. Vercel detects Vite automatically; the build command is `npm run build` and the output directory is `dist`.

This deploys only the frontend. Vercel does not execute the PHP files in `backend/`; sign-in, registration, enrollment submissions, and photo storage will fail until the API is hosted on a PHP-capable service and the frontend is configured to use it. The current Vite proxy only works on a local machine. Do not enter real student information into the Vercel preview.

## Security status

The API uses prepared SQL statements, password hashing, server-side session authentication, an HTTP-only session cookie, and server-side checks for enrollment subjects and unit limits. The frontend no longer persists profile details or photos in `localStorage` and clears copies saved by earlier versions.

This is not ready for production student records. Before using real data, host the API over HTTPS, configure a least-privilege database account and non-default secrets, add request rate limits and abuse protections, restrict registration to verified students, and configure same-origin or explicitly protected cross-origin API access. The sample XAMPP defaults in `backend/README.md` are for local development only.
