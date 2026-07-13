@echo off
REM Runs the PrepPal backend from Command Prompt (delegates to run.ps1).
REM Usage: double-click this file, or in cmd type:  run.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
