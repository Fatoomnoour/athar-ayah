# إعداد Firebase لتطبيق أثر آية

لكي يعمل تطبيق "أثر آية" بشكل كامل مع قاعدة البيانات ونظام المصادقة (Authentication)، اتبع الخطوات التالية:

## 1. إنشاء المشروع في Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/).
2. اضغط على **Add project** (أضف مشروع).
3. أدخل اسم المشروع (مثلاً: `athar-ayah`).
4. فعّل Google Analytics إذا كنت ترغب بتتبع الاستخدام، ثم أكمل إنشاء المشروع.

## 2. إضافة تطبيق ويب (Web App)
1. من لوحة تحكم المشروع (Project Overview)، اضغط على أيقونة **الويب `</>`**.
2. أدخل اسم التطبيق.
3. اضغط **Register app** (تسجيل التطبيق).
4. ستظهر لك بيانات التهيئة (Firebase config). احتفظ بها للخطوة القادمة.

## 3. إعداد متغيرات البيئة (.env.local)
1. في جذر المشروع، انسخ ملف `.env.example` وأعد تسميته إلى `.env.local`.
2. انسخ القيم من Firebase config التي ظهرت لك وضعها في الملف الجديد كالتالي:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```

## 4. إعداد الـ Authentication
1. من القائمة الجانبية في Firebase Console، اذهب إلى **Authentication**.
2. اضغط على **Get started**.
3. من تبويب **Sign-in method**، أضف:
   - **Google**: فعّله واختر إيميل الدعم الخاص بك.
   - **Email/Password**: فعّله لتسجيل الدخول بالبريد الإلكتروني وكلمة المرور.
4. اذهب إلى تبويب **Settings -> Authorized domains** وتأكد من إضافة نطاق الاستضافة الخاص بك (مثل: `your-project.web.app`، ومحلياً `localhost`).

## 5. إعداد قاعدة البيانات (Firestore)
1. اذهب إلى **Firestore Database** من القائمة الجانبية.
2. اضغط على **Create database**.
3. اختر الموقع الجغرافي (يفضل أقرب موقع للمستخدمين).
4. انشر قواعد الأمان المرفقة مع المشروع. استخدم أمر:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (تأكد من وجود ملف `firestore.rules` في جذر المشروع).

## 6. نشر التطبيق على Firebase Hosting
1. تأكد من إعداد المشروع للإنتاج:
   ```bash
   npm run build
   ```
2. سجل الدخول إلى Firebase CLI:
   ```bash
   npx firebase login
   ```
3. هيئ Firebase للمشروع:
   ```bash
   npx firebase init hosting
   ```
   - اختر المشروع الذي قمت بإنشائه.
   - مسار الـ Public directory: `dist`
   - Configure as a single-page app (rewrite all urls to /index.html)? **Yes**
   - Set up automatic builds and deploys with GitHub? **No**
4. قم برفع التطبيق:
   ```bash
   npx firebase deploy --only hosting
   ```
