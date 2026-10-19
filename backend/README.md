# PHP API and database setup

The API supports MySQL for local XAMPP development and PostgreSQL for the free Neon deployment. Set `DATABASE_URL` on Render to use Neon; otherwise the API uses the `STARK_DB_*` MySQL settings.

## Local XAMPP (MySQL)

1. Start Apache and MySQL in the XAMPP Control Panel.
2. In phpMyAdmin, import `backend/database.sql`.
3. Copy `backend/stark-api` into `C:\xampp\htdocs\stark-api`.
4. The default local MySQL connection is `127.0.0.1:3306`, database `enrollment_system`, user `root`, and a blank password. Configure `STARK_DB_HOST`, `STARK_DB_PORT`, `STARK_DB_NAME`, `STARK_DB_USER`, and `STARK_DB_PASSWORD` if yours differs.

## Free demo deployment (Render + Neon)

The frontend stays on the Render Static Site. Deploy the PHP API as a Render Web Service, and use Neon Free for PostgreSQL. Free services can sleep or have usage limits, so use this for a demo and test records only.

### 1. Create the database tables in Neon

1. In Neon, select the project and `production` branch you created.
2. Open **SQL Editor** from the left menu.
3. Open `backend/database.postgres.sql` in your project, copy all of it, paste it into the SQL Editor, and click **Run**.
4. Confirm the `users`, `subjects`, `enrollments`, `enrollment_subjects`, and `student_photos` tables appear in the database.

This PostgreSQL schema is separate from `database.sql`, which is still for local MySQL/XAMPP. Do not import the MySQL file into Neon.

### 2. Deploy the PHP API to Render

1. In Render, choose **New > Web Service**, connect this GitHub repository, and select the `main` branch.
2. Select **Docker**. Set the Dockerfile path to `backend/Dockerfile` and Docker context to `backend`.
3. Choose the **Free** service plan for a demo. Free services spin down when idle and can take about a minute to wake up.
4. After creation, open the API service's **Environment** page and add:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string (keep secret) |
   | `STARK_ALLOWED_ORIGIN` | `https://tatin-enrollment.onrender.com` |
   | `STARK_COOKIE_SECURE` | `true` |
   | `STARK_COOKIE_SAMESITE` | `None` |

   In Neon’s **Connect** dialog, keep **Connection pooling** enabled and copy the connection string into Render's secret value field. Do not put it in frontend settings, GitHub, or chat. Save and deploy.

### 3. Connect the frontend

1. Open the existing Render Static Site and go to **Environment**.
2. Add `VITE_API_BASE_URL` with the API service's public origin, such as `https://tatin-api.onrender.com` (no path suffix or trailing slash).
3. Save and redeploy the Static Site so Vite rebuilds with the API URL.

Test registration, login, enrollment, and profile photo upload with a throwaway account. Check the API service logs if a request fails. Keep database credentials private and do not use a free demo deployment for real student records without checking your institution's privacy requirements, backups, and recovery plan.
