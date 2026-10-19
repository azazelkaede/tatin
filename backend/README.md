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
