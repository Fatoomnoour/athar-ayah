# خطة تطوير نظام التسميع النشط

## ملاحظة مهمة عن الحالة الحالية

النسخة الحالية من **Active Recitation** تعمل كنسخة أولية: تفتح التعرف الصوتي بعد إذن المستخدم، تعرض النص الذي فهمه المتصفح، وتحسب مطابقة تقريبية للكلمات. لكنها لا تعمل بعد بطريقة فحص آية بآية مثل تطبيقات متخصصة؛ فلا توجد حاليًا طبقة تعرض كل كلمة بلون أخضر أو أحمر، ولا مؤشر زمني يربط النطق بالكلمة، ولا تحليل صوتي موثوق لأحكام التجويد.

للوصول إلى تجربة قريبة من تطبيقات مثل Tarteel، يجب فصل النظام إلى ثلاث طبقات: التقاط الصوت وتحويله إلى كلام، محاذاة الكلام مع الآيات، ثم طبقة ملاحظات تعليمية محدودة. لا ينبغي تقديم النتائج على أنها تصحيح شرعي نهائي؛ بل يجب وصفها بأنها **مساعدة للمراجعة** مع تشجيع المستخدم على الرجوع إلى معلّم مؤهل.

## أولًا: حفظ جلسات التسميع في Firebase Firestore

### 1. تصميم نموذج البيانات

الأفضل تخزين الجلسات تحت المستخدم نفسه حتى تعزل قواعد Firestore بيانات كل مستخدم عن غيره. مثال مقترح:

```text
users/{uid}/recitationSessions/{sessionId}
```

ويكون مستند الجلسة شبيهًا بالآتي:

```ts
export interface RecitationSession {
  id: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  verseKeys: string[];              // مثل: ["2:255", "2:256"]
  startedAt: Timestamp;
  completedAt?: Timestamp;
  durationSeconds?: number;
  status: "started" | "completed" | "abandoned";
  score?: number;
  matchedWords?: number;
  expectedWords?: number;
  mismatchCount?: number;
  recognitionLanguage: "ar-SA";
  engine: "web-speech" | "server-asr";
  transcript?: string;               // اختياري، وبعد موافقة المستخدم
  feedback?: RecitationFeedback[];
}

export interface RecitationFeedback {
  verseKey: string;
  expectedText: string;
  recognizedText: string;
  expectedTokens: string[];
  recognizedTokens: string[];
  tokenStatuses: Array<"matched" | "missing" | "extra" | "uncertain">;
  confidence?: number;
  issueType?: "word-omission" | "word-substitution" | "possible-tajweed";
}
```

لا يُنصح بحفظ التسجيل الصوتي في البداية. حفظ الصوت يرفع متطلبات الخصوصية والتكلفة، ويحتاج إلى موافقة صريحة، وقواعد Storage منفصلة، وسياسة حذف واضحة. يمكن حفظ النتيجة النصية المختصرة فقط، أو تعطيل حفظ النص افتراضيًا وإضافة خيار **حفظ ملخص الجلسة**.

### 2. إنشاء جلسة جديدة

عند ضغط المستخدم على **بدء الجلسة**، ينشئ التطبيق مستندًا بحالة `started` باستخدام `serverTimestamp()`، وليس توقيت جهاز المستخدم فقط:

```ts
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export async function createRecitationSession(
  uid: string,
  selection: {
    surahNumber: number;
    surahName: string;
    startAyah: number;
    endAyah: number;
    verseKeys: string[];
  },
) {
  const ref = await addDoc(
    collection(db, "users", uid, "recitationSessions"),
    {
      userId: uid,
      ...selection,
      status: "started",
      recognitionLanguage: "ar-SA",
      engine: "web-speech",
      startedAt: serverTimestamp(),
    },
  );

  return ref.id;
}
```

يجب التحقق من السورة والآيات قبل الكتابة، وعدم قبول `verseKeys` أرسلها المستخدم كما هي. الخادم أو طبقة الخدمة يجب أن تتحقق من أن الآية تقع داخل السورة وأن `startAyah <= endAyah` وأن الحد الأقصى للنطاق معقول، مثل 20 آية للجلسة الواحدة.

### 3. إنهاء الجلسة وتحديثها

بعد إيقاف الاستماع، يحسب التطبيق النتيجة محليًا ثم يحدّث مستند الجلسة:

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function completeRecitationSession(
  uid: string,
  sessionId: string,
  result: {
    score: number;
    matchedWords: number;
    expectedWords: number;
    mismatchCount: number;
    feedback: RecitationFeedback[];
    durationSeconds: number;
    transcript?: string;
  },
) {
  const sessionRef = doc(db, "users", uid, "recitationSessions", sessionId);

  await updateDoc(sessionRef, {
    ...result,
    status: "completed",
    completedAt: serverTimestamp(),
  });
}
```

ينبغي ألا يسمح العميل بتعديل `userId` أو `startedAt` أو `surahNumber` بعد إنشاء الجلسة. ومن الأفضل استخدام Cloud Function لحساب إحصاءات مثل متوسط النتيجة أو عدد الجلسات المكتملة بدل الوثوق بدرجات يرسلها العميل.

### 4. قواعد Firestore المقترحة

```firestore
match /users/{userId}/recitationSessions/{sessionId} {
  allow read: if isSignedIn() && request.auth.uid == userId;

  allow create: if isSignedIn()
    && request.auth.uid == userId
    && request.resource.data.userId == userId
    && request.resource.data.status == "started"
    && request.resource.data.surahNumber is int
    && request.resource.data.startAyah is int
    && request.resource.data.endAyah is int
    && request.resource.data.startAyah >= 1
    && request.resource.data.endAyah >= request.resource.data.startAyah
    && request.resource.data.endAyah - request.resource.data.startAyah <= 19;

  allow update: if isSignedIn()
    && request.auth.uid == userId
    && resource.data.userId == userId
    && request.resource.data.userId == resource.data.userId
    && request.resource.data.surahNumber == resource.data.surahNumber
    && request.resource.data.startAyah == resource.data.startAyah
    && request.resource.data.endAyah == resource.data.endAyah
    && request.resource.data.status in ["started", "completed", "abandoned"];

  allow delete: if isSignedIn() && request.auth.uid == userId;
}
```

يجب اختبار هذه القواعد باستخدام Firebase Emulator: مستخدم A يستطيع قراءة جلساته فقط، ومستخدم B يحصل على رفض عند محاولة قراءة أو تعديل جلسات A. كما ينبغي إضافة حد لحجم `feedback` حتى لا يسمح العميل بكتابة مستند ضخم.

## ثانيًا: تبسيط اختيار السورة ونطاق الآيات

### تجربة المستخدم المقترحة

بدل عرض قائمة طويلة من السور وأرقام حرة، استخدم تدفقًا من ثلاث خطوات صغيرًا:

| الخطوة | المكوّن | السلوك |
|---|---|---|
| 1 | مربع بحث للسورة | يبحث بالاسم العربي والإنجليزي والرقم، مع قائمة نتائج محدودة |
| 2 | بطاقة السورة | تعرض الاسم، عدد الآيات، مكية/مدنية، وزر تأكيد |
| 3 | نطاق الآيات | قائمتا `من آية` و`إلى آية` لا تعرضان إلا أرقامًا صحيحة ضمن عدد آيات السورة |

بعد اختيار سورة مثل **البقرة**، يجب أن يتغير نطاق الآيات إلى `1 ... 286`. إذا اختار المستخدم الآية 286 في خانة البداية، فلا تظهر في خانة النهاية أرقام أقل من 286. وعند تغيير السورة، يجب إعادة النطاق تلقائيًا إلى `1–1` لمنع بقاء أرقام من السورة السابقة.

### مكوّن الاختيار

```tsx
<div className="space-y-4">
  <label htmlFor="surah-search">ابحث عن السورة</label>
  <input
    id="surah-search"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    placeholder="اسم السورة أو رقمها"
  />

  <select value={surah.number} onChange={handleSurahChange}>
    {filteredSurahs.map((item) => (
      <option key={item.number} value={item.number}>
        {item.number}. {language === "ar" ? item.nameAr : item.nameEn}
        — {item.ayahCount} آية
      </option>
    ))}
  </select>

  <div className="grid grid-cols-2 gap-3">
    <select value={startAyah} onChange={handleStartAyahChange}>
      {ayahNumbers.map((number) => <option key={number}>{number}</option>)}
    </select>
    <select value={endAyah} onChange={handleEndAyahChange}>
      {ayahNumbers
        .filter((number) => number >= startAyah)
        .map((number) => <option key={number}>{number}</option>)}
    </select>
  </div>
</div>
```

يجب أن تكون أسماء السور وعدد الآيات من مصدر واحد مشترك يستخدمه قارئ القرآن، وصفحة التقدم، والتسميع النشط. لا تكرر قائمة السور داخل كل مكوّن؛ التكرار هو أحد أسباب ظهور نطاقات غير صحيحة.

### تحسينات Mobile First

على الهاتف، اجعل اختيار السورة في Bottom Sheet أو نافذة قابلة للتمرير، مع إبقاء البحث في أعلى النافذة. اعرض ملخصًا ثابتًا قبل بدء الجلسة: **سورة البقرة، الآيات 1–5، خمس آيات**. زر بدء الجلسة يجب أن يبقى معطلًا حتى يصبح الاختيار صحيحًا. أضف زرًا سريعًا مثل **آخر نطاق استخدمته**، لكن لا تستخدمه دون إعادة التحقق من عدد آيات السورة.

## ثالثًا: تحسين مطابقة الكلمات

### المرحلة الأولى: التطبيع العربي

التعرف الصوتي قد يعيد النص بتشكيلات أو همزات وأشكال مختلفة. قبل المقارنة، طبّق تطبيعًا محدودًا لا يغير النص القرآني المعروض للمستخدم:

```ts
export function normalizeArabicForMatching(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأٱآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[،؛؟,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

هذه الدالة للمقارنة فقط. لا يجوز استخدامها لاستبدال نص القرآن الظاهر؛ النص القرآني canonical read-only ويظل كما هو من المصدر المعتمد.

### المرحلة الثانية: محاذاة الكلمات

بدل حساب نسبة عامة فقط، استخدم **Levenshtein alignment** أو خوارزمية Needleman–Wunsch لمقارنة قائمتين من الكلمات. النتيجة لكل كلمة تكون:

- `matched`: الكلمة المتوقعة ظهرت بشكل مطابق بعد التطبيع.
- `missing`: كلمة متوقعة لم تظهر.
- `extra`: كلمة زائدة أو التقطها المتصفح خطأ.
- `uncertain`: تشابه جزئي يحتاج مراجعة بشرية.

مثال عرض مناسب:

```text
الحمد لله رب العالمين
[الحمد ✓] [لله ✓] [رب ✓] [العالمين ؟]
```

لا تلوّن النص القرآني نفسه بطريقة توحي بتغيير النص؛ اعرض طبقة feedback منفصلة أسفله، مع زر **عرض النص الصحيح**.

### المرحلة الثالثة: معالجة أخطاء التعرف الصوتي

Web Speech API ليست محركًا متخصصًا للقرآن، وقد تتأثر بالضوضاء والاتصال والمتصفح. لتحسين النتيجة:

1. اجعل اللغة `ar-SA` صراحة عند إنشاء SpeechRecognition.
2. اجمع النتائج النهائية `isFinal` بدل مقارنة كل نتيجة مؤقتة.
3. امنع تكرار المقاطع عند دمج النتائج المتتابعة.
4. قسّم النص المتوقع حسب الآية، ولا تقارن جلسة طويلة دفعة واحدة.
5. تجاهل التشكيل وعلامات الوقف في طبقة المقارنة فقط.
6. استخدم درجة ثقة إن أعادها المحرك، لكن لا تحولها إلى حكم قطعي.
7. اعرض زر **إعادة المحاولة** للآية الحالية بدل إعادة الجلسة كاملة.
8. أوقف التسجيل تلقائيًا عند الصمت، مع خيار تعطيل ذلك من الإعدادات.

## اكتشاف أخطاء التجويد البسيطة: ما يمكن وما لا يمكن

من الممكن إضافة مؤشرات تعليمية محدودة إذا أصبح لدينا صوت خام وتحليل صوتي، مثل اكتشاف توقف طويل، أو نطق كلمة غير متوقعة، أو اختلاف واضح في مقطع صوتي. لكن اكتشاف المدود والغنة والإخفاء والإدغام بدقة يحتاج نموذجًا صوتيًا مدربًا على تلاوات صحيحة وموسومة، وليس مجرد مقارنة النص الناتج من المتصفح.

التصميم الآمن يكون على شكل **مؤشرات احتمالية**:

```ts
type TajweedHint = {
  verseKey: string;
  rule: "possible-long-pause" | "possible-omission" | "possible-word-substitution";
  confidence: number;
  messageAr: string;
  messageEn: string;
};
```

مثال: `قد توجد كلمة غير واضحة أو محذوفة؛ راجع الآية مع المصحف`. لا تعرض رسالة مثل **خطأ في التجويد** إلا إذا كان النظام موثوقًا ومراجعًا بشكل متخصص. الأفضل استخدام عبارة **ملاحظة محتملة**.

### مسار تقني متقدم لاحقًا

إذا أردتم دقة أعلى من Web Speech API، يمكن بناء خدمة منفصلة تستخدم نموذج ASR عربيًا مخصصًا، ثم محاذاة forced alignment بين الصوت والنص. هذا المسار يتطلب معالجة صوتية على خادم، سياسة احتفاظ وحذف للتسجيلات، موافقة صريحة، حماية من رفع ملفات كبيرة، وتكلفة تشغيل. لذلك يُفضّل تأجيله حتى تثبت تجربة المطابقة المحلية فائدتها.

## خطة تنفيذ عملية

| المرحلة | النتيجة |
|---|---|
| المرحلة 1 | استخراج دوال التحقق والتنقل والاختيار إلى خدمات مستقلة مع اختبارات وحدات |
| المرحلة 2 | إضافة `recitationSessions` مع قواعد Firestore واختبارات Emulator |
| المرحلة 3 | إضافة واجهة سجل الجلسات: التاريخ، السورة، النطاق، الدرجة، إعادة المحاولة |
| المرحلة 4 | إضافة محاذاة الكلمات والألوان ونتيجة لكل آية |
| المرحلة 5 | اختبار Chrome Android وSafari iPhone وحالات رفض الميكروفون وضعف الإنترنت |
| المرحلة 6 | دراسة ASR مخصص أو forced alignment فقط بعد مراجعة الخصوصية والدقة |

## الخلاصة

التحسين المطلوب ليس مجرد إضافة زر **فحص مرة أخرى**. المطلوب هو تحويل النتيجة من درجة عامة إلى تقرير آية بآية وكلمة بكلمة، مع حفظ آمن للجلسة واختيار صحيح للسورة والنطاق. البداية الأفضل هي تنفيذ Firestore للجلسات، ثم دوال التطبيع والمحاذاة، ثم واجهة feedback واضحة. أما تصحيح التجويد الحقيقي فيحتاج نموذجًا صوتيًا متخصصًا ومراجعة من أهل الاختصاص، ويجب ألا يوحي التطبيق للمستخدم بأن الملاحظة الآلية فتوى أو شهادة صحة للتلاوة.

## مراجع مجانية

1. [Firebase Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
2. [Firebase Firestore Web Add Data](https://firebase.google.com/docs/firestore/manage-data/add-data)
3. [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
4. [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
5. [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
