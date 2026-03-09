# 🧪 BACKEND API TEST ONLY
$baseUrl = "http://localhost:3000"

Write-Host "🚀 Testing Backend API Only..." -ForegroundColor Green
Write-Host ""

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
        } else {
            Write-Host "  ❌ FAIL - Expected: $ExpectedStatus, Got: $status" -ForegroundColor Red
        }
        
        # Show sample response
        if ($response.Content.Length -lt 500) {
            $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($content) {
                Write-Host "  📄 Response: $($content | ConvertTo-Json -Compress)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "  ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Test 1: Health Check
Test-Endpoint -Name "Backend Health Check" -Url "$baseUrl/health"

# Test 2: Tenant Endpoints
Test-Endpoint -Name "Get All Public Tenants" -Url "$baseUrl/api/tenants/public"
Test-Endpoint -Name "Get Tenant by Slug" -Url "$baseUrl/api/tenants/public/slug/demo-clinic"

# Test 3: Business Profile Endpoints
Test-Endpoint -Name "Get Public Business Profile" -Url "$baseUrl/api/business-profile/public/slug/demo-clinic"

# Test 4: Services
Test-Endpoint -Name "Get Public Services" -Url "$baseUrl/api/public/services"

# Test 5: Staff
Test-Endpoint -Name "Get Public Staff" -Url "$baseUrl/api/public/staff"

Write-Host "🎉 Backend API testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If tests passed, your backend multi-tenant API is working correctly!" -ForegroundColor Cyan
Write-Host "Next step: Start the frontend and test the complete integration." -ForegroundColor Cyan
