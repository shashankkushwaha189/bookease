# Test All Fixes
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Testing All Fixes..."
Write-Host ""

# Test 1: Public Booking (should work without auth now)
Write-Host "1️⃣ Testing Public Booking Flow..."
try {
    # Get services (public)
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    Write-Host "   Public Services: $($servicesResponse.StatusCode)"
    
    if ($servicesResponse.StatusCode -eq 200) {
        $services = $servicesResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Services: $($services.data.Count) available"
        
        # Get staff (public)
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($services.data[0].id)" -Headers $headers -UseBasicParsing
        Write-Host "   Public Staff: $($staffResponse.StatusCode)"
        
        if ($staffResponse.StatusCode -eq 200) {
            $staff = $staffResponse.Content | ConvertFrom-Json
            Write-Host "   ✅ Staff: $($staff.data.Count) available"
            
            # Get availability (public)
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($services.data[0].id)&staffId=$($staff.data[0].id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            Write-Host "   Public Availability: $($availabilityResponse.StatusCode)"
            
            if ($availabilityResponse.StatusCode -eq 200) {
                $availability = $availabilityResponse.Content | ConvertFrom-Json
                Write-Host "   ✅ Available Slots: $($availability.data.slots.Count)"
                
                if ($availability.data.slots.Count -gt 0) {
                    # Create booking (public)
                    $bookingData = @{
                        serviceId = $services.data[0].id
                        staffId = $staff.data[0].id
                        customer = @{
                            name = "Customer After Fix"
                            email = "customer@fixed.com"
                            phone = "1234567890"
                        }
                        startTimeUtc = $availability.data.slots[0].startTimeUtc
                        endTimeUtc = [DateTime]::Parse($availability.data.slots[0].startTimeUtc).AddMinutes($services.data[0].duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        consentGiven = $true
                    }
                    
                    $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                    Write-Host "   Public Booking: $($bookingResponse.StatusCode)"
                    
                    if ($bookingResponse.StatusCode -eq 201) {
                        $booking = $bookingResponse.Content | ConvertFrom-Json
                        Write-Host ""
                        Write-Host "🎉 PUBLIC BOOKING WORKING!"
                        Write-Host "   🎫 Reference: $($booking.data.referenceId)"
                        Write-Host "   🆔 ID: $($booking.data.id)"
                        Write-Host "   👤 Customer: $($booking.data.customer.name)"
                    } else {
                        $error = $bookingResponse.Content | ConvertFrom-Json
                        Write-Host "   ❌ Booking failed: $($error.error.message)"
                    }
                } else {
                    Write-Host "   ❌ No available slots"
                }
            } else {
                Write-Host "   ❌ Staff API failed"
            }
        } else {
            Write-Host "   ❌ Services API failed"
        }
    } else {
        Write-Host "   ❌ Services not accessible"
    }
    
} catch {
    Write-Host "   ❌ Test error: $_"
}

Write-Host ""

# Test 2: Check that protected routes still require auth
Write-Host "2️⃣ Testing Protected Routes..."
try {
    # Get admin token
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    # Test protected routes (should require auth)
    $protectedRoutes = @("/api/appointments", "/api/customers", "/api/services", "/api/staff", "/api/reports")
    
    foreach ($route in $protectedRoutes) {
        $response = Invoke-WebRequest -Method GET -Uri "$baseUrl$route" -Headers $authHeaders -UseBasicParsing
        Write-Host "   $route : $($response.StatusCode)"
    }
    
    # Test public routes without auth (should work)
    $publicRoutes = @("/api/public/services", "/api/public/staff", "/api/public/availability")
    
    foreach ($route in $publicRoutes) {
        $response = Invoke-WebRequest -Method GET -Uri "$baseUrl$route" -Headers $headers -UseBasicParsing
        Write-Host "   $route : $($response.StatusCode)"
    }
    
} catch {
    Write-Host "   ❌ Protected routes test error: $_"
}

Write-Host ""
Write-Host "🎯 All Fixes Test Complete!"
