# Debug Booking Flow
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Debugging Complete Booking Flow..."
Write-Host ""

# Step 1: Get services
Write-Host "1️⃣ Getting Services..."
try {
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $servicesResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Services: $($servicesData.data.Count) found"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "   📋 Service: $($service.name) (ID: $($service.id))"
        
        # Step 2: Get staff
        Write-Host "2️⃣ Getting Staff..."
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Staff: $($staffData.data.Count) found"
        
        if ($staffData.data.Count -gt 0) {
            $staff = $staffData.data[0]
            Write-Host "   👥 Staff: $($staff.name) (ID: $($staff.id))"
            
            # Step 3: Get availability
            Write-Host "3️⃣ Getting Availability..."
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
            Write-Host "   ✅ Availability: $($availabilityData.data.slots.Count) slots"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "   ⏰ Slot: $($slot.startTimeUtc) (Available: $($slot.available))"
                
                # Step 4: Create booking
                Write-Host "4️⃣ Creating Booking..."
                $bookingData = @{
                    serviceId = $service.id
                    staffId = $staff.id
                    customer = @{
                        name = "Debug Test Customer"
                        email = "debug@test.com"
                        phone = "1234567890"
                    }
                    startTimeUtc = $slot.startTimeUtc
                    endTimeUtc = [DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    consentGiven = $true
                    notes = "Debug booking test"
                    sessionToken = "debug-session-$([System.Guid]::NewGuid())"
                } | ConvertTo-Json -Depth 10
                
                Write-Host "   📝 Booking Data:"
                Write-Host "      Service ID: $($service.id)"
                Write-Host "      Staff ID: $($staff.id)"
                Write-Host "      Start Time: $($slot.startTimeUtc)"
                Write-Host "      End Time: $([DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"))"
                Write-Host "      Customer: Debug Test Customer"
                Write-Host "      Consent: $true"
                Write-Host "      Session Token: debug-session-$([System.Guid]::NewGuid())"
                
                $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body $bookingData -UseBasicParsing
                Write-Host "   📅 Booking Response: $($bookingResponse.StatusCode)"
                
                if ($bookingResponse.StatusCode -eq 201) {
                    $bookingResult = $bookingResponse.Content | ConvertFrom-Json
                    Write-Host ""
                    Write-Host "🎉 BOOKING SUCCESSFUL!"
                    Write-Host "   🎫 Reference: $($bookingResult.data.referenceId)"
                    Write-Host "   🆔 ID: $($bookingResult.data.id)"
                    Write-Host "   👤 Customer: $($bookingResult.data.customer.name)"
                    Write-Host "   📊 Status: $($bookingResult.data.status)"
                    
                    # Step 5: Verify booking exists
                    Write-Host "5️⃣ Verifying Booking..."
                    $verifyResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/bookings/$($bookingResult.data.referenceId)" -Headers $headers -UseBasicParsing
                    Write-Host "   🔍 Verification: $($verifyResponse.StatusCode)"
                    
                    if ($verifyResponse.StatusCode -eq 200) {
                        $verifyData = $verifyResponse.Content | ConvertFrom-Json
                        Write-Host "   ✅ Booking verified in system"
                        Write-Host "   📊 Status: $($verifyData.data.status)"
                    } else {
                        Write-Host "   ❌ Booking verification failed"
                        Write-Host "   🔍 Error: $($verifyResponse.Content)"
                    }
                    
                } else {
                    $error = $bookingResponse.Content | ConvertFrom-Json
                    Write-Host "   ❌ Booking failed!"
                    Write-Host "   🔍 Status: $($bookingResponse.StatusCode)"
                    Write-Host "   🔍 Error: $($error.error.message)"
                    Write-Host "   🔍 Code: $($error.error.code)"
                    
                    if ($error.error.details) {
                        Write-Host "   🔍 Details:"
                        $error.error.details.PSObject.Properties | ForEach-Object {
                            Write-Host "      $($_.Name): $($_.Value)"
                        }
                    }
                }
                
            } else {
                Write-Host "   ❌ No available slots found"
                Write-Host "   🔍 Response: $($availabilityResponse.Content)"
            }
            
        } else {
            Write-Host "   ❌ No staff available for this service"
        }
        
    } else {
        Write-Host "   ❌ No services available"
    }
    
} catch {
    Write-Host "   ❌ Error: $_"
    Write-Host "   🔍 Exception details:"
    Write-Host "      Type: $($_.Exception.GetType().Name)"
    Write-Host "      Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "      Status: $($_.Exception.Response.StatusCode)"
        Write-Host "      Content: $($_.Exception.Response.Content)"
    }
}

Write-Host ""
Write-Host "🎯 Booking Flow Debug Complete!"
