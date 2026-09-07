@echo off
start "FamilyBudget - Backend" cmd /k "cd /d C:\Users\TNP\Desktop\123\family-budget\backend && python -m uvicorn app.main:app --reload --port 8000"
start "FamilyBudget - Frontend" cmd /k "cd /d C:\Users\TNP\Desktop\123\family-budget\frontend && npm run dev"
