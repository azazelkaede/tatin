# PHP and MySQL setup

This project keeps its PHP API here and its schema in `database.sql`. The existing XAMPP setup uses the `enrollment_system` database and `Users` table. The SQL uses `CREATE ... IF NOT EXISTS` and `INSERT IGNORE`; it does not drop tables, overwrite subject rows, or erase student/enrollment records.

## XAMPP setup

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. In phpMyAdmin, import `backend/database.sql`. It adds the enrollment and subject tables to `enrollment_system`, and inserts only missing catalog rows.
3. Copy the `backend/stark-api` folder to `C:\xampp\htdocs\stark-api`. The resulting files should include `C:\xampp\htdocs\stark-api\login.php` and `register.php`.
4. If MySQL uses a non-default account/password, set `STARK_DB_HOST`, `STARK_DB_PORT`, `STARK_DB_NAME`, `STARK_DB_USER`, and `STARK_DB_PASSWORD` for Apache/PHP. Defaults are `127.0.0.1:3306`, database `enrollment_system`, user `root`, and a blank password, as in this XAMPP install.
5. Restart the Vite dev server after changing `vite.config.js`: stop it with Ctrl+C, then run `npm run dev` from `enrollment-system`.
6. Register a student, then sign in. Photos are saved per access ID in `student_photos`; enrollment submissions are saved in `enrollments` and `enrollment_subjects`.

For a non-default XAMPP installation folder, copy `backend/stark-api` into that installation's Apache `htdocs` directory. Do not put database passwords in the React code.

## Render deployment

The frontend and PHP API are separate Render services. The API Dockerfile is `backend/Dockerfile`; it serves the PHP endpoints from the root path (for example, `/login.php`). The frontend's `VITE_API_BASE_URL` must be the API service's public origin, with no path suffix, such as `https://tatin-api.onrender.com`.

### 1. Create a persistent MySQL service

Render's MySQL option is a private Docker service backed by a persistent disk. Follow [Render's MySQL deployment guide](https://render.com/docs/deploy-mysql), use MySQL 8, and keep the service private. Choose the same Render region for the API and database. Set `MYSQL_DATABASE` to `enrollment_system`, set a dedicated `MYSQL_USER` and a strong `MYSQL_PASSWORD`, and set a separate strong `MYSQL_ROOT_PASSWORD`. Attach a disk at `/var/lib/mysql`; check Render's current pricing before creating it.

Import `database.sql` into the new database once. Use a trusted SQL client or database admin tool that can reach the private MySQL service. Do not expose MySQL's port to the public internet. Keep the root password only for administration; the PHP API uses the dedicated account.

### 2. Deploy the PHP API

In Render, create a Web Service from this GitHub repository, choose Docker, and set the Dockerfile path to `backend/Dockerfile` with `backend` as the Docker context. Deploy it in the same region as MySQL. The Dockerfile listens on port `10000` and enables PDO MySQL.

In the API service's Environment settings, add:

| Key | Value |
| --- | --- |
| `STARK_DB_HOST` | MySQL's internal hostname, without `:3306` |
| `STARK_DB_PORT` | `3306` |
| `STARK_DB_NAME` | `enrollment_system` |
| `STARK_DB_USER` | The dedicated `MYSQL_USER` value |
| `STARK_DB_PASSWORD` | The dedicated `MYSQL_PASSWORD` value |
| `STARK_ALLOWED_ORIGIN` | The exact frontend origin, e.g. `https://tatin-enrollment.onrender.com` |
| `STARK_COOKIE_SECURE` | `true` |
| `STARK_COOKIE_SAMESITE` | `None` for separate Render `onrender.com` frontend/API domains |

Enter secret values in Render's dashboard only. The PHP API now answers CORS preflight requests for the configured frontend origin and rejects other browser origins. `SameSite=None` is paired with the secure HTTPS-only cookie setting above; keep the origin allowlist exact.

### 3. Connect the frontend

In the Render Static Site's Environment settings, add `VITE_API_BASE_URL` with the API service's public origin, e.g. `https://tatin-api.onrender.com`. Save and redeploy the static site so Vite includes the new URL in its build. The URL is public configuration, not a secret. Do not add database credentials to the static site.

Once both services are live, test with a throwaway student account. Confirm registration and login work, then confirm the row is present in `Users`. Render free web services can spin down while idle, and the MySQL disk/service may incur charges. Do not use free preview resources for real student records without verifying persistence, backups, and recovery.
