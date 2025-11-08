@echo off
REM View the debug log file
REM Usage: view-log.bat [number of lines]

SET LOG_FILE=%~dp0debug.log

IF NOT EXIST "%LOG_FILE%" (
    echo Debug log file does not exist yet.
    echo Run the template first to generate logs.
    exit /b 1
)

IF "%1"=="" (
    REM No argument - show all logs
    type "%LOG_FILE%"
) ELSE (
    REM Show last N lines (requires PowerShell)
    powershell -Command "Get-Content '%LOG_FILE%' -Tail %1"
)
