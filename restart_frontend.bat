@echo off
cd /d c:\Users\crist\Desktop\waveanalytics\frontend
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak 2>nul
npm run dev
