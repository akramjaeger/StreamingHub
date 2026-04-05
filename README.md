# StreamingHub

StreamingHub is a full-stack streaming discovery platform with a Node/Express backend and a Next.js frontend.

## Features

- Browse movies and shows by categories
- Rich title detail popups with:
  - Poster
  - Description
  - Tags
  - Runtime/details
  - Cast
  - Where to watch
  - Trailer link
- Consistent details popup behavior across Home, Categories, and Search
- Per-user watchlist support
- Admin management page with protected admin account behavior
- Seeded default users for easier local testing

## Project Structure

- `backend/` - Express API, auth, admin user management, MongoDB integration
- `frontend/` - Next.js app (apps/v4) and UI workspace

## Local Development

### Prerequisites

- Node.js 18+
- npm/pnpm
- MongoDB

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000` by default.

### 2) Frontend

```bash
cd frontend
corepack pnpm install
corepack pnpm --filter v4 dev
```

Frontend runs on `http://localhost:4000`.

## Environment

Create environment files as needed for backend and frontend.

For the frontend app (`frontend/apps/v4/.env.local`), commonly used keys include:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `OMDB_API_KEY`
- `TMDB_API_KEY`

## Notes

- `.env` and `.env.*` files are gitignored to avoid committing secrets.
- Watchlist is currently client-side (localStorage), scoped by signed-in user email.
