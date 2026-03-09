# Test Complete Booking Flow
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Complete Booking Flow..."

try {
    # Step 1: Get services (public)
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "Services: $($servicesData.data.Count) found"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "Selected service: $($service.name) ($($service.duration)min)"
        
        # Step 2: Get staff (public)
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "Staff: $($staffData.data.Count) found"
        
        if ($staffData.data.Count -gt 0) {
            $staff = $staffData.data[0]
            Write-Host "Selected staff: $($staff.name)"
            
            # Step 3: Get availability (public)
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
            Write-Host "Availability: $($availabilityData.data.slots.Count) slots"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "Selected slot: $($slot.startTimeUtc)"
                Write-Host "Slot available: $($slot.available)"
                
                if ($slot.available) {
                    # Step 4: Create booking (public)
                    $bookingData = @{
                        serviceId = $service.id
                        staffId = $staff.id
                        customer = @{
                            name = "Test Booking Complete"
                            email = "testcomplete@example.com"
                            phone = "1234567890"
                        }
                        startTimeUtc = $slot.startTimeUtc
                        endTimeUtc = [DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        sessionToken = "test-complete-$([guid]::NewGuid())"
                        consentGiven = $true
                    }
                    
                    $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                    $bookingResult = $bookingResponse.Content | ConvertFrom-Json
                    
                    if ($bookingResult.success) {
                        $bookingId = $bookingResult.data.id
                        $referenceId = $bookingResult.data.referenceId
                        Write-Host ""
                        Write-Host "✅ BOOKING SUCCESSFUL!"
                        Write-Host "🎫 Reference ID: $referenceId"
                        Write-Host "🆔 Booking ID: $bookingId"
                        Write-Host "📅 Status: $($bookingResult.data.status)"
                        Write-Host "👤 Customer: $($bookingResult.data.customer.name)"
                        Write-Host "🛠️  Service: $($bookingResult.data.service.name)"
                        Write-Host "👥 Staff: $($bookingResult.data.staff.name)"
                        Write-Host "⏰ Time: $($bookingResult.data.startTimeUtc)"
                        
                        # Step 5: Verify with authenticated request
                        Write-Host ""
                        Write-Host "Verifying booking with authenticated request..."
                        
                        # Login to get token
                        $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
                        $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
                        $token = ($loginResponse.Content | ConvertFrom-Json).data.token
                        $authHeaders = $headers.Clone()
                        $authHeaders["Authorization"] = "Bearer $token"
                        
                        # Get appointment details
                        $verifyResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$bookingId" -Headers $authHeaders -UseBasicParsing
                        $verifyResult = $verifyResponse.Content | ConvertFrom-Json
                        
                        if ($verifyResult.success) {
                            Write-Host "✅ Booking verified in system!"
                            Write-Host "📊 Status: $($verifyResult.data.status)"
                            Write-Host "📝 Notes: $($verifyResult.data.notes)"
                        } else {
                            Write-Host "❌ Booking verification failed: $($verifyResult.error.message)"
                        }
                        
                    } else {
                        Write-Host "❌ Booking failed: $($bookingResult.error.message)"
                    }
                    
                } else {
                    Write-Host "❌ Selected slot is not available"
                }
                
            } else {
                Write-Host "❌ No available slots found"
            }
            
        } else {
            Write-Host "❌ No staff available for this service"
        }
        
    } else {
        Write-Host "❌ No services available"
    }
    
} catch {
    Write-Host "❌ Booking flow error: $_"
}

Write-Host ""
Write-Host "🎯 Booking Flow Test Complete!"
