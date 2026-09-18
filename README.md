# Darukaa.Earth

Darukaa.Earth is a full-stack geospatial analytics platform for managing carbon and biodiversity projects. The product gives administrators a simple way to create projects, capture polygon-based sites, view them on an interactive map, and track key environmental performance indicators over time.

## High-level architecture

The application is organized into a modular full-stack setup:

- Frontend: React + Vite + Mapbox GL JS + Chart.js
- Backend: Flask REST API with JWT authentication
- Data layer: SQLAlchemy models for users, projects, and sites
- Local database: SQLite for quick setup and testing, with a PostgreSQL/PostGIS-ready schema for production
- CI/CD: GitHub Actions validates backend tests and frontend builds on pushes and pull requests
- Developer experience: Husky and lint-staged enforce formatting and quality checks before every commit

## User stories addressed

- Administrators can register or log in to the platform.
- New projects can be created through a dashboard flow.
- Multiple sites can be attached to a project and stored with polygon geometries.
- The dashboard displays sites on an interactive map and summarizes environmental performance.
- Performance metrics are shown in a clear time-series chart.

## Database schema

The current implementation uses three persistent models:

- User
  - id
  - name
  - email
  - password

- Project
  - id
  - name
  - description
  - status
  - created_at
  - user_id

- Site
  - id
  - name
  - polygon
  - carbon_score
  - biodiversity_score
  - project_id

This schema is intentionally minimal and fits the core requirement of linking users to many projects and projects to many sites. In production, it can be upgraded to PostgreSQL + PostGIS for native geospatial indexing and geometry queries.

## Local setup

### Prerequisites

- Python 3.11 or newer
- Node.js 20+
- npm

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend will run on:

- http://localhost:5000

Available API endpoints:

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/projects
- POST /api/projects

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open the application at:

- http://localhost:5173

### Environment variables

For local and production deployment, the following environment variables should be configured:

```bash
export JWT_SECRET_KEY=your-secret-key
export DATABASE_URL=sqlite:///darukaa.db
export VITE_MAPBOX_TOKEN=your-mapbox-token
```

## CI/CD pipeline

The repo includes GitHub Actions automation in [.github/workflows/ci.yml](.github/workflows/ci.yml) to validate:

- Python dependency installation
- Backend test execution with pytest
- Frontend dependency installation
- Frontend production build with Vite

This gives a reliable check for every push and pull request.

## Code quality and developer workflow

The repository includes pre-commit automation for consistent code quality:

- Husky runs before each commit
- lint-staged formats staged files with Prettier
- Python files are compiled to catch syntax errors early
- Pre-commit hooks also check for trailing whitespace and invalid YAML

Install the Git hooks locally with:

```bash
npm install
npm run prepare
```

## Data choices and rationale

The dashboard uses lightweight demo data rather than a large external dataset so the MVP can focus on product behavior, geospatial mapping, and analytics workflows. That makes the implementation easy to demonstrate and extend while still reflecting real project use cases around carbon capture, biodiversity restoration, and site monitoring.

## Future production improvements

- Switch from SQLite to PostgreSQL + PostGIS for geospatial geometry and faster spatial queries.
- Add site-level time-series data ingestion for historical carbon and biodiversity analytics.
- Add role-based access control, auditing, and project ownership features.
- Deploy the API to Render or Heroku and the frontend to Vercel.
