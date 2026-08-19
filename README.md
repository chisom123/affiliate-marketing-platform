# Affiliate Marketing Platform

Affiliate marketing platform with a complete conversion funnel. Partners share links, viewers rate stories, enter phone numbers to unlock bonus content, and sign up as recruits. Includes admin dashboard for performance tracking and payout management using Wise/PayPal.

---

## 📱 Overview

This platform powers the affiliate program for the photo competition app. Affiliates create links, share them on Instagram Stories, and earn money when their friends rate the story. Viewers who rate the story are given points they can redeem in the main app's global leaderboard.

---

## 🛠️ Tech Stack

- **React** – Frontend
- **Firebase** – Auth, Firestore, Cloud Functions, Storage
- **Wise / PayPal** – Manual payout processing via admin dashboard
- **PostHog** – Analytics

---

## ✨ Key Features

### User-Facing Pages
- **Rate page** – Rate the affiliate's story 1-5 stars
- **Phone entry page** – Enter phone number to view a bonus photo (conversion event)
- **Recruit signup page** – Sign up as a new affiliate through an existing affiliate's link

### Admin Dashboard
- Track affiliate performance and conversion rates
- Generate Wise CSV exports for batch payouts
- Manage payouts via Wise/PayPal
- View funnel analytics

### Backend (Cloud Functions)
- **`submitRating`** – Processes ratings, awards points, tracks earnings
- **`processGlobalPayouts`** – Identifies affiliates with $5+ earnings, generates Wise CSV
- **`claimWinCode`** – Bridges web ratings to the iOS app via claim codes
- **`downloadWiseCSV`** – Exports CSV for Wise batch uploads
- **`completePayouts`** – Marks payouts as completed and notifies affiliates

---

## 🏗️ Architecture

Built on a **Firebase-first** backend:

- **Firestore** – Stores affiliate data, ratings, link stats, and tracking events
- **Cloud Functions** – Serverless logic for payout generation, CSV export, and win code claims
- **Firebase Auth** – Authentication for admin dashboard
- **PostHog** – Product analytics for tracking funnel performance

---

## 📸 Screenshots

| Admin Dashboard | Rate Page |
|-----------------|-----------|
| <img width="300" alt="Admin Dashboard" src="https://github.com/user-attachments/assets/99a1f54e-f173-44f3-88a1-031efc942e17" /> | <img width="300" alt="Rate Page" src="https://github.com/user-attachments/assets/020a159e-7d47-48ee-8bec-b09cd6b1c40a" /> |

---

## 🔗 Related Repos

- [Photo Competition iOS App](https://github.com/chisom123/photo-competition-ios) – Main app where users compete and earn points
- [Affiliate Partner App (iOS)](https://github.com/chisom123/affiliate-partner-ios) – iOS app for affiliates to manage campaigns, track earnings, and view their dashboard
- [Admin Dashboard](https://github.com/chisom123/competition-admin-dashboard) – React admin dashboard for managing competitions, users, and payouts (separate from this platform)

---

## ⚙️ Setup

This project uses Firebase. To run it locally:

1. Clone the repo  
2. Create a Firebase project and enable Auth, Firestore, and Cloud Functions  
3. Add your Firebase config to the environment variables  
4. Run `npm install` and `npm start`

---

## 📈 Evolution

Originally built as a simple affiliate dashboard, this platform evolved into a complete marketing funnel—handling everything from link creation to conversion tracking, recruit signups, and batch payout management via Wise CSV exports.
