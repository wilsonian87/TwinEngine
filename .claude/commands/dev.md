# Start Development Server

When user asks to "run dev server", "start the server", "npm run dev", or similar, follow this checklist before attempting to start the server.

## Pre-Flight Checklist

### 1. Check PostgreSQL is Running
```bash
/opt/homebrew/opt/postgresql@16/bin/pg_isready -h localhost
```
If not running, start it:
```bash
brew services start postgresql@16
```
Wait 3 seconds and verify it's accepting connections.

### 2. Check .env File Exists
```bash
ls -la .env
```
If missing, copy from example:
```bash
cp .env.example .env
```

### 3. Verify DATABASE_URL is Set
The .env file must contain:
```
DATABASE_URL=postgresql://localhost/twinengine
```

### 4. Export Environment Variables
Environment variables must be exported before starting the server:
```bash
export $(cat .env | xargs)
```

### 5. Start the Dev Server
```bash
npm run dev
```

## Expected Output
When successful, you should see:
- `Database already has X HCPs` or seeding messages
- `[AgentRegistry] Registered agent: ...` messages
- `serving on port 3000`

## Tell the User
Once running, tell the user:
> **Server running at http://localhost:3000** - Open in your browser to test.

## Common Issues

### "DATABASE_URL must be set"
- Environment variables weren't exported
- Run: `export $(cat .env | xargs)` before `npm run dev`

### PostgreSQL not responding
- Service may have stopped
- Run: `brew services restart postgresql@16`

### Port already in use
- Another process is using port 3000
- Find and kill it: `lsof -ti:3000 | xargs kill -9`
