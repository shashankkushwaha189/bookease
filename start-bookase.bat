@echo off
echo 🚀 Starting BookEase System...
echo ============================

echo.
echo 📦 Starting API Server...
cd /d "%~dp0apps\api"
start "BookEase API" cmd /k "npm run dev"

echo.
echo 🌐 Starting Web Server...
cd /d "%~dp0apps\web"
start "BookEase Web" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting...
echo 📊 API Server: http://localhost:3000
echo 🎨 Web Server: http://localhost:5175
echo 👤 Admin Login: admin@demo.com / demo123456
echo.
echo 🎉 BookEase is starting up...
echo 📱 Please wait a few seconds for servers to fully start.
pause
