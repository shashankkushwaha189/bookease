# Test Slot Availability Simple
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "Testing Slot Availability..."

try {
    # Get services
    $services = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $services.Content | ConvertFrom-Json
    Write-Host "Services: $($servicesData.data.Count)"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "Service: $($service.name)"
        
        # Get staff
        $staff = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staff.Content | ConvertFrom-Json
        Write-Host "Staff: $($staffData.data.Count)"
        
        if ($staffData.data.Count -gt 0) {
            $staffMember = $staffData.data[0]
            Write-Host "Staff: $($staffMember.name)"
            
            # Test availability for tomorrow
            $date = "2026-03-08"
            Write-Host "Testing availability for $date"
            
            $url = "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staffMember.id)&date=$date"
            $availability = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -UseBasicParsing
            Write-Host "Availability Status: $($availability.StatusCode)"
            
            $availabilityData = $availability.Content | ConvertFrom-Json
            Write-Host "Response: $($availabilityData.success)"
            
            if ($availabilityData.success) {
                Write-Host "Slots found: $($availabilityData.data.slots.Count)"
                
                if ($availabilityData.data.slots.Count -gt 0) {
                    $firstSlot = $availabilityData.data.slots[0]
                    Write-Host "First slot: $($firstSlot.startTimeUtc)"
                    Write-Host "Available: $($firstSlot.available)"
                } else {
                    Write-Host "No available slots"
                }
            } else {
                Write-Host "Error: $($availabilityData.error.message)"
            }
        }
    }
    
} catch {
    Write-Host "Error: $_"
}
