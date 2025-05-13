@echo off
set /p answer=Chcesz wejsc na strone internetowa? (T/N): 
if /i "%answer%"=="T" cd backend && start chrome.exe http://localhost:3000 && node server.js
if /i "%answer%"=="N" cd backend && node server.js
pause