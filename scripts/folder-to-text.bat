@echo off
setlocal

set "TARGET_DIR=%~1"

:: Check if a folder was dragged and dropped or passed as an argument
if "%TARGET_DIR%"=="" (
    echo You can drag and drop a folder onto this script to instantly convert it!
    echo.
    set /p "TARGET_DIR=Or type the path of the folder to convert (e.g. ..\packages): "
)

:: Ensure a folder was provided
if "%TARGET_DIR%"=="" (
    echo No folder provided. Exiting.
    pause
    exit /b 1
)

:: Ensure the folder exists
if not exist "%TARGET_DIR%\" (
    echo Error: Folder "%TARGET_DIR%" does not exist!
    pause
    exit /b 1
)

echo.
echo Running codebase extraction on: %TARGET_DIR%

:: Define output file path
set "OUTPUT_FILE=%~dp0folder_export.txt"

:: Run the python extraction script
python "%~dp0extract-text.py" "%TARGET_DIR%" "%OUTPUT_FILE%"

if exist "%OUTPUT_FILE%" (
    echo.
    echo Conversion complete! Opening the file...
    start "" "%OUTPUT_FILE%"
) else (
    echo.
    echo Something went wrong, output file not found!
)

echo.
pause
