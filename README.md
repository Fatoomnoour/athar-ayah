# Athar Ayah — أثر آية

Quran reflection, memorization, review, and progress tracking web app.

Live App: https://athar-ayah.web.app

---

## Overview

Athar Ayah helps users build a consistent relationship with the Quran through reading progress, tadabbur notes, memorization plans, review sessions, and private reflection circles.

## Highlights

| Area | Features |
|---|---|
| Quran Reading | Daily goal, last-read position, responsive reader |
| Tadabbur Notes | Reflections, pinning, favorites, search, edit and delete |
| Memorization | Verse-range plans, validation, spaced review flow |
| Reflection Circles | Create, join, leave, archive, and share reflections |
| Progress | Streaks, points, weekly summary, suggested next action |
| Settings | Profile, goals, notifications, safe journey reset |

## Tech Stack

React · TypeScript · Vite · Firebase Auth · Cloud Firestore · Firebase Hosting · PWA · Tailwind CSS

## Run Locally

npm install
npm run dev

## Build

npm run build

## Deploy

firebase deploy --only hosting,firestore:rules

## Security

- Local environment files are excluded from version control.
- Firestore rules are versioned in firestore.rules.
- No private secrets are committed to the repository.

## Status

Production-ready MVP deployed on Firebase Hosting.
