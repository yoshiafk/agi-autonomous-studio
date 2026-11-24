# Antigravity Autonomous Studio Rules

Whenever the user asks to launch, open, inspect, or view the Antigravity Autonomous Studio (or mentions "studio visualizer", "virtual office", "agent office", or invokes `/studio`):

1. **Verify Server Health**: Check if the studio is already active by testing the loopback endpoint:
   - Command: `curl -s http://127.0.0.1:7777/health`
2. **Start if Inactive**: If the endpoint does not return HTTP 200, start the server in the background:
   - On Linux / macOS / WSL: run `python3 server.py --daemon`
   - On Windows native: run `python server.py --daemon` or `start.bat`
   - If the user explicitly asks for Docker: run `docker compose up -d`
3. **Provide Direct Visualizer Link**: Always provide the user with the direct auto-follow link:
   - [Antigravity Studio Visualizer](http://localhost:7777/?auto=true)
4. **Active Sessions**: To inspect detected sessions and active conversations, query `http://127.0.0.1:7777/api/sessions/active`.
