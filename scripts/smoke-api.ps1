$ErrorActionPreference = "Stop"

function Get-Json($Uri, $Headers = $null) {
  if ($Headers) {
    return Invoke-RestMethod -Uri $Uri -Headers $Headers
  }
  return Invoke-RestMethod -Uri $Uri
}

function Hit($Method, $BaseUrl, $Path, $Headers = $null, $Body = $null, $ContentType = "application/json") {
  $uri = "$BaseUrl$Path"
  try {
    $params = @{
      Method = $Method
      Uri = $uri
      UseBasicParsing = $true
    }
    if ($Headers) { $params.Headers = $Headers }
    if ($Body) { $params.Body = $Body; $params.ContentType = $ContentType }
    $resp = Invoke-WebRequest @params
    Write-Host "OK   $Method $Path $($resp.StatusCode)"
    return $true
  } catch {
    $e = $_.Exception
    if ($e.Response) {
      $code = [int]$e.Response.StatusCode
      $sr = New-Object IO.StreamReader($e.Response.GetResponseStream())
      $bodyText = $sr.ReadToEnd()
      Write-Host "FAIL $Method $Path $code"
      if ($bodyText) { Write-Host $bodyText }
    } else {
      Write-Host "FAIL $Method $Path $($e.Message)"
    }
    return $false
  }
}

$baseUrl = "http://localhost:3000"

Write-Host "== Resolve tenant =="
$tenants = Get-Json "$baseUrl/api/tenants"
if (-not $tenants.data -or $tenants.data.Count -eq 0) {
  throw "No tenants found. Seed demo data first."
}
$tenant = ($tenants.data | Where-Object { $_.slug -eq "demo-clinic" } | Select-Object -First 1)
if (-not $tenant) {
  $tenant = $tenants.data | Select-Object -First 1
}
$tenantId = $tenant.id
Write-Host "TENANT_ID=$tenantId SLUG=$($tenant.slug)"

Write-Host "== Login =="
$loginBody = @{ email = "admin@demo.com"; password = "demo123456" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/login" -Headers @{ "X-Tenant-ID" = $tenantId } -ContentType "application/json" -Body $loginBody
$token = $loginResp.data.token
if (-not $token) { throw "Login did not return token" }
Write-Host "TOKEN_LEN=$($token.Length)"

$authHeaders = @{
  "Authorization" = "Bearer $token"
  "X-Tenant-ID"   = $tenantId
}

Write-Host "== Core endpoints =="
Hit GET $baseUrl "/health"
Hit GET $baseUrl "/ready"

Write-Host "== Auth =="
Hit GET $baseUrl "/api/auth/me" $authHeaders

Write-Host "== Admin feature APIs =="
Hit GET $baseUrl "/api/business-profile" $authHeaders
Hit GET $baseUrl "/api/config/current" $authHeaders
Hit GET $baseUrl "/api/services" $authHeaders
Hit GET $baseUrl "/api/staff" $authHeaders
Hit GET $baseUrl "/api/appointments" $authHeaders
Hit GET $baseUrl "/api/reports/summary?from=2026-01-01&to=2026-12-31" $authHeaders
Hit GET $baseUrl "/api/audit" $authHeaders
Hit GET $baseUrl "/api/tokens" $authHeaders
Hit GET $baseUrl "/api/import/history" $authHeaders

Write-Host "== Public feature APIs =="
Hit GET $baseUrl "/api/public/profile" $authHeaders
Hit GET $baseUrl "/api/public/services" $authHeaders
Hit GET $baseUrl "/api/public/staff" $authHeaders

Write-Host "== Done =="

