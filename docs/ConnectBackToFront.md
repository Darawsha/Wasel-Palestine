# Frontend ↔ Backend Integration Flow

## Goal

Connect the frontend with the existing backend logic and remove all hardcoded values from the frontend.

Start by reviewing the Admin Dashboard logic, then continue connecting the rest of the Admin pages to the backend endpoints.

The frontend should use real API responses instead of static or hardcoded data.
---

## Project Understanding

Before making changes:

1. Read the project structure.
2. Follow the existing architecture.
3. Do not create random files or folders.
4. Follow the existing patterns used in the project.
5. Follow SOLID principles and Separation of Concerns.

Look for already connected features between frontend and backend and use them as references for how files and services are organized.
---

## Workflow

1. Inspect the Admin Dashboard components.
2. Identify hardcoded values.
3. Find the corresponding backend endpoints.
4. Replace hardcoded values with API calls.
5. Ensure the frontend UI works correctly after integration.
6. Continue the same process for the rest of the Admin pages.
---

## Tables

- Tables must support pagination, sorting, and filtering.
- Pagination controls should appear only when the number of rows exceeds the page limit.
- If the number of rows is small, pagination controls should be hidden.
---

## Charts

Charts must support:

- tooltips
- legends
- responsive design
---

## UI Behavior

Interactive UI components should behave properly:

- Modals should support close button, backdrop click, and ESC key.
- Notifications should support close button and auto timeout.
- Dropdowns should close correctly when clicking outside.
- Tooltips should disappear automatically.
---

## Flow

1. Check if a backend endpoint already exists.
2. If not, create a new endpoint in the backend service.
3. The endpoint should return the required statistics.
4. Connect the frontend to the endpoint using fetch or axios.
5. Display the returned data inside the frontend component.

---

## Backend

Endpoint:

GET /users/counts

Example response:

{
  "citizens": 10,
  "citizensChange": 12
}

---

## Frontend

Steps:

1. Create a service to call the API.
2. Fetch the data when the page loads.
3. Store the response in state.
4. Update the dashboard card with the returned values.

---

## Important Rules

- Do not hardcode numbers in the frontend.
- All statistics must come from the backend.
- Handle API errors properly.