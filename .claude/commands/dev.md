---
description: Restart the Next.js development server
---

# Restart Dev Server

Restart the Next.js development server. Follow these steps:

1. Find and kill any existing Next.js dev server processes running on port 3000
2. Clear the Next.js build cache by deleting the `.next` folder
3. Start the dev server with `npm run dev`
4. Wait for the server to be ready and confirm it's running

Use these commands:
- Kill process on port 3000: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
- Clear cache: `rmdir /s /q .next`
- Start server: `npm run dev` (run in background)

Report the server URL when ready (usually http://localhost:3000).
