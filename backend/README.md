# Backend API - Lovers AI CRM

FastAPI backend for the Lovers AI CRM application with MongoDB integration.

## Requirements

- Python 3.8+
- MongoDB
- Environment variables (see below)

## Environment Variables

Configure these in Railway or your deployment environment:

- `MONGODB_URI` - MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`)
- `DB_NAME` - Database name (default: `wedus_crm`)
- `JWT_SECRET` - Secret key for JWT token signing
- `FRONTEND_URL` - Frontend URL for CORS configuration (e.g., `https://your-frontend.vercel.app`)

## Local Development

### Install dependencies

```bash
python -m pip install -r requirements.txt
```

### Create .env file

```bash
cat > .env << EOF
MONGODB_URI=your_mongodb_connection_string
DB_NAME=wedus_crm
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
EOF
```

### Run the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## Railway Deployment

### 1. Connect your GitHub repository

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Select "Deploy from GitHub repo"
4. Connect your repository

### 2. Configure environment variables in Railway

In the Railway dashboard, add these variables:

- `MONGODB_URI` - Your MongoDB connection string
- `DB_NAME` - `wedus_crm`
- `JWT_SECRET` - A strong random string
- `FRONTEND_URL` - Your Vercel frontend URL

### 3. Railway will automatically:

- Detect the Python project
- Install dependencies from `requirements.txt`
- Run the start command from `railway.json`: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 4. Access your API

Your backend will be available at the Railway-provided URL (e.g., `https://your-app.up.railway.app`)

## API Documentation

Once deployed, visit:
- Swagger UI: `https://your-app.up.railway.app/docs`
- ReDoc: `https://your-app.up.railway.app/redoc`

## Architecture

- **Framework**: FastAPI
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT tokens
- **CORS**: Configured for frontend access
