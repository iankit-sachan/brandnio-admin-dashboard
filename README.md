# Brandnio — Complete Branding Suite

> **All-in-one branding platform** for Indian small businesses. Create professional posters, videos, business cards, WhatsApp stickers, and more — powered by AI tools and a curated template library.

[![Android](https://img.shields.io/badge/Android-Kotlin-green?logo=android)](android/)
[![Backend](https://img.shields.io/badge/Backend-Django_REST-blue?logo=django)](backend/)
[![Admin](https://img.shields.io/badge/Admin-React_TS-purple?logo=react)](Web%20Brandnio/)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Android App](#android-app)
- [Backend (Django REST API)](#backend-django-rest-api)
- [Admin Dashboard (React)](#admin-dashboard-react)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Architecture Overview

```
┌─────────────────┐     HTTPS/JSON      ┌─────────────────────┐
│  Android App    │ ◄──────────────────► │  Django REST API    │
│  (Kotlin/MVVM)  │                      │  (Gunicorn + Nginx) │
└─────────────────┘                      └──────────┬──────────┘
                                                    │
┌─────────────────┐     HTTPS/JSON      ┌───────────▼──────────┐
│  Admin Dashboard│ ◄──────────────────► │  PostgreSQL + Redis  │
│  (React/Vite)   │                      │  Celery Workers      │
└─────────────────┘                      └──────────────────────┘
                                                    │
                                         ┌──────────▼──────────┐
                                         │  Firebase Auth      │
                                         │  Razorpay Payments  │
                                         │  AWS S3 (Media)     │
                                         └─────────────────────┘
```

**Three layers, one codebase:**

| Layer | Directory | Stack |
|-------|-----------|-------|
| Mobile App | `android/` | Kotlin, MVVM, Hilt, Jetpack Navigation, Retrofit |
| REST API | `backend/` | Python, Django 4.2, DRF, PostgreSQL, Celery, Redis |
| Admin Panel | `Web Brandnio/` | React 18, TypeScript, Vite, TailwindCSS |

---

## Android App

### Tech Stack

| Layer | Technology |
|---|---|
| Language | Kotlin (JVM target 17) |
| Architecture | MVVM (ViewModel + LiveData) |
| Dependency Injection | Hilt 2.50 (Dagger) |
| Navigation | Jetpack Navigation Component 2.7.7 |
| View Binding | ViewBinding (enabled via buildFeatures) |
| Networking | Retrofit 2.9.0 + OkHttp 4.12.0 + Gson converter |
| Image Loading | Glide 4.16.0 |
| Payments | Razorpay Checkout 1.6.33 |
| Local Storage | Room 2.6.1 |
| Authentication | Firebase Auth (Google Sign-In + SMS OTP) |
| Push Notifications | Firebase Cloud Messaging |
| Animations | Lottie 6.3.0, Shimmer 0.5.0 |
| Video Playback | Media3 ExoPlayer 1.2.1 |
| QR Code | ZXing Android Embedded 4.3.0 |
| Ads | Google AdMob 23.0.0 |
| Async | Kotlin Coroutines 1.7.3 |
| Min SDK | 24 (Android 7.0) · Target/Compile SDK 34 |

### Project Structure

```
app/src/main/java/com/brandnio/app/
├── BrandnioApp.kt              # Application class (Hilt entry point)
├── data/
│   ├── model/                  # 50+ Kotlin data classes
│   ├── remote/
│   │   ├── BrandnioApi.kt      # Retrofit service interface
│   │   └── interceptor/        # Auth / logging interceptors
│   ├── repository/             # Repository layer
│   └── local/                  # Room DAOs and database
├── di/                         # Hilt modules (App, Network, Database)
├── service/                    # Firebase Messaging service
├── ui/
│   ├── splash/                 # Splash screen
│   ├── auth/                   # Login / OTP / Google Sign-In
│   ├── main/                   # MainActivity + bottom nav host
│   ├── home/                   # Home feed + adapters
│   ├── category/               # Category browser
│   ├── create/                 # Create tab + My Designs
│   ├── visitcard/              # VbizCard (digital visiting cards)
│   ├── menu/                   # Menu navigation hub
│   ├── business/               # Business profile + card editor
│   ├── aitools/                # AI Tools hub + 7 sub-tools
│   ├── subscription/           # Subscription plans + Razorpay
│   ├── editor/                 # Poster / canvas editor
│   ├── reels/                  # AI Reels (ExoPlayer)
│   ├── caption/                # Caption templates
│   ├── logomaker/              # Logo maker
│   └── ...                     # 20+ more feature modules
└── util/                       # Extensions, helpers, constants
```

### Key Features

#### Bottom Navigation (5 Tabs)
- **Home** — Aggregated feed: banners, festivals, template sections, for-you categories, reels preview
- **Category** — Browse all template categories, drill into template lists
- **Create** — Canvas preset picker, tool grid, My Designs library
- **VbizCard** — Digital visiting card creation with premium templates
- **Menu** — Navigation hub: Business Profile, Subscriptions, AI Tools, Settings, etc.

#### AI Tools (7 Sub-tools)

| Tool | Description |
|---|---|
| AI Poster Generator | Generate posters with AI |
| Background Remover | Remove image backgrounds |
| AI Photo Generator | AI-powered photo generation |
| Photo Enhancer | Enhance photo quality |
| Face Swap | Swap faces in photos |
| Caption Generator | AI caption suggestions |
| Hashtag Generator | Smart hashtag recommendations |

#### Remove Background Flow (4 Screens)
```
Remove Background → Buy Credits → [Non-Premium Dialog] → Premium Plans → Plan Detail → Razorpay
```

1. **Buy Credits** — Banner carousel + credit plans (10/25/100/200/500/1000 credits)
2. **Non-Premium Dialog** — Gate: "Update to pro to buy this plan" (Cancel | Buy Now)
3. **Premium Plans** — 2×2 festive card grid (1Y Limited ₹1996, 1Y Unlimited ₹2496, 3Y Unlimited ₹5396, Monthly ₹346)
4. **Plan Detail** — Countdown timer, feature comparison table, gift section, benefit banners, FAQ accordion, testimonials, WhatsApp/Call support, sticky Buy Now

### Build & Install

```bash
# Debug APK
cd android/
./gradlew assembleDebug

# Install via ADB
adb install app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires signing config)
./gradlew assembleRelease
```

---

## Backend (Django REST API)

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.12 |
| Web Framework | Django 4.2.9 |
| API Layer | Django REST Framework 3.14.0 |
| Database | PostgreSQL (psycopg2-binary 2.9.9) |
| Authentication | Firebase Admin SDK 6.4.0 + SimpleJWT 5.3.1 |
| Payments | Razorpay >= 1.4.2 |
| Task Queue | Celery 5.3.6 |
| Cache / Broker | Redis 5.0.1 + django-redis >= 5.4.0 |
| AI / ML | OpenAI 1.12.0, rembg >= 2.0.55 (background removal) |
| Media Processing | Pillow 10.2.0, ffmpeg-python 0.2.0 |
| Static Files | WhiteNoise 6.6.0 |
| Admin UI | django-jazzmin 2.6.0 |
| WSGI Server | Gunicorn 21.1.0 |
| Testing | pytest 8.0.0, pytest-django 4.8.0 |

### Django Apps

```
backend/
├── brandnio_backend/       # Project settings, root urls, wsgi/asgi
├── accounts/               # User auth, Firebase token exchange, profiles
├── admin_api/              # Internal admin-facing API endpoints
├── ai_tools/               # AI-powered tools (BG removal, text generation)
├── content/                # General content management
├── credits/                # Credit balance, purchase plans, Razorpay transactions
├── greetings/              # Greeting card templates
├── notifications/          # Push notifications (Firebase FCM)
├── posters/                # Poster templates, festivals, categories
├── product_ads/            # Product advertisement creatives
├── reels/                  # Reel/video templates
├── services/               # Business service listings
├── stickers/               # WhatsApp sticker packs
├── subscriptions/          # Subscription plans and lifecycle
└── visitcards/             # Digital business card templates
```

### Key API Endpoints

All routes prefixed with `/api/`.

| Prefix | Description |
|--------|-------------|
| `api/auth/` | Registration, login, Firebase token exchange |
| `api/posters/` | Poster template listing and detail |
| `api/festivals/` | Festival-specific poster templates |
| `api/categories/` | Poster categories |
| `api/ai/` | AI tool endpoints (BG removal, etc.) |
| `api/subscriptions/` | Plan listing, purchase, verification |
| `api/credits/` | Credit balance, plans, purchase, verify |
| `api/services/` | Business service templates |
| `api/notifications/` | FCM device registration, push dispatch |
| `api/reels/` | Reel templates |
| `api/greetings/` | Greeting card templates |
| `api/stickers/` | WhatsApp sticker packs |
| `api/product-ads/` | Product ad templates |
| `api/visitcards/` | Digital business card templates |
| `api/admin/` | Admin management endpoints |

#### Credits Endpoints (`api/credits/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/balance/` | Required | User's credit balance |
| POST | `/purchase/` | Required | Initiate Razorpay credit purchase (402 if no premium) |
| POST | `/verify-purchase/` | Required | Verify Razorpay payment |
| GET | `/plans/` | Public | Active credit plans |
| GET | `/banners/` | Public | Promotional banners |
| GET | `/bg-config/` | Public | BG removal tool config |
| GET | `/faqs/` | Public | FAQ items |
| GET | `/testimonials/` | Public | Video testimonials |

### Key Database Models

**`SubscriptionPlan`** — Admin-managed subscription tiers with 14+ fields: price, original price, duration, credits, feature flags (WhatsApp stickers, desktop access, audio jingles), countdown timer, gift description.

**`Subscription`** — User's active subscription tied to Razorpay order. Status flow: `created → authorized → captured → active → expired`.

**`CreditPlan`** / **`CreditTransaction`** — Credit purchase plans and immutable transaction ledger.

**`BgRemovalFaq`** / **`BgRemovalTestimonial`** / **`BgRemovalBanner`** — CMS models for the Remove Background screen, manageable from Admin Dashboard.

### Run Locally

```bash
cd backend/
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## Admin Dashboard (React)

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 8 |
| Styling | TailwindCSS 4 |
| Routing | React Router DOM 6 |
| HTTP Client | Axios |
| Charts | Recharts |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |

### Project Structure

```
Web Brandnio/
├── src/
│   ├── App.tsx                  # Root router with lazy-loaded pages
│   ├── components/
│   │   ├── layout/              # AdminLayout, Sidebar, Header
│   │   ├── ui/                  # Toast, LoadingSpinner, ErrorBoundary
│   │   └── forms/               # Reusable form components
│   ├── pages/                   # 50+ admin pages (lazy-loaded)
│   ├── services/
│   │   ├── api.ts               # Axios base instance
│   │   └── admin-api.ts         # All typed CRUD endpoint wrappers
│   ├── context/                 # Auth + Toast providers
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript definitions
```

### Sidebar Sections

| Section | Pages |
|---|---|
| **MAIN** | Dashboard |
| **USERS** | All Users, Active Plans, Expired Plans, Business Profiles, Political Profiles |
| **POSTERS** | Home Sections, Banners, All Posters, Festival/Frame/Business Posters, Create Tools, Canvas Presets, Video Categories/Templates |
| **FESTIVALS** | Festival List, Greeting Categories, Greeting Templates |
| **VBIZ CARD** | VC Categories, VC Templates, VC Home Sections |
| **MEDIA & ADS** | Reel Monitor, Music Tracks, Ad Templates, Generated Ads, Sticker Packs |
| **COMMUNICATION** | Communication Center, Notifications |
| **CONTENT** | Tutorials, Contact Inbox, Partner Inbox, Policies, Mall Moderation |
| **BG REMOVAL** | Credit Plans, FAQs, Testimonials |
| **SETTINGS** | AI Dashboard, Subscriptions, Plans, Taglines, Payment Plans, Watermark, Design Settings |

### API Integration

Generic `crud<T>(resource)` factory generates typed `list`, `get`, `create`, `update`, `delete` methods for each resource at `/api/admin/{resource}/`.

40+ CRUD resource APIs including: `usersApi`, `postersApi`, `festivalsApi`, `plansApi`, `subscriptionsApi`, `bgRemovalCreditsApi`, `bgRemovalFaqsApi`, `bgRemovalTestimonialsApi`, and many more.

### Run Locally

```bash
cd "Web Brandnio/"
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
```

---

## Deployment

### Backend (AWS EC2)

| Item | Detail |
|------|--------|
| Server | AWS EC2 (Ubuntu), IP: `13.203.77.238` |
| App root | `/home/brandnio/backend/` |
| WSGI | Gunicorn (systemd: `brandnio.service`) |
| Reverse Proxy | Nginx (SSL termination) |
| Task Worker | Celery (systemd: `brandnio-celery.service`) |
| Database | PostgreSQL |
| Cache/Broker | Redis |

```bash
# SSH into server
ssh -i Brandnio.pem ubuntu@13.203.77.238

# Deploy updates
sudo -u brandnio /home/brandnio/backend/venv/bin/python manage.py migrate
sudo systemctl restart brandnio
sudo systemctl restart brandnio-celery
```

### Android

```bash
# Build and install debug APK
cd android/
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Admin Dashboard

Served as static files via Nginx after `npm run build`.

---

## Environment Variables

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `FIREBASE_CREDENTIALS` | Path to Firebase service account JSON |
| `OPENAI_API_KEY` | OpenAI API key for AI tools |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket for media uploads |

### Android (`local.properties`)

| Variable | Description |
|----------|-------------|
| `RELEASE_STORE_FILE` | Keystore file path |
| `RELEASE_STORE_PASSWORD` | Keystore password |
| `RELEASE_KEY_ALIAS` | Signing key alias |
| `RELEASE_KEY_PASSWORD` | Signing key password |

---

## License

Proprietary. All rights reserved.
