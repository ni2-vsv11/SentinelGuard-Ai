# SentinelGuard AI - Phishing Detection System

A full-stack web application that detects phishing emails and malicious URLs using machine learning and AI-powered threat analysis.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account

### 1. Frontend Setup
```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs at http://localhost:5000
```

### 3. Train ML Model (Optional)
```bash
cd backend
python ml/train_model.py
```

## Features

✅ **User Authentication**
- Secure signup and login with JWT tokens
- Role-based access control (user/admin)

✅ **Phishing Detection**
- Analyze emails and URLs for phishing indicators
- Machine learning model (scikit-learn)
- Real-time confidence scoring

✅ **User Dashboard**
- View personal scan history
- Live statistics and metrics
- Auto-refresh after new scans

✅ **Admin Dashboard**
- View all users and scan results
- Filter by threat status
- System analytics

✅ **MongoDB Integration**
- Cloud database with Atlas
- User management
- Scan result history

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, Next.js, TypeScript, Tailwind CSS |
| **Backend** | Flask, Python, JWT, bcrypt |
| **ML Model** | scikit-learn (TF-IDF + Logistic Regression) |
| **Database** | MongoDB Atlas |

## Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed file organization and API documentation.

## Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Register new user |
| POST | `/auth/login` | No | Get JWT token |
| POST | `/analyze` | Yes | Run phishing detection |
| GET | `/scan-results/history` | Yes | Fetch user's scan history |
| GET | `/users` | Yes | List all users (admin) |
| GET | `/health` | No | Health check |

## Authentication Flow

```
User → Signup/Login → Password Hashing → JWT Token → Protected Routes
```

Token is stored in localStorage and sent with each protected API request.

## Database Schema

**users collection**
```
_id, email, password_hash, role, created_at, updated_at
```

**scan_results collection**
```
_id, email, url, result {status, confidence, message}, timestamp
```

## Development

### Run Frontend Only
```bash
npm run dev
```

### Run Backend Only
```bash
cd backend
python app.py
```

### Build for Production
```bash
npm run build
npm start
```

## Environment Configuration

Create `backend/.env`:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
MONGO_DB_NAME=sentinelguard_ai
JWT_SECRET_KEY=your-secret-key
```

## Testing

Test credentials (after signup):
- Email: any valid email
- Password: minimum 6 characters

Admin account:
- Email: admin@sentinelguard.ai
- Password: any 6+ character password

## Future Enhancements

- [ ] Refresh token rotation
- [ ] Email verification
- [ ] Password reset
- [ ] Enhanced ML model with more training data
- [ ] Real-time WebSocket notifications
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Production deployment (Vercel + AWS)

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Submit PR

## Contributors

- [@VARUN003733](https://github.com/VARUN003733)

## License

MIT

## Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ for phishing detection**
