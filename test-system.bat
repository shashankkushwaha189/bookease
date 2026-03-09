@echo off
echo 🚀 Testing BookEase System...
echo.

echo 📋 Testing Backend Health...
curl -s http://localhost:3000/health
echo.

echo 📋 Testing Frontend Access...
curl -s http://localhost:5175
echo.

echo 📋 Testing API Endpoints...
curl -s -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"TestPassword123!\",\"tenantSlug\":\"healthfirst\"}"
echo.

echo 📋 Testing MFA Setup...
curl -s -X POST http://localhost:3000/api/mfa/setup -H "Content-Type: application/json" -d "{\"userId\":\"test-user-id\"}"
echo.

echo 📋 Testing Session Management...
curl -s -X GET http://localhost:3000/api/sessions/user -H "Authorization: Bearer test-token"
echo.

echo.
echo ✅ System testing complete!
echo.
echo 🌐 Open your browser to test:
echo    Backend: http://localhost:3000
echo    Frontend: http://localhost:5175
echo.
pause
