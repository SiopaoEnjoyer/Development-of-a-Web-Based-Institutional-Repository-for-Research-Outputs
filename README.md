# BTCSI Institutional Repository for Research Outputs

A web-based Institutional Repository (IR) system developed for **Bacolod Trinity Christian School, Inc. (BTCSI)**, designed to centralize, preserve, and provide organized access to Senior High School student research outputs.

> Developed as a Final Capstone Research Paper as a requirement for Inquiries, Investigations, and Immersion (3I's) on March 2026 by Lanz Arthur B. Gaurana, Sean David F. Lelis, Stephanie Joy P. Nemenzo, Lloyd Ruzel G. Pabon, J Ryl M. Sorbito, and Charles Lebron C. Sta. Ana.

---

## Overview

Prior to this system, BTCSI had no centralized digital archive for SHS research outputs. Students had to rely on limited physical copies or personal requests to access past studies — making research retrieval difficult, disorganized, and unsustainable.

This IR addresses that gap by providing a publicly accessible, searchable, role-differentiated repository that protects student privacy while making completed research outputs available to the BTCSI academic community.

<p>Production URL: https://btcsirepository.onrender.com/ </p>

----

## Features

### Public Interface
- Browse research titles, abstracts, and metadata without an account
- Search and filter by **title, author, year, strand, research design, and keywords**
- Advanced search with AJAX-powered filtering
- Automatic **APA 7th edition citation generator** on each research detail page
- Responsive design (desktop, tablet, mobile) built with Bootstrap 5

### Authentication & Security
- **Email-based One-Time Password (OTP)** verification for login, registration, and password reset
- **Google reCAPTCHA** on the registration page
- **Account approval workflow** — administrators review and approve/deny new accounts before access is granted
- **Role-Based Access Control (RBAC)** with differentiated permissions per user role
- **Django-ratelimit** protection: IndexView/SearchView capped at 100 req/hr, DetailView at 60 req/hr per IP
- HTTPS/TLS encryption for all data in transit
- Custom error pages: 404, 403 (Access Denied), 429 (Too Many Requests)

### User Roles & Dashboards

The system features five role-differentiated dashboards:

| Role | Permissions |
|---|---|
| **Guest** | Browse titles, abstracts, and metadata |
| **Student / Alumni** | Browse, search, and download approved research PDFs; manage name visibility consent |
| **Research Teacher** | Upload and manage finalized research papers; review consent forms |
| **Non-Research Teacher** | Browse repository; approve parental consent forms for minor students |
| **Admin** | Full user management (approve/deny accounts, edit user info); all teacher capabilities |

### Privacy & Consent System
- **Student name-visibility consent** — students control whether their full name is publicly displayed
- **Parental consent workflow** for minor student authors, reviewed and approved by non-research teachers
- Consent status governs how author names appear across the repository

### Research Management
- Upload research papers as PDFs with structured metadata (title, authors, keywords, strand, year, research design, awards)
- Manage authors, keywords (with usage count tracking), and awards through dedicated dashboards
- Keyword and author linking to research entries with many-to-many relationships

### Email Notifications
- OTP emails for login, registration, and password reset
- Account approved/denied notification emails

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Django 5.2.6 (MVT architecture) |
| **Frontend** | Bootstrap 5, JavaScript, AJAX |
| **Database** | SQLite (development), PostgreSQL via Neon (production) |
| **File Storage** | Supabase (PDF research documents and consent forms) |
| **Deployment** | Render |
| **Email** | Brevo via `sib-api-v3-sdk` (transactional email) |
| **Security** | Django-ratelimit, Google reCAPTCHA, HTTPS/TLS |

---

## Dependencies

Key packages used in this project:

| Package | Version | Purpose |
|---|---|---|
| Django | 5.2.6 | Web framework |
| supabase | 2.27.2 | Cloud file storage for PDFs and consent forms |
| psycopg2-binary | 2.9.11 | PostgreSQL database adapter |
| dj-database-url | 3.1.0 | Database URL configuration |
| django-ratelimit | 4.1.0 | Rate limiting for public endpoints |
| django-recaptcha | 4.1.0 | Google reCAPTCHA integration |
| gunicorn | 23.0.0 | WSGI HTTP server for deployment |
| whitenoise | 6.11.0 | Static file serving |
| sib-api-v3-sdk | 7.6.0 | Brevo transactional email |
| python-decouple | 3.8 | Environment variable management |
| pillow | 12.1.0 | Image processing |
| cryptography | 46.0.3 | Cryptographic operations |
| PyJWT | 2.10.1 | JSON Web Token support |
| httpx | 0.28.1 | HTTP client |
| psutil | 5.9.6 | System and process utilities |

For the full list of dependencies, see [`requirements.txt`](./requirements.txt).

---

## Project Structure

```
├── G12Research/        # Project settings and configuration
├── accounts/           # User authentication, roles, and account management
├── research/           # Research paper models, views, search, and metadata
├── templates/          # HTML templates (Django MVT)
├── manage.py
├── requirements.txt
├── build.sh
├── render.yaml         # Render deployment config
├── gunicorn_config.py
└── storage.py          # Supabase storage integration
```

---

## Getting Started

### Prerequisites
- Python v3.11.4+
- Django v5.2.6+

### Local Setup

```bash
# Clone the repository
git clone https://github.com/SiopaoEnjoyer/Development-of-a-Web-Based-Institutional-Repository-for-Research-Outputs.git
cd Development-of-a-Web-Based-Institutional-Repository-for-Research-Outputs

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Run the development server
python manage.py runserver
```

> **Note:** You will need to configure environment variables for Neon PostgreSQL, Supabase, Brevo, and Google reCAPTCHA for full functionality. A `.env` template is recommended.

---

## Evaluation Results

The system was evaluated by 17 BTCSI students, teachers, and IT staff using the **System Usability Scale (SUS)** and the **User Experience Questionnaire Short Version (UEQ-S)**.

| Metric | Score | Rating |
|---|---|---|
| SUS Mean Score | **86.18 / 100** | Grade A — Excellent |
| UEQ-S Pragmatic Quality | **2.53 / 3.0** | Excellent |
| UEQ-S Hedonic Quality | **2.38 / 3.0** | Excellent |

Participants consistently cited the **centralized access, search, and filtering functions** as the system's most meaningful contributions.

---

## License

This project was developed as a capstone research output for Bacolod Trinity Christian School, Inc. All rights reserved by the respective authors.
