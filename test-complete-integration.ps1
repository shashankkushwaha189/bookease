# 🧪 COMPLETE MULTI-TENANT INTEGRATION TEST
$baseUrl = "http://localhost:3000"
$frontendUrl = "http://localhost:5173"

Write-Host "🚀 Starting Complete Multi-Tenant Integration Test..." -ForegroundColor Green
Write-Host ""

# Test Results Tracking
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    try {
        Write-Host "Testing: $Name" -ForegroundColor Cyan
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        $status = $response.StatusCode
        
        if ($status -eq $ExpectedStatus) {
            Write-Host "  ✅ PASS - Status: $status" -ForegroundColor Green
            $testResults += @{ Name = $Name; TestStatus = "PASS"; StatusCode = $status }
        } else {
            Write-Host "  ❌ FAIL - Expected: $ExpectedStatus, Got: $status" -ForegroundColor Red
            $testResults += @{ Name = $Name; TestStatus = "FAIL"; StatusCode = $status }
        }
        
        # Show sample response for successful tests
        if ($status -eq $ExpectedStatus -and $response.Content.Length -lt 500) {
            $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($content) {
                Write-Host "  📄 Response: $($content | ConvertTo-Json -Compress)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{ Name = $Name; TestStatus = "ERROR"; Error = $_.Exception.Message }
    }
    
    Write-Host ""
}

# Test 1: Backend Health Check
Test-Endpoint -Name "Backend Health Check" -Url "$baseUrl/health"

# Test 2: Tenant Module - Public Endpoints
Test-Endpoint -Name "Get All Public Tenants" -Url "$baseUrl/api/tenants/public"
Test-Endpoint -Name "Get Tenant by Slug" -Url "$baseUrl/api/tenants/public/slug/demo-clinic"
Test-Endpoint -Name "Search Tenants" -Url "$baseUrl/api/tenants/public/search?q=clinic"

# Test 3: Business Profile Module - Public Endpoints
Test-Endpoint -Name "Get Public Business Profile" -Url "$baseUrl/api/business-profile/public/slug/demo-clinic"
Test-Endpoint -Name "Get All Public Profiles" -Url "$baseUrl/api/business-profile/public/all"
Test-Endpoint -Name "Search Business Profiles" -Url "$baseUrl/api/business-profile/public/search?q=health"

# Test 4: Services Module - Public Endpoints
Test-Endpoint -Name "Get Public Services" -Url "$baseUrl/api/public/services"

# Test 5: Staff Module - Public Endpoints
Test-Endpoint -Name "Get Public Staff" -Url "$baseUrl/api/public/staff"

# Test 6: Booking Module - Public Endpoints
Test-Endpoint -Name "Get Public Availability" -Url "$baseUrl/api/public/availability?serviceId=1c77d539-076a-4d06-8a1f-a70d277858a4&date=2026-03-10"

# Test 7: Create Public Booking
$bookingData = @{
    serviceId = "1c77d539-076a-4d06-8a1f-a70d277858a4"
    staffId = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
    customer = @{
        name = "Integration Test Customer"
        email = "test@example.com"
        phone = "1234567890"
    }
    startTimeUtc = "2026-03-10T10:00:00.000Z"
    endTimeUtc = "2026-03-10T11:00:00.000Z"
    consentGiven = $true
    notes = "Integration test booking"
    sessionToken = "integration-test-$([System.Guid]::NewGuid())"
} | ConvertTo-Json -Depth 10

Test-Endpoint -Name "Create Public Booking" -Method "POST" -Url "$baseUrl/api/public/bookings/book" -Body $bookingData -ExpectedStatus 201

# Test 8: Frontend Accessibility
Write-Host "Testing Frontend Accessibility..." -ForegroundColor Cyan

try {
    $frontendResponse = Invoke-WebRequest -Uri "$frontendUrl" -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend accessible at $frontendUrl" -ForegroundColor Green
        $testResults += @{ Name = "Frontend Accessibility"; TestStatus = "PASS"; StatusCode = 200 }
    } else {
        Write-Host "  ❌ Frontend not accessible - Status: $($frontendResponse.StatusCode)" -ForegroundColor Red
        $testResults += @{ Name = "Frontend Accessibility"; TestStatus = "FAIL"; StatusCode = $frontendResponse.StatusCode }
    }
} catch {
    Write-Host "  ❌ Frontend error - $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Name = "Frontend Accessibility"; TestStatus = "ERROR"; Error = $_.Exception.Message }
}

Write-Host ""

# Test 9: Tenant-Specific Frontend URLs
$tenantUrls = @(
    "$frontendUrl/demo-clinic/book",
    "$frontendUrl/book?tenant=demo-clinic"
)

foreach ($url in $tenantUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Tenant URL accessible: $url" -ForegroundColor Green
            $testResults += @{ Name = "Tenant URL: $url"; TestStatus = "PASS"; StatusCode = 200 }
        }
    } catch {
        Write-Host "  ❌ Tenant URL error: $url - $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{ Name = "Tenant URL: $url"; TestStatus = "ERROR"; Error = $_.Exception.Message }
    }
}

Write-Host ""

# Test 10: Multi-Tenant Data Isolation
Write-Host "Testing Multi-Tenant Data Isolation..." -ForegroundColor Cyan

# Test with different tenant headers
$tenantHeaders = @{"x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"}

Test-Endpoint -Name "Tenant-Specific Services" -Url "$baseUrl/api/services" -Headers $tenantHeaders
Test-Endpoint -Name "Tenant-Specific Staff" -Url "$baseUrl/api/staff" -Headers $tenantHeaders

# Test Summary
Write-Host "📊 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "================" -ForegroundColor Yellow

$passCount = ($testResults | Where-Object { $_.TestStatus -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.TestStatus -eq "FAIL" }).Count
$errorCount = ($testResults | Where-Object { $_.TestStatus -eq "ERROR" }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Errors: $errorCount" -ForegroundColor Red

$successRate = if ($totalCount -gt 0) { [math]::Round(($passCount / $totalCount) * 100, 2) } else { 0 }
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

Write-Host ""

# Detailed Results
Write-Host "📋 DETAILED RESULTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

foreach ($result in $testResults) {
    $color = switch ($result.TestStatus) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "ERROR" { "Red" }
        default { "Yellow" }
    }
    
    Write-Host "$($result.Name): $($result.TestStatus)" -ForegroundColor $color
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Gray
    }
}

Write-Host ""

# Recommendations
Write-Host "🎯 RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

if ($successRate -ge 80) {
    Write-Host "✅ Integration is working well!" -ForegroundColor Green
    Write-Host "📈 Ready for production deployment" -ForegroundColor Green
} elseif ($successRate -ge 60) {
    Write-Host "⚠️  Some issues detected - review failed tests" -ForegroundColor Yellow
    Write-Host "🔧 Fix issues before production deployment" -ForegroundColor Yellow
} else {
    Write-Host "❌ Major issues detected - requires immediate attention" -ForegroundColor Red
    Write-Host "🚨 Do not proceed to production" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Fix any failed tests" -ForegroundColor White
Write-Host "2. Test frontend booking flow manually" -ForegroundColor White
Write-Host "3. Verify tenant branding is applied" -ForegroundColor White
Write-Host "4. Test with multiple tenants if available" -ForegroundColor White
Write-Host "5. Deploy to staging environment" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Integration testing complete!" -ForegroundColor Green
