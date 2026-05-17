# TODO - CORS / API localhost fix (Workflow360)

## Step 1
- Update Vite + frontend env strategy so production calls `/api` (no `localhost:5000`).

## Step 2
- Edit `frontend/vite.config.js` proxy to point to `VITE_BACKEND_URL` and ensure it works with Render.

## Step 3
- Update `frontend/.env` to default to `VITE_API_BASE_URL=/api` and `VITE_BACKEND_URL=https://workflow360-xarv.onrender.com`.

## Step 4
- Update Vercel Environment Variables:
  - `VITE_BACKEND_URL=https://workflow360-xarv.onrender.com`
  - `VITE_API_BASE_URL=/api`
- Redeploy.

## Step 5
- Test login from deployed frontend.

