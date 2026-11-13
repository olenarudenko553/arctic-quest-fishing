@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0capture-android-logs.ps1" %*
endlocal
