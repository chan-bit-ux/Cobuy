@echo off
echo ===================================================
echo Starting Rule Mining System: Frontend and Backend
echo ===================================================
echo.

echo [1/2] Starting backend on http://localhost:5000...
start "Rule Mining Backend" cmd /k "cd backend && .venv\Scripts\python.exe app.py"

echo [2/2] Starting frontend on http://localhost:5173...
start "Rule Mining Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate terminal windows!
echo Keep those windows open to use the application.
echo.
pause
