# No2ta LAN Host Discovery
# Listens for the UDP beacon broadcast by services/discovery.js (startBeacon)
# and prints the current server URL (http://<ip>:<port>) to stdout.
# Falls back to the last successfully-discovered host (cached in %TEMP%) if
# no beacon is heard in time, so a brief network hiccup doesn't break it.
# Prints NOTFOUND if nothing is discoverable and there is no cache either.

param(
    [int]$TimeoutMs = 3000,
    [int]$BeaconPort = 5055
)

$cacheFile = Join-Path $env:TEMP 'no2ta_last_host.txt'
$result = $null

try {
    $udp = New-Object System.Net.Sockets.UdpClient($BeaconPort)
    $udp.Client.ReceiveTimeout = $TimeoutMs
    $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
    $bytes = $udp.Receive([ref]$remote)
    $udp.Close()
    $json = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    if ($json.app -eq 'no2ta' -and $json.hostIp) {
        $result = "http://$($json.hostIp):$($json.port)"
        Set-Content -Path $cacheFile -Value $result -Force -Encoding UTF8
    }
} catch {
    # Beacon not heard in time (server off, different subnet, firewall...) — fall through to cache.
}

if (-not $result -and (Test-Path $cacheFile)) {
    $result = (Get-Content $cacheFile -Raw).Trim()
}

if ($result) {
    Write-Output $result
} else {
    Write-Output 'NOTFOUND'
}
