# Workflow360

## Overview

Workflow360 is a full-stack workforce management application built with a React/Vite frontend and an Express/MongoDB backend. It is designed to support multiple user roles—Admin, Employee, Manager, and Freelancer—by providing a unified interface for attendance, leave management, payroll, tasks, timesheets, invoices, and performance tracking.

## Problem Statement

Many small and medium organizations still rely on multiple disconnected tools, email, and spreadsheets for managing staff, contractors, approvals, payroll and project work. This causes:

- poor visibility into employee and freelancer activity
- delays in leave approvals and payroll processing
- scattered task assignments and performance data
- manual reconciliation of timesheets and invoices
- lack of centralized reporting and auditing

Workflow360 solves this by offering one integrated system for workforce operations, approval workflows, and productivity tracking.

## Why this project matters

This project demonstrates practical skills in building a complete web application with real-world workflow requirements. It is suitable for a BSc CSIT final year project because it covers:

- full-stack development
- user authentication and role-based access control
- database modeling with MongoDB
- REST API design
- responsive UI and multi-role user experience
- real application domains: HR, payroll, attendance, freelancing, project work

## Key Features

- User authentication and secure access per role
- Admin dashboard for people, payroll, projects, and performance
- Employee portal for leave requests, tasks, payslip viewing, and timesheets
- Manager portal for leave approvals, employee management, performance review, and payroll oversight
- Freelancer portal for projects, tasks, timesheets, and invoice management
- Document uploads and PDF generation for reports
- Data seeding utility for demo content

## Architecture

- `backend/`
  - `server.js` — Express server entry point
  - `routes/` — API route definitions
  - `controllers/` — request handling and business logic
  - `models/` — Mongoose schemas for data storage
  - `middleware/` — authentication and error handling
  - `services/` — reusable backend helper services

- `frontend/`
  - React + Vite project
  - `src/pages/` — role-specific and shared pages
  - `src/layouts/` — layout wrappers for each user role
  - `src/components/` — shared UI components
  - `src/services/api.js` — frontend API integration
  - `src/utils/` — helper utilities

## Installation

### Backend

1. Open a terminal in `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Open a terminal in `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm run dev
   ```

## Development Notes

- The backend uses MongoDB for data persistence.
- The frontend uses React Router for role-based routing and protected pages.
- The project is structured to keep controllers, routes, and models separate for easier maintenance and scaling.



