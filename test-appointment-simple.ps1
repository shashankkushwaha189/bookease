# Test Appointment Booking Simple
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Appointment Booking..."

try {
    # Get admin token
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "Admin login: SUCCESS"
    
    # Get services
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "Services: $($servicesData.data.items.Count)"
    
    if ($servicesData.data.items.Count -gt 0) {
        $service = $servicesData.data.items[0]
        Write-Host "Service: $($service.name)"
        
        # Get staff
        $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders -UseBasicParsing
        $staffData = $staff.Content | ConvertFrom-Json
        Write-Host "Staff: $($staffData.data.items.Count)"
        
        if ($staffData.data.items.Count -gt 0) {
            $staffMember = $staffData.data.items[0]
            Write-Host "Staff: $($staffMember.name)"
            
            # Get availability
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availability = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/availability?serviceId=$($service.id)&staffId=$($staffMember.id)&date=$tomorrow" -Headers $authHeaders -UseBasicParsing
            $availabilityData = $availability.Content | ConvertFrom-Json
            Write-Host "Availability: $($availabilityData.data.slots.Count)"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "Slot: $($slot.startTimeUtc)"
                
                # Create booking
                $bookingData = @{
                    serviceId = $service.id
                    staffId = $staffMember.id
                    customer = @{
                        name = "Test Appointment"
                        email = "test@appointment.com"
                        phone = "1234567890"
                    }
                    startTimeUtc = $slot.startTimeUtc
                    endTimeUtc = [DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    consentGiven = $true
                    notes = "Test appointment booking"
                }
                
                $booking = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/appointments/book" -Headers $authHeaders -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                Write-Host "Booking: $($booking.StatusCode)"
                
                if ($booking.StatusCode -eq 201) {
                    $bookingResult = $booking.Content | ConvertFrom-Json
                    $appointmentId = $bookingResult.data.id
                    Write-Host ""
                    Write-Host "APPOINTMENT BOOKED!"
                    Write-Host "Reference: $($bookingResult.data.referenceId)"
                    Write-Host "ID: $appointmentId"
                    Write-Host "Status: $($bookingResult.data.status)"
                    
                    # Verify appointment
                    $verify = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$appointmentId" -Headers $authHeaders -UseBasicParsing
                    $verifyData = $verify.Content | ConvertFrom-Json
                    Write-Host "Verification: $($verifyData.success)"
                    
                    # Get timeline
                    $timeline = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/appointments/$appointmentId/timeline" -Headers $authHeaders -UseBasicParsing
                    $timelineData = $timeline.Content | ConvertFrom-Json
                    Write-Host "Timeline: $($timelineData.data.Count) events"
                    
                    # Update status
                    $status = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/appointments/$appointmentId/confirm" -Headers $authHeaders -UseBasicParsing
                    Write-Host "Status Update: $($status.StatusCode)"
                    
                } else {
                    $error = $booking.Content | ConvertFrom-Json
                    Write-Host "Booking Error: $($error.error.message)"
                }
            } else {
                Write-Host "No available slots"
            }
        } else {
            Write-Host "No staff available"
        }
    } else {
        Write-Host "No services available"
    }
    
} catch {
    Write-Host "Error: $_"
}

Write-Host "Appointment booking test complete!"
