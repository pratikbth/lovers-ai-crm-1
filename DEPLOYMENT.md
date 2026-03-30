# Lovers AI CRM - Deployment Guide

This guide covers deploying the full-stack application to production with Vercel (frontend) and Railway (backend).

## Architecture Overview

- **Frontend**: React app deployed on Vercel (`frontend/` directory)
- **Backend**: FastAPI server deployed on Railway (`backend/` directory)
- **Database**: MongoDB (managed service)

---

## Part 1: Backend Deployment (Railway)

### Prerequisites

- Railway account ([railway.app](https://railway.app))
- MongoDB cluster (Atlas or other provider)

### Step 1: Set up MongoDB

1. Create a MongoDB cluster (e.g., via MongoDB Atlas)
2. Create a database user with a strong password
3. Copy the connection string: `mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority`

### Step 2: Deploy to Railway

1. **Connect Repository**
   - Go to Railway dashboard → New Project
   - Select "Deploy from GitHub repo"
   - Connect your `lovers-ai-crm-1` repository

2. **Configure Environment Variables**
   
   In Railway, set these variables:
   
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=wedus_crm
   JWT_SECRET=<generate-a-strong-random-string>
   FRONTEND_URL=<your-vercel-frontend-url>
   ```

3. **Railway will automatically:**
   - Detect Python project
   - Read `backend/railway.json` for build/deploy config
   - Install dependencies from `backend/requirements.txt`
   - Start the server with: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Get your Backend URL**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - API docs at: `https://your-app.up.railway.app/docs`

---

## Part 2: Frontend Deployment (Vercel)

### Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- Backend URL from Railway (from Part 1)

### Step 1: Deploy to Vercel

1. **Connect Repository**
   - Go to Vercel dashboard → New Project
   - Import your `lovers-ai-crm-1` repository

2. **Configure Build Settings**
   
   ```
   Project Root: frontend
   Build Command: yarn build
   Output Directory: build
   Environment: Node.js
   ```

3. **Set Environment Variables** (if needed by frontend)
   
   If your React app uses environment variables for the API:
   ```
   REACT_APP_API_URL=<your-backend-url>
   ```

4. **Deploy**
   - Vercel will automatically build and deploy
   - Your frontend URL: `https://your-app.vercel.app`

---

## Configuration Checklist

### Backend (Railway)

- [ ] MongoDB URI configured
- [ ] JWT_SECRET set to a strong random value
- [ ] FRONTEND_URL set to Vercel URL
- [ ] railway.json in `backend/` with NIXPACKS builder
- [ ] requirements.txt has all dependencies
- [ ] Server starts successfully (check Railway logs)

### Frontend (Vercel)

- [ ] vercel.json in `frontend/` with build config
- [ ] Build command: `yarn build`
- [ ] Output directory: `build`
- [ ] CORS matches backend FRONTEND_URL
- [ ] API calls point to Railway backend URL

---

## Testing

### 1. Test Backend Locally

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MongoDB URI
uvicorn main:app --reload
# Visit http://localhost:8000/docs
```

### 2. Test Frontend Locally

```bash
cd frontend
yarn install
yarn start
# Visit http://localhost:3000
```

### 3. Production Testing

1. Visit your Vercel frontend URL
2. Check browser console for any API errors
3. Verify API calls succeed with Railway backend
4. Check Railway logs for any server errors

---

## Troubleshooting

### Frontend Issues

- **CORS errors**: Verify `FRONTEND_URL` in Railway backend
- **API 404 errors**: Check that API endpoint exists on backend
- **Build failures**: Check CloudFlare Vercel logs for details

### Backend Issues

- **Start command fails**: Check Requirements.txt for missing dependencies
- **MongoDB connection error**: Verify MONGODB_URI is correct
- **JWT errors**: Ensure JWT_SECRET is set in environment

---

## Environment Variables Summary

### Backend (`backend/` on Railway)

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB connection | `mongodb+srv://...` |
| `DB_NAME` | Database name | `wedus_crm` |
| `JWT_SECRET` | JWT token signing key | `your-secret-key` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://app.vercel.app` |

### Frontend (`frontend/` on Vercel)

| Variable | Purpose | Example |
|----------|---------|---------|
| `REACT_APP_API_URL` | Backend API URL (if used) | `https://app.up.railway.app` |

---

## Continuous Deployment

Both Vercel and Railway support automatic deployments:

- **Vercel**: Auto-deploys on push to `main` branch
- **Railway**: Auto-deploys on push to connected branch

To update production:
```bash
git add .
git commit -m "your message"
git push origin main
```

---

## Monitoring & Logs

### Railway Backend Logs

- Dashboard → Go to your project → Logs tab
- Check for errors, startup issues, or runtime problems

### Vercel Frontend Logs

- Dashboard → Your project → Deployments tab
- Click a deployment to see build logs

---

## Support & Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
