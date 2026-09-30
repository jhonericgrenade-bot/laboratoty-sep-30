# ScholarTrack – Scholarship Monitoring System

## Run the prototype

1. Open `index.html` in a browser, or use VS Code's **Live Server** extension.
2. The prototype starts with sample scholars. Register a scholar, add a grade submission, verify it, then evaluate compliance.
3. Data is saved only in the current browser using `localStorage`. It remains after refresh.

## Set up Supabase database and security

1. Create a free project at https://supabase.com.
2. Open **SQL Editor**, create a new query, then paste and run `complete_setup.sql`.
3. In **Authentication > Users > Add user**, create a confirmed staff email/password account.
4. Sign in to the website using that staff account.

## Implemented workflow

Register Scholar → Add Grade Submission → Verify Submission → Evaluate Compliance → View Report
