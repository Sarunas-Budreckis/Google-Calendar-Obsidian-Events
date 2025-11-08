@echo off
REM Clear the debug log file
SET LOG_FILE=%~dp0debug.log

IF EXIST "%LOG_FILE%" (
    del "%LOG_FILE%"
    echo Debug log cleared.
) ELSE (
    echo Debug log does not exist.
)
