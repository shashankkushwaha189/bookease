# Test Complete Booking Flow
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Testing Complete Booking Flow..."

# Step 1: Get available services
Write-Host "1️⃣ Getting available services..."
try {
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "   ✅ Services found: $($servicesData.data.Count)"
    
    if ($servicesData.data.Count -gt 0) {
        $firstService = $servicesData.data[0]
        Write-Host "   📋 Selected service: $($firstService.name) ($($firstService.duration)min)"
        
        # Step 2: Get staff for this service
        Write-Host "2️⃣ Getting staff for service..."
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($firstService.id)" -Headers $headers -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Staff found: $($staffData.data.Count)"
        
        if ($staffData.data.Count -gt 0) {
            $firstStaff = $staffData.data[0]
            Write-Host "   👥 Selected staff: $($firstStaff.name)"
            
            # Step 3: Check availability for tomorrow
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            Write-Host "3️⃣ Checking availability for $tomorrow..."
            
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($firstService.id)&staffId=$($firstStaff.id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
            
            if ($availabilityData.data.slots -and $availabilityData.data.slots.Count -gt 0) {
                $firstSlot = $availabilityData.data.slots[0]
                Write-Host "   ⏰ Available slot found: $($firstSlot.startTimeUtc)"
                Write-Host "   📅 Slot available: $($firstSlot.available)"
                
                if ($firstSlot.available) {
                    # Step 4: Create booking (simulate frontend flow)
                    Write-Host "4️⃣ Creating booking..."
                    
                    $bookingData = @{
                        serviceId = $firstService.id
                        staffId = $firstStaff.id
                        customer = @{
                            name = "Test Customer Flow"
                            email = "testflow@example.com"
                            phone = "1234567890"
                        }
                        startTimeUtc = $firstSlot.startTimeUtc
                        endTimeUtc = [DateTime]::Parse($firstSlot.startTimeUtc).AddMinutes($firstService.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        sessionToken = "test-flow-$([guid]::NewGuid())"
                        consentGiven = $true
                    }
                    
                    $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                    $bookingResult = $bookingResponse.Content | ConvertFrom-Json
                    
                    if ($bookingResponse.success) {
                        $bookingId = $bookingResponse.data.id
                        $referenceId = $bookingResponse.data.referenceId
                        Write-Host "   ✅ Booking created successfully!"
                        Write-Host "   🎫 Booking ID: $bookingId"
                        Write-Host "   📋 Reference ID: $referenceId"
                        
                        # Step 5: Verify booking in system
                        Write-Host "5️⃣ Verifying booking in system..."
                        
                        # Login to get token for verification
                        $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
                        $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
                        $token = ($loginResponse.Content | ConvertFrom-Json).data.token
                        $authHeaders = $headers.Clone()
                        $authHeaders["Authorization"] = "Bearer $token"
                        
                        # Get appointment details
                        $appointmentResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$bookingId" -Headers $authHeaders -UseBasicParsing
                        $appointment = $appointmentResponse.Content | ConvertFrom-Json
                        
                        if ($appointment.success) {
                            Write-Host "   ✅ Booking verified in system!"
                            Write-Host "   📅 Status: $($appointment.data.status)"
                            Write-Host "   👤 Customer: $($appointment.data.customer.name)"
                            Write-Host "   🛠️  Service: $($appointment.data.service.name)"
                            
                            # Step 6: Check timeline
                            Write-Host "6️⃣ Checking booking timeline..."
                            $timelineResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$bookingId/timeline" -Headers $authHeaders -UseBasicParsing
                            $timeline = $timelineResponse.Content | ConvertFrom-Json
                            
                            if ($timeline.success) {
                                Write-Host "   ✅ Timeline events found: $($timeline.data.Count)"
                                $timeline.data | ForEach-Object {
                                    Write-Host "      📝 $($_.eventType): $($_.createdAt)"
                                }
                            }
                            
                            # Step 7: Test concurrent booking prevention
                            Write-Host "7️⃣ Testing concurrent booking prevention..."
                            try {
                                $duplicateBooking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                                Write-Host "   ⚠️  Duplicate booking should be rejected: $($duplicateBooking.StatusCode)"
                            } catch {
                                Write-Host "   ✅ Concurrent booking properly prevented: $_"
                            }
                            
                        } else {
                            Write-Host "   ❌ Booking verification failed"
                        }
                        
                    } else {
                        Write-Host "   ❌ Booking creation failed: $($bookingResponse.error.message)"
                    }
                    
                } else {
                    Write-Host "   ❌ No available slots found"
                }
                
            } else {
                Write-Host "   ❌ No availability data found"
            }
            
        } else {
            Write-Host "   ❌ No staff available for this service"
        }
        
    } else {
        Write-Host "   ❌ No services available"
    }
    
} catch {
    Write-Host "   ❌ Booking flow error: $_"
}

Write-Host ""
Write-Host "🎯 Booking Flow Test Complete!"
