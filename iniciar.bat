@echo off
setlocal

cd /d "%~dp0"

echo Actualizando el proyecto desde GitHub (rama jox)...
git checkout jox
git pull origin jox

cd dashboard-template

echo Instalando dependencias...
call npm install

echo Iniciando el servidor...
call npm run dev

pause
