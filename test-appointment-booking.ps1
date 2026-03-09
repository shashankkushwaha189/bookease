# Test Appointment Booking System
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Testing Appointment Booking System..."
Write-Host ""

# Step 1: Get admin token
try {
    Write-Host "1️⃣ Getting Admin Token..."
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    Write-Host "   ✅ Admin token obtained"
    
    # Step 2: Get available services
    Write-Host "2️⃣ Getting Available Services..."
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders -UseBasicParsing
    $servicesData = $servicesResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Services: $($servicesData.data.items.Count) available"
    
    if ($servicesData.data.items.Count -gt 0) {
        $service = $servicesData.data.items[0]
        Write-Host "   📋 Selected: $($service.name) ($($service.duration)min)"
        
        # Step 3: Get available staff
        Write-Host "3️⃣ Getting Available Staff..."
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Staff: $($staffData.data.items.Count) available"
        
        if ($staffData.data.items.Count -gt 0) {
            $staff = $staffData.data.items[0]
            Write-Host "   👥 Selected: $($staff.name)"
            
            # Step 4: Check availability
            Write-Host "4️⃣ Checking Availability..."
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$tomorrow" -Headers $authHeaders -UseBasicParsing
            $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
            Write-Host "   ✅ Availability: $($availabilityData.data.slots.Count) slots"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "   ⏰ Selected slot: $($slot.startTimeUtc)"
                
                # Step 5: Create appointment booking
                Write-Host "5️⃣ Creating Appointment Booking..."
                $bookingData = @{
                    serviceId = $service.id
                    staffId = $staff.id
                    customer = @{
                        name = "Appointment Test User"
                        email = "appointment@test.com"
                        phone = "1234567890"
                    }
                    startTimeUtc = $slot.startTimeUtc
                    endTimeUtc = [DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    consentGiven = $true
                    notes = "Test appointment booking"
                }
                
                $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/appointments/book" -Headers $authHeaders -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                Write-Host "   📅 Booking Status: $($bookingResponse.StatusCode)"
                
                if ($bookingResponse.StatusCode -eq 201) {
                    $bookingResult = $bookingResponse.Content | ConvertFrom-Json
                    $appointmentId = $bookingResult.data.id
                    $referenceId = $bookingResult.data.referenceId
                    Write-Host ""
                    Write-Host "🎉 APPOINTMENT BOOKED SUCCESSFULLY!"
                    Write-Host "   🎫 Reference ID: $referenceId"
                    Write-Host "   🆔 Appointment ID: $appointmentId"
                    Write-Host "   👤 Customer: $($bookingResult.data.customer.name)"
                    Write-Host "   🛠️  Service: $($bookingResult.data.service.name)"
                    Write-Host "   👥 Staff: $($bookingResult.data.staff.name)"
                    Write-Host "   📅 Time: $($bookingResult.data.startTimeUtc)"
                    Write-Host "   📊 Status: $($bookingResult.data.status)"
                    
                    # Step 6: Verify appointment in system
                    Write-Host "6️⃣ Verifying Appointment in System..."
                    $verifyResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$appointmentId" -Headers $authHeaders -UseBasicParsing
                    $verifyData = $verifyResponse.Content | ConvertFrom-Json
                    
                    if ($verifyData.success) {
                        Write-Host "   ✅ Appointment verified in system"
                        Write-Host "   📊 Current Status: $($verifyData.data.status)"
                        
                        # Step 7: Get appointment timeline
                        Write-Host "7️⃣ Getting Appointment Timeline..."
                        $timelineResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$appointmentId/timeline" -Headers $authHeaders -UseBasicParsing
                        $timelineData = $timelineResponse.Content | ConvertFrom-Json
                        
                        if ($timelineData.success) {
                            Write-Host "   ✅ Timeline events: $($timelineData.data.Count)"
                            $timelineData.data | ForEach-Object {
                                Write-Host "      📝 $($_.eventType): $($_.createdAt)"
                            }
                        }
                        
                        # Step 8: Test status update
                        Write-Host "8️⃣ Testing Status Update..."
                        $statusUpdate = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/appointments/$appointmentId/confirm" -Headers $authHeaders -UseBasicParsing
                        Write-Host "   🔄 Status Update: $($statusUpdate.StatusCode)"
                        
                        if ($statusUpdate.StatusCode -eq 200) {
                            Write-Host "   ✅ Status updated to CONFIRMED"
                        }
                        
                    } else {
                        Write-Host "   ❌ Appointment verification failed"
                    }
                    
                } else {
                    $error = $bookingResponse.Content | ConvertFrom-Json
                    Write-Host "   ❌ Booking failed: $($error.error.message)"
                    Write-Host "   🔍 Error Code: $($error.error.code)"
                }
                
            } else {
                Write-Host "   ❌ No available slots found"
            }
            
        } else {
            Write-Host "   ❌ No staff available"
        }
        
    } else {
        Write-Host "   ❌ No services available"
    }
    
} catch {
    Write-Host "   ❌ Appointment booking error: $_"
}

Write-Host ""
Write-Host "🎯 Appointment Booking Test Complete!"
