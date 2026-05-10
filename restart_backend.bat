@echo off
cd /d c:\Users\crist\Desktop\waveanalytics\backend
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak 2>nul
npm run dev
