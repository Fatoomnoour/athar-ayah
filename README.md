# Athar Ayah — أثر آية

<div align="center" dir="rtl">
تطبيق قرآني متكامل صُمم ليكون رفيقك في التدبر، الحفظ، وتتبع الورد اليومي.
</div>

Live App: https://athar-ayah.web.app

---

## 🌟 Overview / نظرة عامة

Athar Ayah helps users build a consistent relationship with the Quran through reading progress, tadabbur notes, memorization plans, review sessions, and private reflection circles.

أثر آية يساعد المستخدمين على بناء علاقة مستمرة مع القرآن الكريم من خلال تتبع القراءة، تدوين خواطر التدبر، خطط الحفظ، جلسات المراجعة، وحلقات التدبر الخاصة.

## ✨ Highlights / الميزات الرئيسية

| Area | Features |
|---|---|
| **Quran Reading** | Daily goal, last-read position, responsive reader |
| **Tadabbur Notes** | Reflections, pinning, favorites, search, edit and delete |
| **Memorization** | Verse-range plans, validation, spaced review flow |
| **Reflection Circles** | Create, join, leave, archive, and share reflections |
| **Progress** | Streaks, points, weekly summary, suggested next action |
| **Settings** | Profile, goals, notifications, safe journey reset |

## 🛠️ Tech Stack / التقنيات المستخدمة

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Lucide Icons
- **Backend & Auth:** Firebase (Authentication, Cloud Firestore, Hosting)
- **PWA:** Vite PWA Plugin, Workbox

## 🚀 Run Locally / كيفية التشغيل محلياً

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
Fill in your Firebase project details in `.env.local`. See `README_FIREBASE_SETUP.md` for detailed instructions.

### 3. Start Development Server
```bash
npm run dev
```

## 📦 Build / البناء
```bash
npm run build
```

## 🚀 Deploy / النشر
```bash
firebase deploy --only hosting,firestore:rules
```

## 🤝 Contributing / المساهمة
نرحب بجميع المساهمات! يرجى قراءة [دليل المساهمة (CONTRIBUTING.md)](CONTRIBUTING.md) قبل فتح Pull Request.

## 🔒 Security / الأمان
- Local environment files are excluded from version control.
- Firestore rules are versioned in `firestore.rules`.
- No private secrets are committed to the repository.

## 📊 Status
Production-ready MVP deployed on Firebase Hosting.
