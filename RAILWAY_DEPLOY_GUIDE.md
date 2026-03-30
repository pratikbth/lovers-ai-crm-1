# Railway Deployment Checklist

## Before Deploying to Railway

✅ **Code Status:**
- [x] Python syntax: No errors
- [x] requirements.txt: Complete with all dependencies
- [x] railway.json: Configured correctly
- [x] Procfile: Set for FastAPI
- [x] Code pushed to GitHub

✅ **Environment Variables Ready:**
- `MONGODB_URI=mongodb+srv://tiwaripratik160_db_user:pratik123@%23@cluster0.sxqeqwi.mongodb.net/?appName=Cluster0`
- `DB_NAME=loverAi database`
- `JWT_SECRET=SgaTwB1AIxS098TyhYrd6AKenilqyFT24llcKhLF1gc`
- `ENVIRONMENT=production`
- `FRONTEND_URL=https://your-vercel-domain.vercel.app` (add after Vercel deployment)

---

## Step-by-Step Railway Deployment

### 1. Create New Project
- Go to [railway.app](https://railway.app)
- Click **New Project**
- Select **Deploy from GitHub repo**
- Choose **pratikbth/lovers-ai-crm-1**
- Authorize Railway to access your GitHub

### 2. Configure Project Root
- When prompted, select **backend** directory as root
- Or leave as `./backend` in project settings

### 3. Add Environment Variables
In Railway dashboard:
1. Go to **Variables** tab
2. Add each variable:
   ```
   MONGODB_URI=mongodb+srv://tiwaripratik160_db_user:pratik123@%23@cluster0.sxqeqwi.mongodb.net/?appApplication=Cluster0
   DB_NAME=loverAi database
   JWT_SECRET=SgaTwB1AIxS098TyhYrd6AKenilqyFT24llcKhLF1gc
   ENVIRONMENT=production
   FRONTEND_URL=<leave blank for now>
   ```

### 4. Start Deployment
- Click **Deploy** button or let auto-deploy trigger
- Check **Build Logs** in real-time
- Watch for:
  ```
  ✓ Build succeeded
  ✓ Server started on port PORT
  ✓ No ModuleNotFoundError
  ```

### 5. Get Your Backend URL
- Once deployment is green, go to **Settings**
- Copy the **Service URL** (e.g., `https://your-project.up.railway.app`)

---

## Common Build Issues & Fixes

### ❌ "ModuleNotFoundError: No module named 'fastapi'"
**Fix:** Double-check `requirements.txt` has `fastapi==0.110.1`

### ❌ "No such file or directory: 'main.py'"
**Fix:** Ensure you selected **backend** as project root

### ❌ "ImportError: cannot import name 'AsyncIOMotorClient'"
**Fix:** Verify `motor==3.3.1` in requirements.txt

### ❌ Connection timeout (MongoDB)
**Fix:** Whitelist Railway IP in MongoDB Atlas → Network Access

---

## Testing Your Backend

Once deployed, test:

```bash
# Health check
curl https://YOUR-RAILWAY-URL.up.railway.app/health
# Expected: {"status":"ok"}

# API docs
https://YOUR-RAILWAY-URL.up.railway.app/docs
# Should show Swagger UI with all endpoints

# Test login endpoint
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

---

## Next: Vercel Frontend

After Railway succeeds:
1. Copy your Railway URL
2. Go to Vercel deployment
3. Set `REACT_APP_API_URL=<your-railway-url>`
4. Update Railway `FRONTEND_URL=<your-vercel-url>` after Vercel deploys

---

## Support

If build fails, share the **Build Log** from Railway and I'll help fix it!
