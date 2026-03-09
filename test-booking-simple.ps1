# Test Simple Booking Flow
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Booking Flow..."

try {
    # Step 1: Get services
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "Services: $($servicesData.data.Count) found"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "Selected service: $($service.name)"
        
        # Step 2: Get staff
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "Staff: $($staffData.data.Count) found"
        
        if ($staffData.data.Count -gt 0) {
            $staff = $staffData.data[0]
            Write-Host "Selected staff: $($staff.name)"
            
            # Step 3: Get availability
            $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
            $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$tomorrow" -Headers $headers -UseBasicParsing
            $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
            Write-Host "Availability: $($availabilityData.data.slots.Count) slots"
            
            if ($availabilityData.data.slots.Count -gt 0) {
                $slot = $availabilityData.data.slots[0]
                Write-Host "Selected slot: $($slot.startTimeUtc)"
                
                # Step 4: Create booking
                $bookingData = @{
                    serviceId = $service.id
                    staffId = $staff.id
                    customer = @{
                        name = "Test Customer"
                        email = "test@example.com"
                        phone = "1234567890"
                    }
                    startTimeUtc = $slot.startTimeUtc
                    endTimeUtc = [DateTime]::Parse($slot.startTimeUtc).AddMinutes($service.duration).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    sessionToken = "test-session-123"
                    consentGiven = $true
                }
                
                $bookingResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/public/bookings" -Headers $headers -Body ($bookingData | ConvertTo-Json) -UseBasicParsing
                $bookingResult = $bookingResponse.Content | ConvertFrom-Json
                
                if ($bookingResult.success) {
                    Write-Host "Booking SUCCESS: $($bookingResult.data.referenceId)"
                    Write-Host "Booking ID: $($bookingResult.data.id)"
                    Write-Host "Status: $($bookingResult.data.status)"
                } else {
                    Write-Host "Booking FAILED: $($bookingResult.error.message)"
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

Write-Host "Booking flow test complete!"
