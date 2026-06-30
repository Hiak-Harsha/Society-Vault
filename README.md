# SocietyVault: Cooperative Thrift & Loan Management System

SocietyVault is a modern, secure, and fully automated financial management platform designed for employee cooperative thrift societies and credit unions. It simplifies monthly contributions, automates loan applications and repayment tracking, enforces multi-party witness approvals, and guarantees audit trail integrity using a cryptographic transaction ledger.

## 🚀 Key Features

* **Multi-Tenant Org Setup:** Organizations can register and customize local policies (interest models, multipliers, witness approval thresholds, IP whitelists).
* **Automated Member Directory Sync:** Supports LDAP, SQL, or custom REST API endpoints to import and synchronize members, and automatically deactivate resigned or terminated employees.
* **Structured Contributions:** Seamless monthly contributions with support for modern card gateways (Stripe) and local sandbox UPI/Bank payment methods (Razorpay).
* **Guaranteed Audit Integrity:** A cryptographic hash-chaining transaction ledger (SHA-256 parent block chaining) prevents retrofitted entries and ensures tampering is immediately flagged.
* **Smart Loan Lifecycle:** Members can apply for category-based loans, request peer witnesses, and track disbursement. Admins review applications based on credit caps, cooling periods, and peer endorsements.
* **Real-time Visual Analytics:** Rich dashboard metrics, fund availability tracking, pay grade categorization, and monthly reports.

---

## 📸 Screenshots

![Dashboard Overview](public/dashboard_hero_preview.png)
*Figure 1: High-level dashboard showcasing fund pool summary, active loans, contributions, and key telemetry.*

![Secure Ledger Audit](public/vault_secure_banner.png)
*Figure 2: Security panel for auditing cryptographic ledger health and verifying hash integrity.*

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Next.js 16 (App Router with Turbopack), TailwindCSS
* **Backend:** Next.js Route Handlers
* **Database & ORM:** Prisma ORM with SQLite database
* **Payment Gateways:** Razorpay (with signature verification) and Stripe Elements
* **Security & Auth:** JWT tokens in HttpOnly secure cookies, AES-256-GCM encryption for bank account storage

---

## ⚙️ Environment Variables Setup

Before running the application, create a `.env` file in the root directory. You can copy the template from `.env.example`:

```bash
cp .env.example .env
```

### Required Variables:

* `DATABASE_URL`: Connection string for the database (e.g., `file:./dev.db`).
* `JWT_SECRET`: Secret key used to sign session tokens.
* `ENCRYPTION_KEY`: A 32-character key used to encrypt and decrypt sensitive fields (like bank accounts) in the database.

### Optional Variables (Payment Gateways):

* `STRIPE_SECRET_KEY` & `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Used to process cards via Stripe.
* `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Used to process UPI/NetBanking payments via Razorpay.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations & Generate Prisma Client
```bash
npx prisma generate
npx prisma db push
```

### 3. (Optional) Seed Initial Demo Data
To populate the database with dummy organizations, members, contributions, and loans:
```bash
npm run seed # If seed script is configured, or use: npx tsx prisma/seed.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Continuous Integration & Quality Checks

A GitHub Actions workflow is configured under `.github/workflows/ci.yml` to automatically validate quality on all pushes and pull requests:
* **Linting:** `npm run lint` (runs ESLint configurations)
* **Building:** `npm run build` (ensures Next.js compiling succeeds without typescript errors)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more details.
