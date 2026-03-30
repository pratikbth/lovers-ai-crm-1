# 🚀 Production Deployment Guide

Deploy your Lovers AI CRM to production with Railway (backend) and Vercel (frontend).

## Your Production Credentials

> ⚠️ Keep these secure. Never commit to GitHub.

```
MongoDB URI: mongodb+srv://tiwaripratik160_db_user:pratik123@%23@cluster0.sxqeqwi.mongodb.net/?appName=Cluster0
Database Name: loverAi database
JWT Secret: SgaTwB1AIxS098TyhYrd6AKenilqyFT24llcKhLF1gc
```

---

## Part 1: Deploy Backend to Railway ✅

### Step 1: Connect Repository to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `pratikbth/lovers-ai-crm-1` repository
4. Choose `backend` directory as the root

### Step 2: Configure Environment Variables in Railway

In your Railway project, go to **Variables** and add:

```
MONGODB_URI=mongodb+srv://tiwaripratik160_db_user:pratik123@%23@cluster0.sxqeqwi.mongodb.net/?appName=Cluster0
DB_NAME=loverAi database
JWT_SECRET=SgaTwB1AIxS098TyhYrd6AKenilqyFT24llcKhLF1gc
ENVIRONMENT=production
FRONTEND_URL=<YOUR-VERCEL-URL>  # Add after deploying frontend
```

> **⚠️ Note:** Replace special characters in password:
> - `@` becomes `%40`
> - `#` becomes `%23`
> - Already done above in URI

### Step 3: Railway Builds Automatically

Railway will:
- ✅ Detect Python project
- ✅ Read `backend/railway.json` for config
- ✅ Install `requirements.txt` dependencies
- ✅ Start server with: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 4: Get Your Backend URL

Once deployed, Railway provides:
- **Backend URL**: `https://your-project.up.railway.app`
- **API Docs**: `https://your-project.up.railway.app/docs`

**Example:** `https://lovers-crm.up.railway.app`

---

## Part 2: Deploy Frontend to Vercel ✅

### Step 1: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New...** → **Project**
3. Import `pratikbth/lovers-ai-crm-1` repository

### Step 2: Configure Vercel Build Settings

Set these in the Vercel dashboard:

```
Project Root: frontend
Build Command: yarn build
Output Directory: build
Environment: Node.js
```

### Step 3: Add Environment Variables (if needed)

If your React code needs the API URL, add:

```
REACT_APP_API_URL=https://your-backend.up.railway.app
```

### Step 4: Deploy

- Vercel automatically builds and deploys on every push
- Your frontend URL: `https://your-app.vercel.app`

---

## Part 3: Update MongoDB Collections (One-time)

Run these commands in MongoDB Atlas to create indexes:

```javascript
// Faster queries on leads
db.leads.createIndex({ email: 1 })
db.leads.createIndex({ assigned_to: 1 })
db.leads.createIndex({ status: 1 })
db.leads.createIndex({ created_at: -1 })

// Faster user lookups
db.users.createIndex({ email: 1 }, { unique: true })

// Call log indexing
db.call_logs.createIndex({ lead_id: 1 })
db.call_logs.createIndex({ created_by: 1 })
db.call_logs.createIndex({ created_at: -1 })
```

---

## Part 4: Testing & Verification

### Test Backend API

```bash
# Replace with your Railway URL
curl https://your-backend.up.railway.app/health
# Should return: {"status": "ok"}

# Test API docs
curl https://your-backend.up.railway.app/docs
```

### Test Frontend

1. Visit `https://your-app.vercel.app`
2. Login with your test credentials
3. Try creating a lead
4. Check the API response in Network tab

---

## Deployment Checklist

### Backend (Railway)
- [ ] Repository connected to Railway
- [ ] Environment variables set (MONGODB_URI, JWT_SECRET, DB_NAME)
- [ ] Build succeeded (check Railway logs)
- [ ] Backend URL working (`/health` endpoint)
- [ ] API docs accessible (`/docs`)
- [ ] CORS configured for your Vercel URL

### Frontend (Vercel)
- [ ] Repository connected to Vercel
- [ ] Build command configured (`yarn build`)
- [ ] Output directory set (`build`)
- [ ] Build succeeded (check Vercel logs)
- [ ] Frontend URL working
- [ ] API calls working (check Network tab in DevTools)

### Database (MongoDB)
- [ ] Indexes created for performance
- [ ] Network access from Railway allowed
- [ ] User password correct in connection string

---

## 🔗 After Deployment

Update these in Railway + Vercel:

1. **In Railway**, update FRONTEND_URL:
   ```
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   ```

2. **In Vercel**, update REACT_APP_API_URL (if used):
   ```
   REACT_APP_API_URL=https://your-railway-app.up.railway.app
   ```

---

## 🐛 Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify MongoDB URI is correct
- Ensure all required packages in `requirements.txt`

### Frontend can't reach API
- Check CORS settings in `server.py`
- Verify FRONTEND_URL in Railway matches your Vercel URL
- Check Network tab → API calls for response

### MongoDB connection fails
- Test connection string in MongoDB Atlas
- Verify IP whitelist includes Railway IP
- Check password special characters are URL-encoded

---

## 📝 Next Steps

1. **Complete Railway setup** ← You are here
2. **Complete Vercel setup**
3. **Create MongoDB indexes**
4. **Test API endpoints**
5. **Monitor logs** (Railway + Vercel dashboards)

Good luck! 🎉
