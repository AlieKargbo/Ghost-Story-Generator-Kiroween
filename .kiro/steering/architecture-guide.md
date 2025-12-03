# Project Architecture Guide

## Directory Structure
The project must be strictly separated into two root-level directories:
1.  **`backend/`**: Contains all server-side code, including API routes, database models, and service logic. This is typically a Node.js/Express application.
2.  **`frontend/`**: Contains all client-side code, including React/Vue components, styling, and client-side state management.

## Separation of Concerns
* **NEVER** place UI component files (e.g., `.jsx`, `.tsx`, `.vue`) inside the `backend/` directory.
* **NEVER** place server-side logic files (e.g., database connection, API route handlers) inside the `frontend/` directory.
* The AI agent must always place files in the appropriate layer, following the naming conventions outlined below.

## Naming Conventions (Example)
* **Backend Routes:** Must be placed in `backend/routes/` and named to reflect the resource (e.g., `userRoutes.js`).
* **Frontend Components:** Must be placed in `frontend/components/` and named using PascalCase (e.g., `StoryInput.jsx`).