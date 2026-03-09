# Test Slot Availability Issues
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Investigating Slot Availability Issues..."
Write-Host ""

# Test 1: Get available services
Write-Host "1️⃣ Getting Services..."
try {
    $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/services" -Headers $headers -UseBasicParsing
    $servicesData = $servicesResponse.Content | ConvertFrom-Json
    Write-Host "   Services: $($servicesData.data.Count) found"
    
    if ($servicesData.data.Count -gt 0) {
        $service = $servicesData.data[0]
        Write-Host "   📋 Service: $($service.name) (Duration: $($service.duration)min)"
        
        # Test 2: Get staff for this service
        Write-Host "2️⃣ Getting Staff..."
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/staff?serviceId=$($service.id)" -Headers $headers -UseBasicParsing
        $staffData = $staffResponse.Content | ConvertFrom-Json
        Write-Host "   Staff: $($staffData.data.Count) found"
        
        if ($staffData.data.Count -gt 0) {
            $staff = $staffData.data[0]
            Write-Host "   👥 Staff: $($staff.name)"
            
            # Test 3: Check availability for multiple dates
            Write-Host "3️⃣ Testing Availability for Multiple Dates..."
            $dates = @("2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11")
            
            foreach ($date in $dates) {
                Write-Host "   📅 Checking $date..."
                
                $availabilityResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&staffId=$($staff.id)&date=$date" -Headers $headers -UseBasicParsing
                $availabilityData = $availabilityResponse.Content | ConvertFrom-Json
                
                Write-Host "      Status: $($availabilityResponse.StatusCode)"
                
                if ($availabilityData.success) {
                    Write-Host "      ✅ Slots: $($availabilityData.data.slots.Count)"
                    
                    if ($availabilityData.data.slots.Count -gt 0) {
                        $firstSlot = $availabilityData.data.slots[0]
                        Write-Host "      🎯 First Slot: $($firstSlot.startTimeUtc)"
                        Write-Host "      🔍 Available: $($firstSlot.available)"
                        Write-Host "      📊 Raw Response:"
                        Write-Host "         $($availabilityResponse.Content)"
                    } else {
                        Write-Host "      ❌ No slots found"
                        Write-Host "      🔍 Response: $($availabilityResponse.Content)"
                    }
                } else {
                    Write-Host "      ❌ API Error: $($availabilityData.error.message)"
                }
                
                Write-Host ""
            }
            
            # Test 4: Check availability without staff (no preference)
            Write-Host "4️⃣ Testing No-Staff Preference..."
            $noStaffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/public/availability?serviceId=$($service.id)&date=2026-03-08" -Headers $headers -UseBasicParsing
            $noStaffData = $noStaffResponse.Content | ConvertFrom-Json
            Write-Host "   No-Staff Status: $($noStaffResponse.StatusCode)"
            Write-Host "   No-Staff Slots: $($noStaffData.data.slots.Count)"
            
            # Test 5: Check staff schedules
            Write-Host "5️⃣ Testing Staff Schedules..."
            $scheduleResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff/$($staff.id)/availability?fromDate=2026-03-08&toDate=2026-03-08" -Headers $headers -UseBasicParsing
            Write-Host "   Schedule Status: $($scheduleResponse.StatusCode)"
            
        } else {
            Write-Host "   ❌ No staff available"
        }
        
    } else {
        Write-Host "   ❌ No services available"
    }
    
} catch {
    Write-Host "   ❌ Error: $_"
}

Write-Host ""
Write-Host "🎯 Slot Availability Investigation Complete!"
