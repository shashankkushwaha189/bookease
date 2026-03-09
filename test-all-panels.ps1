# Test All Admin Panels
$baseUrl = "http://localhost:3000"
$webUrl = "http://localhost:5173"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "b18e0808-27d1-4253-aca9-453897585106"
}

Write-Host "🔍 Testing All Admin Panels..."
Write-Host ""

# Get admin token first
try {
    $loginData = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/auth/login" -Headers $headers -Body $loginData -UseBasicParsing
    $token = ($loginResponse.Content | ConvertFrom-Json).data.token
    $authHeaders = $headers.Clone()
    $authHeaders["Authorization"] = "Bearer $token"
    
    Write-Host "✅ Admin login successful"
    
    # Test 1: Dashboard Panel
    Write-Host "1️⃣ Testing Dashboard Panel..."
    try {
        $dashboardResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/summary?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Dashboard Summary: $($dashboardResponse.StatusCode)"
        
        $dashboard = $dashboardResponse.Content | ConvertFrom-Json
        if ($dashboard.success) {
            Write-Host "   ✅ Dashboard data: Total=$($dashboard.data.totalAppointments), Revenue=$($dashboard.data.revenue)"
        }
    } catch {
        Write-Host "   ❌ Dashboard error: $_"
    }
    
    # Test 2: Customers Panel
    Write-Host "2️⃣ Testing Customers Panel..."
    try {
        $customersResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/customers" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Customers List: $($customersResponse.StatusCode)"
        
        $customers = $customersResponse.Content | ConvertFrom-Json
        if ($customers.success) {
            Write-Host "   ✅ Customers loaded: $($customers.data.items.Count) customers"
            
            # Test customer creation
            $newCustomer = @{
                name = "Panel Test Customer"
                email = "paneltest@example.com"
                phone = "1234567890"
                notes = "Test from panel verification"
                tags = @("PANEL-TEST")
            } | ConvertTo-Json
            
            $createResponse = Invoke-WebRequest -Method POST -Uri "$baseUrl/api/customers" -Headers $authHeaders -Body $newCustomer -UseBasicParsing
            Write-Host "   Customer Create: $($createResponse.StatusCode)"
            
            if ($createResponse.StatusCode -eq 201) {
                $createdCustomer = $createResponse.Content | ConvertFrom-Json
                Write-Host "   ✅ Customer created: $($createdCustomer.data.name)"
            }
        }
    } catch {
        Write-Host "   ❌ Customers panel error: $_"
    }
    
    # Test 3: Staff Panel
    Write-Host "3️⃣ Testing Staff Panel..."
    try {
        $staffResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/staff" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Staff List: $($staffResponse.StatusCode)"
        
        $staff = $staffResponse.Content | ConvertFrom-Json
        if ($staff.success) {
            Write-Host "   ✅ Staff loaded: $($staff.data.items.Count) staff members"
        }
    } catch {
        Write-Host "   ❌ Staff panel error: $_"
    }
    
    # Test 4: Services Panel
    Write-Host "4️⃣ Testing Services Panel..."
    try {
        $servicesResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/services" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Services List: $($servicesResponse.StatusCode)"
        
        $services = $servicesResponse.Content | ConvertFrom-Json
        if ($services.success) {
            Write-Host "   ✅ Services loaded: $($services.data.items.Count) services"
        }
    } catch {
        Write-Host "   ❌ Services panel error: $_"
    }
    
    # Test 5: Reports Panel
    Write-Host "5️⃣ Testing Reports Panel..."
    try {
        $reportsSummary = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/summary?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Reports Summary: $($reportsSummary.StatusCode)"
        
        $reportsExport = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/reports/export?from=2026-03-01&to=2026-03-31" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Reports Export: $($reportsExport.StatusCode)"
        
        if ($reportsSummary.StatusCode -eq 200 -and $reportsExport.StatusCode -eq 200) {
            Write-Host "   ✅ Reports panel working correctly"
        }
    } catch {
        Write-Host "   ❌ Reports panel error: $_"
    }
    
    # Test 6: Configuration Panel
    Write-Host "6️⃣ Testing Configuration Panel..."
    try {
        $configResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/config" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Configuration: $($configResponse.StatusCode)"
        
        if ($configResponse.StatusCode -eq 200) {
            Write-Host "   ✅ Configuration panel accessible"
        } else {
            Write-Host "   ⚠️  Configuration response: $($configResponse.Content)"
        }
    } catch {
        Write-Host "   ❌ Configuration panel error: $_"
    }
    
    # Test 7: Audit Panel
    Write-Host "7️⃣ Testing Audit Panel..."
    try {
        $auditResponse = Invoke-WebRequest -Method GET -Uri "$baseUrl/api/audit" -Headers $authHeaders -UseBasicParsing
        Write-Host "   Audit Logs: $($auditResponse.StatusCode)"
        
        $audit = $auditResponse.Content | ConvertFrom-Json
        if ($audit.success) {
            Write-Host "   ✅ Audit logs: $($audit.data.items.Count) entries"
        }
    } catch {
        Write-Host "   ❌ Audit panel error: $_"
    }
    
    Write-Host ""
    Write-Host "🎯 All Admin Panels Test Complete!"
    
} catch {
    Write-Host "❌ Panel testing failed: $_"
}
