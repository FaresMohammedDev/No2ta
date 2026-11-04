param (
    [string]$ServerUrl = ""
)

# No2ta NetSupport Windows Classroom Screen Agent
# Captures full Windows desktop and sends frames to teacher host

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Auto-discover the teacher's server on the LAN instead of relying on a
# hardcoded IP (which breaks the moment the teacher's DHCP lease changes).
# Falls back to the last known-good host, cached in %TEMP%.
function Find-No2taServer {
    $cacheFile = Join-Path $env:TEMP 'no2ta_last_host.txt'
    try {
        $udp = New-Object System.Net.Sockets.UdpClient(5055)
        $udp.Client.ReceiveTimeout = 3000
        $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
        $bytes = $udp.Receive([ref]$remote)
        $udp.Close()
        $json = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
        if ($json.app -eq 'no2ta' -and $json.hostIp) {
            $url = "http://$($json.hostIp):$($json.port)"
            Set-Content -Path $cacheFile -Value $url -Force -Encoding UTF8
            return $url
        }
    } catch { }
    if (Test-Path $cacheFile) { return (Get-Content $cacheFile -Raw).Trim() }
    return $null
}

if (-not $ServerUrl) {
    $discovered = Find-No2taServer
    $ServerUrl = if ($discovered) { $discovered } else { "http://192.168.20.54:5000" }
}

$hostname = $env:COMPUTERNAME
$username = $env:USERNAME
$nickname = "$hostname ($username)"

# Get local IP
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback|VMware' -and $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}
if (-not $localIp) { $localIp = "127.0.0.1" }

# Get MAC Address
$mac = (Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [No2ta NetSupport] Windows Lab Screen Agent is Running!" -ForegroundColor Green
Write-Host " Computer Name: $nickname" -ForegroundColor Yellow
Write-Host " Local IP:      $localIp" -ForegroundColor Yellow
Write-Host " Server URL:    $ServerUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$endpoint = "$ServerUrl/api/netsupport/frame"
$consecutiveFailures = 0

# Quality settings for smooth LAN streaming
$jpegQuality = 55L
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $jpegQuality)

while ($true) {
    try {
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)

        # Scale down to 960x540 for lightweight network traffic
        $scaledWidth = 960
        $scaledHeight = [int]($screen.Height * ($scaledWidth / $screen.Width))
        $scaledBitmap = New-Object System.Drawing.Bitmap($scaledWidth, $scaledHeight)
        $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaledBitmap)
        $scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
        $scaledGraphics.DrawImage($bitmap, 0, 0, $scaledWidth, $scaledHeight)

        $ms = New-Object System.IO.MemoryStream
        $scaledBitmap.Save($ms, $encoder, $encoderParams)
        $bytes = $ms.ToArray()
        $base64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes)

        # Dispose resources
        $ms.Dispose()
        $scaledGraphics.Dispose()
        $scaledBitmap.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()

        # Send to No2ta NetSupport Server
        $safeIpDevId = "dev_" + $localIp.Replace(".", "_")
        $payload = @{
            deviceId     = $safeIpDevId
            computerName = $hostname
            nickname     = $nickname
            ip           = $localIp
            mac          = $mac
            avatar       = "PC"
            role         = "student"
            currentApp   = "Windows Desktop"
            frameBase64  = $base64
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
        $consecutiveFailures = 0

        if ($response -and $response.isLocked) {
            Write-Host "[LOCKED] Screen is locked by Teacher!" -ForegroundColor Red
        }
    }
    catch {
        # Server unreachable — could just be asleep, or the teacher's IP changed.
        # After ~15s of failures, try to re-discover the server on the LAN.
        $consecutiveFailures++
        if ($consecutiveFailures -ge 10) {
            $consecutiveFailures = 0
            $rediscovered = Find-No2taServer
            if ($rediscovered -and $rediscovered -ne $ServerUrl) {
                $ServerUrl = $rediscovered
                $endpoint = "$ServerUrl/api/netsupport/frame"
                Write-Host "[RECONNECT] Teacher server moved, now using: $ServerUrl" -ForegroundColor Cyan
            }
        }
    }

    Start-Sleep -Milliseconds 1500
}
