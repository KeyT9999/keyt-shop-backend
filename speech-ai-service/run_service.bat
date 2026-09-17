@echo off
title KeyT Japanese Speech AI Service
echo Starting KeyT Japanese Speech AI Microservice on http://127.0.0.1:8001 ...
cd /d %~dp0
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
