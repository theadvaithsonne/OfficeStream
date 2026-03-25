@echo off
echo ============================================================
echo   OfficeStream - Downloading Required Installers
echo ============================================================
echo.

:: Create downloads folder
if not exist "%~dp0downloads" mkdir "%~dp0downloads"

:: Check if Node.js is already installed
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js is already installed:
    node --version
    echo.
) else (
    echo [DOWNLOADING] Node.js v20 LTS installer...
    echo This may take a minute...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi' -OutFile '%~dp0downloads\nodejs-v20-installer.msi' -UseBasicParsing"
    if exist "%~dp0downloads\nodejs-v20-installer.msi" (
        echo [DONE] Downloaded: downloads\nodejs-v20-installer.msi
    ) else (
        echo [ERROR] Download failed. Please download manually from https://nodejs.org
    )
    echo.
)

:: Check if Docker is already installed
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker is already installed:
    docker --version
    echo.
) else (
    echo [DOWNLOADING] Docker Desktop installer...
    echo This is ~500MB and may take a few minutes...
    powershell -Command "Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe' -OutFile '%~dp0downloads\DockerDesktopInstaller.exe' -UseBasicParsing"
    if exist "%~dp0downloads\DockerDesktopInstaller.exe" (
        echo [DONE] Downloaded: downloads\DockerDesktopInstaller.exe
    ) else (
        echo [ERROR] Download failed. Please download manually from https://docker.com
    )
    echo.
)

echo ============================================================
echo   Downloads complete! Check the 'downloads' folder.
echo.
echo   NEXT STEPS:
echo   1. Run nodejs-v20-installer.msi  (click Next through wizard)
echo   2. Run DockerDesktopInstaller.exe (click Install, may need restart)
echo   3. Start Docker Desktop
echo   4. Open terminal in the OfficeStream folder and run:
echo        npm install
echo        npm run seed
echo        npm run dev
echo ============================================================
pause
