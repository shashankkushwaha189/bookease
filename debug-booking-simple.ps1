# Debug Booking Simple
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Debugging Booking Flow..."

try {
    # Get services
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "Services: $($servicesData.data.Count)"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "Service: $($service.name) (ID: $($service.id))"
        
        # Get staff
        $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staff.Content | ConvertFrom-Json
        Write-Host "Staff: $($staffData.data.Count)"
        
        if ($staffData.data.Count -gt 0) {
            $staffMember = $staffData.data[0]
            Write-Host "Staff: $($staffMember.name) (ID: $($staffMember.id))"
            
            # Get availability
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availability = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staffMember.id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            $availabilityData = $availability.Content | ConvertFrom-Json
            Write-Host "Availability: $($availabilityData.data.slots.Count)"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "Slot: $($slot.startTimeUtc) (Available: $($slot.available))"
                
                # Create booking
                $bookingData = @{
                    serviceId = $service.id
                    staffId = $staffMember.id
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
                
                Write-Host "Creating booking..."
                $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body $bookingData -UseBasicParsing
                Write-Host "Booking Response: $($booking.StatusCode)"
                
                if ($booking.StatusCode -eq 201) {
                    $bookingResult = $booking.Content | ConvertFrom-Json
                    Write-Host ""
                    Write-Host "BOOKING SUCCESSFUL!"
                    Write-Host "Reference: $($bookingResult.data.referenceId)"
                    Write-Host "ID: $($bookingResult.data.id)"
                    Write-Host "Customer: $($bookingResult.data.customer.name)"
                    Write-Host "Status: $($bookingResult.data.status)"
                    
                    # Verify booking
                    $verify = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/bookings/$($bookingResult.data.referenceId)" -Headers $headers -UseBasicParsing
                    Write-Host "Verification: $($verify.StatusCode)"
                    
                    if ($verify.StatusCode -eq 200) {
                        $verifyData = $verify.Content | ConvertFrom-Json
                        Write-Host "Booking verified: $($verifyData.data.status)"
                    } else {
                        Write-Host "Verification failed: $($verify.Content)"
                    }
                    
                } else {
                    $error = $booking.Content | ConvertFrom-Json
                    Write-Host "Booking failed!"
                    Write-Host "Status: $($booking.StatusCode)"
                    Write-Host "Error: $($error.error.message)"
                    Write-Host "Code: $($error.error.code)"
                }
                
            } else {
                Write-Host "No available slots"
                Write-Host "Response: $($availability.Content)"
            }
            
        } else {
            Write-Host "No staff available"
        }
        
    } else {
        Write-Host "No services available"
    }
    
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        Write-Host "Content: $($_.Exception.Response.Content)"
    }
}
