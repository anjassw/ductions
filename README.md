# Ductions

**Lightweight Work Management System for Freelancers & Agencies**

A lightweight work management application featuring **Gantt timelines**, to-do lists, **timesheets**, and a **client progress-sharing portal**—all accessible via a single link.

Built with **Express + SQLite**—no database server, no build steps, and no frontend frameworks. Just Node.js.

## Why Ductions?

- **Lightweight** — runs as a single Node process with one `.db` file. Works on a 512 MB VPS.
- **No build steps** — uses standard HTML/CSS/JS. Edit a file, refresh, and you're done.
- **Client portal** — share a single URL; clients can view progress without needing an account.
- **Built-in timesheets** — track hours per task, automatically compiled into reports.
- **Dark mode** — light/dark themes, saved per device.

## Features

| Feature | Description |
| --- | --- |
| Timeline | Gantt view + list; adjust task dates directly from the calendar |
| To-Do | Task boards organized by status, including sub-tasks (checklists) |
| Timesheets | Start/stop timer in the header, accessible from any page |
| Projects | Manage clients, colors, date ranges, and progress tracking modes (by task count or hours) |
| Users | Admin & Worker roles, hourly rates, and password resets |
| Share Links | Public project portals with options to display hours, team members, or notes |
| Activity Log | Audit trail for data changes |

## Getting Started

Requires **Node.js 20+**.

```bash
git clone <repository-url>
cd ductions
npm install
npm start
```

Open <http://localhost:3000/login.php>

When the database is empty, an initial account is created automatically:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Worker | `worker@example.com` | `worker123` |

> **Change your password after your first login.**

Want some sample data (3 projects, 5 tasks, 1 share link)?

```bash
npm run seed:demo
```

## Configuration

Everything is optional — default values ​​are provided.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Interface binding |
| `DB_PATH` | `./data/ductions.db` | SQLite file location |

Copy `.env.example` to `.env`, or set the variables directly in your environment.

## Project Structure

```
server.js              Backend: DB schema, API, and static server
scripts/seed-demo.js   Sample data seeder
data/                  SQLite file (auto-generated, excluded from Git)
public/
login.php            Login page
app/                 Application pages (dashboard, timeline, to-do, timesheet, projects, users)
share/index.php      Public portal for clients
assets/
api.js             API client layer
app.js             UI logic
core.js            Shared utilities
tema.js            Dark mode switcher
boot.js            Initialization
app.css            Styles (compiled Tailwind + components)
```

## How it works (briefly)

- **Authentication** — logging in returns a session token (valid for 8 hours), which is sent via the `X-Ductions-Token` header.
- **Password Hashing** — SHA-256 of `"password::salt"`, with a unique, random salt for each user.
- **Project Progress** — calculated based on completed tasks, or from logged hours if `progress_mode = hours`. - **Share link** — a 32-character random token, with an optional PIN and an optional expiration date.

## Security

This repository includes a `.gitignore` file that excludes `data/`, `.env`, and backup files. **Never commit databases or credentials.**

For production:

1. Change the default account password.
2. Run behind a reverse proxy (Nginx/Apache) with HTTPS.
3. Restrict external access to the application port.
4. Back up `data/ductions.db` regularly (SQLite files are safe to copy while WAL mode is enabled; use `.backup` to ensure consistency).

## License

[MIT](LICENSE) — free to use, modify, and sell. Attribution is appreciated but not required.

## Credits

Created by **[Anjas S](https://github.com/anjassw)**.

If you find this project useful, please leave a star on the repository — it helps!
