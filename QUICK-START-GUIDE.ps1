# 🚀 BOOK-EASE QUICK START GUIDE
# This script will help you verify your multi-tenant system step by step

Write-Host "🎯 BOOK-EASE MULTI-TENANT QUICK START GUIDE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if servers are running
Write-Host "📍 STEP 1: CHECKING SERVER STATUS" -ForegroundColor Yellow
Write-Host ""

# Check Backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend Server: RUNNING (http://localhost:3000)" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend Server: Not responding correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend Server: NOT RUNNING" -ForegroundColor Red
    Write-Host "   To start: cd apps/api && npm run dev" -ForegroundColor Gray
}

# Check Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend Server: RUNNING (http://localhost:5173)" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend Server: Not responding correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Frontend Server: NOT RUNNING" -ForegroundColor Red
    Write-Host "   To start: cd apps/web && npm run dev" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Test Backend API
Write-Host "📍 STEP 2: TESTING BACKEND API" -ForegroundColor Yellow
Write-Host ""

$apiTests = @(
    @{ Name = "Health Check"; Url = "http://localhost:3000/health" },
    @{ Name = "Public Tenants"; Url = "http://localhost:3000/api/tenants/public" },
    @{ Name = "Tenant by Slug"; Url = "http://localhost:3000/api/tenants/public/slug/demo-clinic" },
    @{ Name = "Business Profile"; Url = "http://localhost:3000/api/business-profile/public/slug/demo-clinic" },
    @{ Name = "Public Services"; Url = "http://localhost:3000/api/public/services" },
    @{ Name = "Public Staff"; Url = "http://localhost:3000/api/public/staff" }
)

foreach ($test in $apiTests) {
    try {
        $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($test.Name): Working" -ForegroundColor Green
        } else {
            Write-Host "❌ $($test.Name): Status $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $($test.Name): Failed" -ForegroundColor Red
    }
}

Write-Host ""

# Step 3: Test Frontend URLs
Write-Host "📍 STEP 3: TESTING FRONTEND URLS" -ForegroundColor Yellow
Write-Host ""

$frontendTests = @(
    @{ Name = "Main Page"; Url = "http://localhost:5173" },
    @{ Name = "Tenant URL (Slug)"; Url = "http://localhost:5173/demo-clinic/book" },
    @{ Name = "Tenant URL (Query)"; Url = "http://localhost:5173/book?tenant=demo-clinic" }
)

foreach ($test in $frontendTests) {
    try {
        $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($test.Name): Accessible" -ForegroundColor Green
        } else {
            Write-Host "❌ $($test.Name): Status $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $($test.Name): Not accessible" -ForegroundColor Red
    }
}

Write-Host ""

# Step 4: Provide instructions
Write-Host "📍 STEP 4: NEXT INSTRUCTIONS" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔧 IF SERVERS ARE NOT RUNNING:" -ForegroundColor Cyan
Write-Host "1. Open Terminal 1:" -ForegroundColor White
Write-Host "   cd apps/api" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open Terminal 2:" -ForegroundColor White
Write-Host "   cd apps/web" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 TO TEST THE SYSTEM:" -ForegroundColor Cyan
Write-Host "1. Open browser and go to: http://localhost:5173" -ForegroundColor White
Write-Host "2. Try multi-tenant URLs:" -ForegroundColor White
Write-Host "   - http://localhost:5173/demo-clinic/book" -ForegroundColor Gray
Write-Host "   - http://localhost:5173/book?tenant=demo-clinic" -ForegroundColor Gray
Write-Host ""

Write-Host "🧪 TO RUN COMPREHENSIVE TESTS:" -ForegroundColor Cyan
Write-Host "powershell -ExecutionPolicy Bypass -File 'test-backend-only.ps1'" -ForegroundColor White
Write-Host ""

Write-Host "📚 TO READ THE GUIDES:" -ForegroundColor Cyan
Write-Host "1. MULTI-TENANT-GUIDE.md - How to add tenants" -ForegroundColor White
Write-Host "2. FRONTEND-INTEGRATION-GUIDE.md - Frontend setup" -ForegroundColor White
Write-Host "3. TESTING-AND-DEPLOYMENT-GUIDE.md - Production deployment" -ForegroundColor White
Write-Host "4. PROJECT-COMPLETION-SUMMARY.md - Complete overview" -ForegroundColor White
Write-Host ""

Write-Host "🎯 WHAT TO VERIFY:" -ForegroundColor Cyan
Write-Host "✅ Backend API endpoints respond correctly" -ForegroundColor White
Write-Host "✅ Frontend loads with tenant detection" -ForegroundColor White
Write-Host "✅ Different URLs show tenant-specific content" -ForegroundColor White
Write-Host "✅ Booking flow works end-to-end" -ForegroundColor White
Write-Host "✅ Theme colors change per tenant" -ForegroundColor White
Write-Host ""

Write-Host "🎉 YOUR MULTI-TENANT SYSTEM IS READY!" -ForegroundColor Green
Write-Host "Follow the steps above to verify everything is working correctly." -ForegroundColor Green
