# SentinelGuard AI

SentinelGuard AI is a modern phishing detection platform that helps users inspect suspicious emails and URLs with AI-assisted analysis, a live dashboard, and role-based access for users and admins.

## Highlights

- Email and URL phishing analysis
- JWT-based authentication with user and admin flows
- Personal dashboard with scan history and live stats
- Admin dashboard for reviewing users and detections
- MongoDB-backed persistence
- Next.js frontend with a Flask backend
- Shared brand logo and app icon throughout the experience

## Preview

- Landing page with a branded hero section, feature blocks, and team section
- Login and signup pages with shared branding
- Dashboard and admin views with scan history and role-aware controls

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Flask, Python, JWT, bcrypt |
| Machine Learning | scikit-learn, TF-IDF, Logistic Regression |
| Database | MongoDB |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB Atlas or a local MongoDB instance

### Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Backend

```bash
pip install -r requirements.txt
python -m backend.app
```

The backend runs on `http://localhost:5000` by default.

### Optional: Train the Model

```bash
python -m backend.ml.train_model
```

## Core Flows

### Authentication

- Sign up for a new account
- Log in with JWT session support
- Role-aware access for admin users

### Detection

- Submit email content and/or a URL
- Receive a phishing verdict with confidence details
- Save results to scan history when authenticated

### Dashboard

- View recent scans and threat summaries
- Filter results in the admin view
- Re-run scans and keep the history current

## Project Design

<img width="416" height="1600" alt="WhatsApp Image 2026-04-18 at 7 26 48 AM" src="https://github.com/user-attachments/assets/b5c0fabd-5bb0-47ed-a563-5b7bd6728770" />


## Project Structure

- `app/` - Next.js routes, pages, and layout
- `components/` - Shared UI components
- `backend/` - Flask API, ML utilities, and persistence helpers
- `public/` - Static assets, including the project icon

For more detail, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## API Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | No | Create a new user |
| POST | `/auth/login` | No | Issue a JWT token |
| POST | `/analyze` | Yes | Analyze email and URL input |
| GET | `/scan-results/history` | Yes | Fetch scan history |
| GET | `/users` | Yes | Fetch users for admin management |
| GET | `/health` | No | Health check |

## Environment Variables

Create `backend/.env` with values like:

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
MONGO_DB_NAME=sentinelguard_ai
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

## Development

### Run Frontend Only

```bash
npm run dev
```

### Run Backend Only

```bash
pip install -r requirements.txt
python -m backend.app
```

### Build for Production

```bash
npm run build
npm start
```

## Deployment Notes

- Frontend deployment is configured for Vercel via `vercel.json`
- Backend deployment is configured for Render via `render.yaml`
- Use `backend/gunicorn_config.py` with `backend.wsgi:app` for production

## Contributors

- [ni2-vsv11](https://github.com/ni2-vsv11)
- [ByteWhizShravani](https://github.com/ByteWhizShravani)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Open a pull request

## License

MIT

## Support

Open an issue in the repository if you run into problems or have a question.
