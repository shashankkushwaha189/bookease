# Test API Integration Script
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Testing API Endpoints Integration..."
Write-Host ""

# Test 1: Authentication Endpoints
Write-Host "1️⃣ Testing Authentication Endpoints..."
try {
    # Login endpoint
    $loginData = @{
        email = "admin@demo.com"
        password = "demo123456"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData
    Write-Host "   ✅ Login: $($response.StatusCode) - $($response.Content.Substring(0, [math]::min(100, $response.Content.Length)))"
    
    if ($response.StatusCode -eq 200) {
        $token = ($response.Content | ConvertFrom-Json).data.token
        $authHeaders = $headers.Clone()
        $authHeaders["Authorization"] = "Bearer $token"
        
        # Profile endpoint
        $profileResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/auth/profile" -Headers $authHeaders
        Write-Host "   ✅ Profile: $($profileResponse.StatusCode)"
        
        # Logout endpoint
        $logoutResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/logout" -Headers $authHeaders
        Write-Host "   ✅ Logout: $($logoutResponse.StatusCode)"
    }
} catch {
    Write-Host "   ❌ Authentication Error: $_"
}

Write-Host ""

# Test 2: Public Booking Endpoints
Write-Host "2️⃣ Testing Public Booking Endpoints..."
try {
    # Public services
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers
    Write-Host "   ✅ Public Services: $($servicesResponse.StatusCode)"
    
    # Public staff
    $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff" -Headers $headers
    Write-Host "   ✅ Public Staff: $($staffResponse.StatusCode)"
    
    # Public availability
    $availabilityUrl = "$baseUrl/api/public/availability?serviceId=c45a5e05-78d8-4164-a1ac-313e2cefcfce`&` + "staffId=68f11f56-fdc5-4070-8e0a-09fc33506ded`&` + "date=2026-03-14"
    $availabilityResponse = Invoke-WebRequest -Method GET -Uri $availabilityUrl -Headers $headers
    Write-Host "   ✅ Public Availability: $($availabilityResponse.StatusCode)"
    
    # Create public booking
    $bookingData = @{
        serviceId = "c45a5e05-78d8-4164-a1ac-313e2cefcfce"
        staffId = "68f11f56-fdc5-4070-8e0a-09fc33506ded"
        customer = @{
            name = "Test Customer"
            email = "test@example.com"
            phone = "1234567890"
        }
        startTimeUtc = "2026-03-14T03:30:00.000Z"
        endTimeUtc = "2026-03-14T04:30:00.000Z"
        sessionToken = "test-session-123"
        consentGiven = $true
    }
    $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json)
    Write-Host "   ✅ Public Booking: $($bookingResponse.StatusCode) - $($bookingResponse.Content.Substring(0, [math]::min(100, $bookingResponse.Content.Length)))"
} catch {
    Write-Host "   ❌ Public Booking Error: $_"
}

Write-Host ""

# Test 3: Protected API Endpoints (with token)
Write-Host "3️⃣ Testing Protected API Endpoints..."
if ($token) {
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    try {
        # Appointments
        $appointmentsResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments" -Headers $authHeaders
        Write-Host "   ✅ Appointments: $($appointmentsResponse.StatusCode)"
        
        # Services
        $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders
        Write-Host "   ✅ Services: $($servicesResponse.StatusCode)"
        
        # Staff
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders
        Write-Host "   ✅ Staff: $($staffResponse.StatusCode)"
        
        # Customers
        $customersResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/customers" -Headers $authHeaders
        Write-Host "   ✅ Customers: $($customersResponse.StatusCode)"
        
        # Availability
        $availabilityUrl = "$baseUrl/api/availability?serviceId=c45a5e05-78d8-4164-a1ac-313e2cefcfce`&` + "staffId=68f11f56-fdc5-4070-8e0a-09fc33506ded`&` + "date=2026-03-14"
        $availabilityResponse = Invoke-WebRequest -Method GET -Uri $availabilityUrl -Headers $authHeaders
        Write-Host "   ✅ Availability: $($availabilityResponse.StatusCode)"
        
        # Reports
        $reportsUrl = "$baseUrl/api/reports?from=2026-03-01`&` + "to=2026-03-31"
        $reportsResponse = Invoke-WebRequest -Method GET -Uri $reportsUrl -Headers $authHeaders
        Write-Host "   ✅ Reports: $($reportsResponse.StatusCode)"
        
        # Audit
        $auditResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/audit" -Headers $authHeaders
        Write-Host "   ✅ Audit: $($auditResponse.StatusCode)"
        
        # Policy
        $policyResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/policy" -Headers $authHeaders
        Write-Host "   ✅ Policy: $($policyResponse.StatusCode)"
        
    } catch {
        Write-Host "   ❌ Protected API Error: $_"
    }
} else {
    Write-Host "   ⚠️  No token available, skipping protected endpoints"
}

Write-Host ""
Write-Host "🎯 API Integration Test Complete!"
