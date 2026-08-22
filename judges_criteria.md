# CivicLens – Judges Evaluation & Grading Guide

This document outlines how **CivicLens** satisfies the hackathon evaluation criteria across each grading dimension.

---

## 🏆 Summary of Evaluation Weights

| Criterion | Weight | Key Project Alignment |
| :--- | :---: | :--- |
| **Innovation & Creativity** | **30%** | Multi-Agent AI Chain, Automated Vision Check, Spatial GPS validation. |
| **Technical Implementation** | **25%** | React & TS Frontend, Supabase Real-time DB, Dual fallback local storage architecture. |
| **Problem Relevance** | **20%** | Grievance resolution for Indore Municipal Corp (IMC), spam reduction, division of labor. |
| **User Experience & Design** | **10%** | Fluid glassmorphism UI, theme toggling, simplified mobile reporting wizard. |
| **Scalability & Impact** | **15%** | Multi-city scalability, geographical hotspot clustering, automated dispatch guidelines. |

---

## 💡 1. Innovation & Creativity (30%)
CivicLens goes beyond standard form-based complaint portals by introducing a **Multi-Agent AI Verification Pipeline**:
* **Autonomous Vision Agent:** Instantly reviews photo evidence using vision LLMs to confirm if the image matches the selected category (e.g. validating if a "water work" complaint actually contains water pooling).
* **Metadata GPS Verification:** Automatically cross-references device-reported coordinates with Nominatim Geocoder lookup to confirm the reporter was physically present at the scene.
* **Risk Categorization Engine:**
  * **Low Risk:** Bypasses manual verification, routing directly to the active complaint log.
  * **Medium Risk:** Routed to the **AI Verification Queue** for quick human officer approval.
  * **High Risk (Suspicious):** Automatically rejected client-side to filter spam instantly.

---

## ⚙️ 2. Technical Implementation (25%)
A production-ready stack designed for low latency and high consistency:
* **Frontend:** React 18, TypeScript, and Vite for fast compile times and robust type-safety.
* **Backend Database:** Supabase Postgres client utilizing real-time socket connections.
* **Dual-Store Synchronization:** Solves database row size overheads by storing lightweight references in Supabase while preserving full image payloads in the browser's local store.
* **Multilingual Routing:** Custom dynamic script loader that integrates Google Translate for major Indian languages, styled as a premium glassmorphic pill dropdown.
* **Deduplication Engine:** Runtime hashing of category/location/description combinations to automatically clean duplicate submissions.

---

## 🎯 3. Problem Relevance (20%)
CivicLens targets Indore Municipal Corporation (IMC)'s most pressing civic challenges:
* **Spam Mitigation:** Standard municipal apps suffer from up to 40% duplicate/fake complaints. CivicLens solves this programmatically.
* **Officer Workflow Optimization:** Real-time dashboard separates pending verifications from active complaints.
* **SLA Priority Engine:** Fire and critical safety reports are flagged instantly as `CRITICAL` with direct field-staff assignments.

---

## 🎨 4. User Experience & Design (10%)
Designed for high user retention and simplicity:
* **Modern Aesthetic:** Curated dark mode theme with glassmorphic cards, harmonized accent borders, and clean typography.
* **Seamless Reporting Wizard:** Citizens can file complaints in 3 simple steps: snap a photo, enter details, submit.
* **Quick-Action Panel:** Officers can verify, accept, reject, or delete complaints with single-click actions directly in the table row.

---

## 📈 5. Scalability & Impact (15%)
Built to scale dynamically across multiple municipalities:
* **Multi-City Tenant Readiness:** Engineered using location-agnostic geocoding (Nominatim OpenStreetMap) and dynamic database routing. The system can scale instantly to any other Indian city (e.g. Bhopal, Mumbai, Delhi) simply by pointing the instance to the city's respective coordinate boundaries.
* **Zero-Cold Start Infrastructure:** Utilizing Postgres database with optimized triggers.
* **Hotspot Clustering:** Spatial clustering algorithm automatically bundles nearby complaints into a "Major Cluster" when density increases, allowing teams to treat multiple individual reports as a single coordinated dispatch.
* **Crew Dispatch Automation:** Suggests step-by-step guidelines for ground crews directly in the officer panel to minimize field coordination time.

