# Test Customer Booking Access
$baseUrl = "http://localhost:3000"
$webUrl = "http://localhost:5173"

Write-Host "🔍 Investigating Customer Booking Issues..."
Write-Host ""

# Test 1: Check if web app is running
Write-Host "1️⃣ Checking Web Application Status..."
try {
    $webResponse = Invoke-WebRequest -Method GET -Uri $webUrl -UseBasicParsing
    Write-Host "   ✅ Web App Status: $($webResponse.StatusCode)"
    Write-Host "   📱 Web App Running: YES"
} catch {
    Write-Host "   ❌ Web App Not Running: $_"
    Write-Host "   💡 Solution: Start web app with 'npm run dev'"
    exit
}

Write-Host ""

# Test 2: Check public booking endpoints without authentication
Write-Host "2️⃣ Testing Public Booking Endpoints..."
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

try {
    # Test public services
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    Write-Host "   📋 Public Services: $($servicesResponse.StatusCode)"
    
    if ($servicesResponse.StatusCode -eq 200) {
        $services = $servicesResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Available Services: $($services.data.Count)"
        
        # Test public staff
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff" -Headers $headers -UseBasicParsing
        Write-Host "   👥 Public Staff: $($staffResponse.StatusCode)"
        
        if ($staffResponse.StatusCode -eq 200) {
            $staff = $staffResponse.Content | ConvertFrom-Json
            Write-Host "   ✅ Available Staff: $($staff.data.Count)"
            
            # Test public availability
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($services.data[0].id)&date=2026-03-15" -Headers $headers -UseBasicParsing
            Write-Host "   ⏰ Public Availability: $($availabilityResponse.StatusCode)"
            
            if ($availabilityResponse.StatusCode -eq 200) {
                $availability = $availabilityResponse.Content | ConvertFrom-Json
                Write-Host "   ✅ Available Slots: $($availability.data.slots.Count)"
                
                # Test public booking creation
                Write-Host "   📅 Testing Public Booking Creation..."
                
                $bookingData = @{
                    serviceId = $services.data[0].id
                    staffId = $staff.data[0].id
                    customer = @{
                        name = "Customer Test"
                        email = "customer@test.com"
                        phone = "1234567890"
                    }
                    startTimeUtc = "2026-03-15T10:00:00.000Z"
                    endTimeUtc = "2026-03-15T10:30:00.000Z"
                    sessionToken = "customer-test-123"
                    consentGiven = $true
                }
                
                $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                Write-Host "   🎫 Public Booking: $($bookingResponse.StatusCode)"
                
                if ($bookingResponse.StatusCode -eq 201) {
                    $booking = $bookingResponse.Content | ConvertFrom-Json
                    Write-Host "   ✅ Booking Created: $($booking.data.referenceId)"
                    Write-Host ""
                    Write-Host "🎉 CUSTOMER BOOKING WORKING!"
                    Write-Host "   📋 No authentication required"
                    Write-Host "   🎫 Reference: $($booking.data.referenceId)"
                    Write-Host "   🆔 Booking ID: $($booking.data.id)"
                } else {
                    $error = $bookingResponse.Content | ConvertFrom-Json
                    Write-Host "   ❌ Booking Failed: $($error.error.message)"
                    
                    # Check specific error types
                    if ($error.error.code -eq "UNAUTHORIZED") {
                        Write-Host "   🔐 Issue: Authentication required but shouldn't be for public booking"
                    }
                    if ($error.error.code -eq "VALIDATION_ERROR") {
                        Write-Host "   📝 Issue: Data validation failed"
                    }
                    if ($error.error.code -eq "SLOT_TAKEN") {
                        Write-Host "   ⏰ Issue: Slot already booked"
                    }
                }
                
            } else {
                Write-Host "   ❌ Availability Check Failed: $($availabilityResponse.StatusCode)"
            }
            
        } else {
            Write-Host "   ❌ Staff Check Failed: $($staffResponse.StatusCode)"
        }
        
    } else {
        Write-Host "   ❌ Services Check Failed: $($servicesResponse.StatusCode)"
    }
    
} catch {
    Write-Host "   ❌ Public Booking Test Error: $_"
}

Write-Host ""

# Test 3: Check if customer needs to login first
Write-Host "3️⃣ Checking Customer Authentication Requirements..."
Write-Host "   💡 Customer booking should work WITHOUT login"
Write-Host "   🔐 If authentication is required, check middleware configuration"
Write-Host "   🌐 Public endpoints: /api/public/* should not require auth"

Write-Host ""

# Test 4: Check routing and middleware
Write-Host "4️⃣ Checking Common Issues..."
Write-Host "   🔍 Possible Issues:"
Write-Host "   1. Web app not running on port 5173"
Write-Host "   2. API server not running on port 3000"
Write-Host "   3. CORS issues between frontend and backend"
Write-Host "   4. Tenant ID missing or incorrect"
Write-Host "   5. Public endpoints requiring authentication"
Write-Host "   6. Network connectivity issues"

Write-Host ""
Write-Host "🎯 Customer Booking Investigation Complete!"
