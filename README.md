# Athar Ayah — أثر آية

Athar Ayah is a Quran reflection, memorization, review, and spiritual progress web app designed to help users build a consistent relationship with the Qur’an through reading, tadabbur, memorization planning, and reflection circles.

Live App: https://athar-ayah.web.app

---

## Overview

Athar Ayah provides a calm, Arabic-first digital experience for Quran reading, reflection, memorization, and personal spiritual progress tracking.

The app helps users read consistently, save reflections, create memorization plans, review previously memorized passages, track progress, and participate in private reflection circles.

---

## Features

### Quran Reading

- Clean Quran reading interface.
- Daily reading goal support.
- Reading progress tracking.
- Last-read position saving.
- Responsive layout for desktop and mobile.

### Tadabbur Notes

- Save reflections linked to specific surahs and verses.
- Pin important reflections.
- Mark reflections as favorites.
- Search and filter saved notes.
- Edit and delete personal reflections.

### Memorization and Review

- Create memorization plans by surah and verse range.
- Validate verse ranges against the correct surah limits.
- Track review status.
- Review memorized passages using a spaced-review flow.
- Separate review sections for due, upcoming, overdue, and mastered items.

### Progress Dashboard

- Daily progress overview.
- Reading streaks.
- Points and achievement tracking.
- Completed surahs summary.
- Weekly activity insights.
- Suggested next action for continued progress.

### Reflection Circles

- Create private tadabbur circles.
- Join circles using invite codes.
- View circle members.
- Share group reflections.
- Leave joined circles.
- Archive circles owned by the creator.
- Display circle creation date.

### Account and Settings

- User profile settings.
- Reading goal preferences.
- Notification preferences.
- Journey reset option without deleting the user account.
- Authentication-based personal data access.

### Progressive Web App

- Installable web app experience.
- Service worker support.
- Mobile-friendly interface.
- Offline-ready foundation.

---

## Tech Stack

- React
- TypeScript
- Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Firebase Cloud Messaging
- Workbox / PWA
- Tailwind CSS
- Lucide React Icons

---

## Project Structure

athar-ayah/
├── public/
│   ├── icons/
│   └── firebase-messaging-sw.js
├── src/
│   ├── components/
│   │   ├── groups/
│   │   │   ├── GroupPage.tsx
│   │   │   └── GroupsTab.tsx
│   │   ├── ActiveRecitationTab.tsx
│   │   ├── BookmarksTab.tsx
│   │   ├── MemorizationTab.tsx
│   │   ├── NotesTab.tsx
│   │   ├── ProgressPage.tsx
│   │   ├── QuranReader.tsx
│   │   └── SettingsPage.tsx
│   ├── data/
│   ├── services/
│   │   └── firestoreService.ts
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   └── quranUtils.ts
│   ├── App.tsx
│   └── types.ts
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── vite.config.ts
├── package.json
└── README.md

---

## Getting Started

### Prerequisites

- Node.js
- npm
- Firebase CLI

### Installation

npm install

### Environment Variables

Create a local .env.local file based on .env.example.

Do not commit real Firebase credentials, private keys, or local environment files.

### Development

npm run dev

### Production Build

npm run build

---

## Firebase

This project uses Firebase for authentication, database, hosting, messaging, and security rules.

Important Firebase files:

- firebase.json
- firestore.rules
- firestore.indexes.json

Deploy hosting and Firestore rules:

firebase deploy --only hosting,firestore:rules

---

## Quality Checklist

Before deploying a new version:

- Run npm run build.
- Check git status.
- Deploy Firebase Hosting and Firestore rules.
- Sign in and sign out.
- Open the Quran reader.
- Save, pin, edit, and delete a tadabbur note.
- Create a memorization plan with a valid verse range.
- Review progress dashboard updates.
- Create, join, leave, and archive a reflection circle.
- Update settings.
- Test journey reset.
- Refresh the deployed website after deployment.

---

## Deployment

Production URL:

https://athar-ayah.web.app

The app is deployed on Firebase Hosting.

---

## Repository Notes

This repository is structured as a production-ready web application with separated components, Firebase service logic, shared utilities, security rules, and deployment configuration.

Sensitive local files such as .env.local are intentionally excluded from version control.

---

## License

No license has been added yet. Add a license before accepting external contributions.
