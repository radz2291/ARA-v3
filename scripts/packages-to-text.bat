@echo off
setlocal

:: Get the absolute path to the project directory relative to this script
set "TARGET_DIR=%~dp0.."

if not exist "%TARGET_DIR%\" (
    echo Error: Folder "%TARGET_DIR%" does not exist!
    pause
    exit /b 1
)

echo Running codebase extraction on: %TARGET_DIR%

:: Define output file path
set "OUTPUT_FILE=%~dp0packages_export.txt"

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
echo Done!
pause
