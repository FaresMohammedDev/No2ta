param (
    [string]$ServerUrl = "http://192.168.20.54:5000"
)

# No2ta NetSupport Windows Classroom Screen Agent
# Captures full Windows desktop and sends frames to teacher host

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

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
        $payload = @{
            deviceId    = "agent_$hostname"
            nickname    = $nickname
            ip          = $localIp
            mac         = $mac
            avatar      = "PC"
            role        = "student"
            currentApp  = "Windows Desktop"
            frameBase64 = $base64
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue

        if ($response -and $response.isLocked) {
            Write-Host "[LOCKED] Screen is locked by Teacher!" -ForegroundColor Red
        }
    }
    catch {
        # Server unreachable or sleeping, retry
    }

    Start-Sleep -Milliseconds 1500
}
