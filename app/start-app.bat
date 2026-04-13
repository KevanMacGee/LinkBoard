@echo off
start "LinkBoard Server" cmd /k python -m http.server 3000
timeout /t 2 /nobreak >nul
start "" http://localhost:3000