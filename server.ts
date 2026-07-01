import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { VERIFIED_VERSES } from "./src/data/verses.js";

// Fix for import.meta.url in CJS/ESM
let currentDir: string;
if (typeof __dirname !== "undefined") {
  currentDir = __dirname;
} else {
  currentDir = path.dirname(fileURLToPath(import.meta.url));
}

// Secure password hashing helper
function hashPassword(password: string): string {
  return crypto.scryptSync(password, "athar_ayah_salt_123_quran_app", 64).toString("hex");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Determine writable DB path (try data/db.json, fallback to /tmp/athar_ayah_db.json)
let dbPath = path.join(currentDir, "data", "db.json");
try {
  const dataDir = path.join(currentDir, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.log("Could not create data directory, falling back to /tmp");
  dbPath = "/tmp/athar_ayah_db.json";
}

// Initial state creator
const getInitialState = (defaultUserId: string) => {
  return {
    users: [
      {
        id: defaultUserId,
        name: "زائر كريم",
        email: "kidscodinghub1512@gmail.com",
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"
      }
    ],
    notes: [
      {
        id: "note-1",
        userId: defaultUserId,
        surahId: 94,
        surahName: "الشرح",
        verseNumber: 5,
        verseText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
        reflectionText: "مهما اشتدت الأزمات وضاق بالمرء الخناق، فإن الفرج ملازم للضيق، بل يخرج من رحمه. تكرار الآية مرتين يبعث في النفس الطمأنينة المطلقة بأن اليسر قادم لا محالة.",
        tags: ["طمأنينة", "تفاؤل", "صبر"],
        pinned: true,
        isFavorite: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "note-2",
        userId: defaultUserId,
        surahId: 18,
        surahName: "الكهف",
        verseNumber: 10,
        verseText: "إِذْ أَوَى الْفِتْيَةُ إِلَى الْكَهْفِ فَقَالُوا رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
        reflectionText: "دعاء عظيم يُرشدنا إلى أن نسأل الله الرحمة والرشد والتوفيق دائماً حين تضيق بنا مسالك الدنيا ونجهل الطريق الصحيح.",
        tags: ["دعاء", "توجيه", "الكهف"],
        pinned: false,
        isFavorite: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    bookmarks: [
      {
        id: "b-1",
        userId: defaultUserId,
        surahId: 2,
        surahName: "البقرة",
        verseNumber: 255,
        note: "آية الكرسي - الحفظ والتحصين اليومي",
        createdAt: new Date().toISOString()
      }
    ],
    progress: {
      [defaultUserId]: {
        userId: defaultUserId,
        lastSurahId: 18,
        lastSurahName: "الكهف",
        lastVerseNumber: 110,
        dailyGoalVerses: 10,
        completedSurahs: [1, 93, 94, 112, 113, 114],
        currentStreak: 3,
        longestStreak: 5,
        points: 450,
        weeklyGoalProgress: 60,
        streakRecoveriesAvailable: 1,
        badges: ["first_verse"],
        updatedAt: new Date().toISOString()
      }
    },
    plans: [
      {
        id: "plan-1",
        userId: defaultUserId,
        title: "حفظ جزء عمّ",
        surahId: 78,
        surahName: "النبأ",
        startVerse: 1,
        endVerse: 40,
        targetDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        completed: false,
        revisionHistory: [
          { id: "rev-1", date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], status: "excellent" },
          { id: "rev-2", date: new Date(Date.now() - 86400000).toISOString().split('T')[0], status: "good" }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    groups: [],
    groupReflections: []
  };
};

const defaultUserId = "kidscodinghub1512@gmail.com";

// Helper to read database
function readDB() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file", err);
  }
  
  // Return default structured state if not existing/corrupted
  const state = getInitialState(defaultUserId);
  writeDB(state);
  return state;
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing database file", err);
    return false;
  }
}

// API Routes

// Authentication APIs

// 1. Email Register
app.post("/api/auth/register", (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }

  const db = readDB();
  const existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل" });
  }

  const newUser = {
    id: email.toLowerCase(),
    name: name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=059669`
  };

  db.users.push(newUser);

  // Initialize progress for new user
  if (!db.progress[newUser.id]) {
    db.progress[newUser.id] = {
      userId: newUser.id,
      lastSurahId: 1,
      lastSurahName: "الفاتحة",
      lastVerseNumber: 1,
      dailyGoalVerses: 10,
      completedSurahs: [],
      updatedAt: new Date().toISOString()
    };
  }

  writeDB(db);

  // Return user without passwordHash
  const { passwordHash, ...userResponse } = newUser;
  res.status(201).json({ success: true, user: userResponse });
});

// 2. Email Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  }

  // Verify password hash if present (or support existing non-password users)
  if (user.passwordHash) {
    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }
  }

  const { passwordHash, ...userResponse } = user;
  res.json({ success: true, user: userResponse });
});

// 3. Google Federated Login
app.post("/api/auth/google", (req, res) => {
  const { email, name, photoURL } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = readDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    user = {
      id: email.toLowerCase(),
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      photoURL: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}&backgroundColor=059669`
    };
    db.users.push(user);
    
    if (!db.progress[user.id]) {
      db.progress[user.id] = {
        userId: user.id,
        lastSurahId: 1,
        lastSurahName: "الفاتحة",
        lastVerseNumber: 1,
        dailyGoalVerses: 10,
        completedSurahs: [],
        updatedAt: new Date().toISOString()
      };
    }
    writeDB(db);
  }

  const { passwordHash, ...userResponse } = user;
  res.json({ success: true, user: userResponse });
});

// 4. Backwards compatible check / session sync
app.post("/api/auth/session", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = readDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: email.toLowerCase(),
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}&backgroundColor=059669`
    };
    db.users.push(user);
    
    if (!db.progress[user.id]) {
      db.progress[user.id] = {
        userId: user.id,
        lastSurahId: 1,
        lastSurahName: "الفاتحة",
        lastVerseNumber: 1,
        dailyGoalVerses: 10,
        completedSurahs: [],
        updatedAt: new Date().toISOString()
      };
    }
    writeDB(db);
  }
  const { passwordHash, ...userResponse } = user;
  res.json({ success: true, user: userResponse });
});

// Quran Notes CRUD
app.get("/api/notes", (req, res) => {
  const userId = (req.query.userId as string) || defaultUserId;
  const search = (req.query.search as string || "").toLowerCase();
  const surahId = req.query.surahId ? parseInt(req.query.surahId as string) : null;
  const tag = req.query.tag as string || "";

  const db = readDB();
  let userNotes = db.notes.filter((note: any) => note.userId === userId);

  // Apply filters
  if (search) {
    userNotes = userNotes.filter((note: any) => 
      note.reflectionText.toLowerCase().includes(search) ||
      note.verseText.toLowerCase().includes(search) ||
      note.surahName.toLowerCase().includes(search) ||
      note.tags.some((t: string) => t.toLowerCase().includes(search))
    );
  }

  if (surahId) {
    userNotes = userNotes.filter((note: any) => note.surahId === surahId);
  }

  if (tag) {
    userNotes = userNotes.filter((note: any) => note.tags.includes(tag));
  }

  // Sort: pinned first, then newest first
  userNotes.sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json(userNotes);
});

app.post("/api/notes", (req, res) => {
  const { userId, surahId, surahName, verseNumber, reflectionText, tags, pinned, isFavorite } = req.body;
  
  if (!surahId || !surahName || !verseNumber || !reflectionText) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readDB();
  
  // Find matching verse text if we have it preloaded, otherwise generate a beautiful responsive indicator
  const matchedVerse = VERIFIED_VERSES.find(v => v.surahId === surahId && v.verseNumber === verseNumber);
  const verseText = matchedVerse ? matchedVerse.text : `الآية رقم ${verseNumber} من سورة ${surahName}`;

  const newNote = {
    id: "note-" + Math.random().toString(36).substring(2, 9),
    userId: userId || defaultUserId,
    surahId,
    surahName,
    verseNumber,
    verseText,
    reflectionText,
    tags: tags || [],
    pinned: !!pinned,
    isFavorite: !!isFavorite,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.notes.unshift(newNote);
  writeDB(db);
  res.status(201).json(newNote);
});

app.put("/api/notes/:id", (req, res) => {
  const { id } = req.params;
  const { reflectionText, tags, pinned, isFavorite, verseNumber, surahId, surahName } = req.body;

  const db = readDB();
  const noteIndex = db.notes.findIndex((n: any) => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  const existingNote = db.notes[noteIndex];
  
  // If surah/verse changed, update verseText as well
  let verseText = existingNote.verseText;
  if (surahId && verseNumber && (surahId !== existingNote.surahId || verseNumber !== existingNote.verseNumber)) {
    const matchedVerse = VERIFIED_VERSES.find(v => v.surahId === surahId && v.verseNumber === verseNumber);
    verseText = matchedVerse ? matchedVerse.text : `الآية رقم ${verseNumber} من سورة ${surahName}`;
  }

  const updatedNote = {
    ...existingNote,
    surahId: surahId !== undefined ? surahId : existingNote.surahId,
    surahName: surahName !== undefined ? surahName : existingNote.surahName,
    verseNumber: verseNumber !== undefined ? verseNumber : existingNote.verseNumber,
    verseText,
    reflectionText: reflectionText !== undefined ? reflectionText : existingNote.reflectionText,
    tags: tags !== undefined ? tags : existingNote.tags,
    pinned: pinned !== undefined ? pinned : existingNote.pinned,
    isFavorite: isFavorite !== undefined ? isFavorite : existingNote.isFavorite,
    updatedAt: new Date().toISOString()
  };

  db.notes[noteIndex] = updatedNote;
  writeDB(db);
  res.json(updatedNote);
});

app.delete("/api/notes/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const noteIndex = db.notes.findIndex((n: any) => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  db.notes.splice(noteIndex, 1);
  writeDB(db);
  res.json({ success: true, message: "Note deleted" });
});

app.post("/api/notes/:id/pin", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const note = db.notes.find((n: any) => n.id === id);
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(note);
});

app.post("/api/notes/:id/favorite", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const note = db.notes.find((n: any) => n.id === id);
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  note.isFavorite = !note.isFavorite;
  note.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(note);
});

// Bookmarks CRUD
app.get("/api/bookmarks", (req, res) => {
  const userId = (req.query.userId as string) || defaultUserId;
  const db = readDB();
  const userBookmarks = db.bookmarks.filter((b: any) => b.userId === userId);
  res.json(userBookmarks);
});

app.post("/api/bookmarks", (req, res) => {
  const { userId, surahId, surahName, verseNumber, note } = req.body;
  if (!surahId || !surahName || !verseNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readDB();
  const uid = userId || defaultUserId;
  
  // Check if already bookmarked
  const existingIndex = db.bookmarks.findIndex(
    (b: any) => b.userId === uid && b.surahId === surahId && b.verseNumber === verseNumber
  );

  if (existingIndex !== -1) {
    // Toggle off (remove)
    db.bookmarks.splice(existingIndex, 1);
    writeDB(db);
    return res.json({ removed: true });
  }

  const newBookmark = {
    id: "b-" + Math.random().toString(36).substring(2, 9),
    userId: uid,
    surahId,
    surahName,
    verseNumber,
    note: note || "",
    createdAt: new Date().toISOString()
  };

  db.bookmarks.push(newBookmark);
  writeDB(db);
  res.status(201).json(newBookmark);
});

app.delete("/api/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.bookmarks.findIndex((b: any) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Bookmark not found" });
  }

  db.bookmarks.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: "Bookmark removed" });
});

// Reading Progress API
app.get("/api/progress", (req, res) => {
  const userId = (req.query.userId as string) || defaultUserId;
  const db = readDB();
  let userProgress = db.progress[userId];
  if (!userProgress) {
    userProgress = {
      userId,
      lastSurahId: 1,
      lastSurahName: "الفاتحة",
      lastVerseNumber: 1,
      dailyGoalVerses: 10,
      completedSurahs: [],
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      weeklyGoalProgress: 0,
      streakRecoveriesAvailable: 1,
      badges: [],
      updatedAt: new Date().toISOString()
    };
    db.progress[userId] = userProgress;
    writeDB(db);
  }
  res.json(userProgress);
});

app.post("/api/progress", (req, res) => {
  const { userId, lastSurahId, lastSurahName, lastVerseNumber, dailyGoalVerses, completedSurahs } = req.body;
  const db = readDB();
  const uid = userId || defaultUserId;

  const current = db.progress[uid] || {
    userId: uid,
    lastSurahId: 1,
    lastSurahName: "الفاتحة",
    lastVerseNumber: 1,
    dailyGoalVerses: 10,
    completedSurahs: [],
    currentStreak: 0,
    longestStreak: 0,
    points: 0,
    weeklyGoalProgress: 0,
    streakRecoveriesAvailable: 1,
    badges: [],
    updatedAt: new Date().toISOString()
  };

  db.progress[uid] = {
    ...current,
    lastSurahId: lastSurahId !== undefined ? lastSurahId : current.lastSurahId,
    lastSurahName: lastSurahName !== undefined ? lastSurahName : current.lastSurahName,
    lastVerseNumber: lastVerseNumber !== undefined ? lastVerseNumber : current.lastVerseNumber,
    dailyGoalVerses: dailyGoalVerses !== undefined ? dailyGoalVerses : current.dailyGoalVerses,
    completedSurahs: completedSurahs !== undefined ? completedSurahs : current.completedSurahs,
    currentStreak: req.body.currentStreak !== undefined ? req.body.currentStreak : current.currentStreak,
    points: req.body.points !== undefined ? req.body.points : current.points,
    badges: req.body.badges !== undefined ? req.body.badges : current.badges,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json(db.progress[uid]);
});

// Memorization Plans API
app.get("/api/memorization", (req, res) => {
  const userId = (req.query.userId as string) || defaultUserId;
  const db = readDB();
  const userPlans = db.plans.filter((p: any) => p.userId === userId);
  res.json(userPlans);
});

app.post("/api/memorization", (req, res) => {
  const { userId, title, surahId, surahName, startVerse, endVerse, targetDate } = req.body;
  if (!title || !surahId || !surahName || !startVerse || !endVerse || !targetDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readDB();
  const newPlan = {
    id: "plan-" + Math.random().toString(36).substring(2, 9),
    userId: userId || defaultUserId,
    title,
    surahId,
    surahName,
    startVerse,
    endVerse,
    targetDate,
    completed: false,
    revisionHistory: [],
    createdAt: new Date().toISOString()
  };

  db.plans.unshift(newPlan);
  writeDB(db);
  res.status(201).json(newPlan);
});

app.put("/api/memorization/:id", (req, res) => {
  const { id } = req.params;
  const { completed, revisionHistory, title, targetDate, nextReviewDate, intervalDays } = req.body;

  const db = readDB();
  const planIndex = db.plans.findIndex((p: any) => p.id === id);
  if (planIndex === -1) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const existingPlan = db.plans[planIndex];
  db.plans[planIndex] = {
    ...existingPlan,
    title: title !== undefined ? title : existingPlan.title,
    targetDate: targetDate !== undefined ? targetDate : existingPlan.targetDate,
    completed: completed !== undefined ? completed : existingPlan.completed,
    revisionHistory: revisionHistory !== undefined ? revisionHistory : existingPlan.revisionHistory,
    nextReviewDate: nextReviewDate !== undefined ? nextReviewDate : existingPlan.nextReviewDate,
    intervalDays: intervalDays !== undefined ? intervalDays : existingPlan.intervalDays
  };

  writeDB(db);
  res.json(db.plans[planIndex]);
});

app.delete("/api/memorization/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.plans.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Plan not found" });
  }

  db.plans.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: "Plan deleted" });
});

// Serve Vite or Static build
// Groups APIs
app.get("/api/groups", (req, res) => {
  const userId = req.query.userId as string;
  const db = readDB();
  const userGroups = (db.groups || []).filter((g: any) => g.members.some((m: any) => m.userId === userId));
  res.json(userGroups);
});

app.post("/api/groups", (req, res) => {
  const db = readDB();
  const newGroup = {
    id: `group-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  if (!db.groups) db.groups = [];
  db.groups.push(newGroup);
  writeDB(db);
  res.status(201).json(newGroup);
});

app.post("/api/groups/join", (req, res) => {
  const { userId, userName, joinCode } = req.body;
  const db = readDB();
  if (!db.groups) db.groups = [];
  
  const group = db.groups.find((g: any) => g.joinCode === joinCode);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.members.length >= group.maxMembers) return res.status(400).json({ error: "Group is full" });
  if (group.members.some((m: any) => m.userId === userId)) return res.status(400).json({ error: "Already a member" });
  
  group.members.push({
    userId,
    name: userName,
    role: "member",
    joinedAt: new Date().toISOString()
  });
  
  writeDB(db);
  res.json(group);
});

app.get("/api/groups/:groupId/reflections", (req, res) => {
  const { groupId } = req.params;
  const db = readDB();
  const reflections = (db.groupReflections || []).filter((r: any) => r.groupId === groupId);
  res.json(reflections);
});

app.post("/api/groups/:groupId/reflections", (req, res) => {
  const { groupId } = req.params;
  const db = readDB();
  const newReflection = {
    id: `ref-${Date.now()}`,
    groupId,
    ...req.body,
    reactions: 0,
    isPinned: false,
    createdAt: new Date().toISOString()
  };
  
  if (!db.groupReflections) db.groupReflections = [];
  db.groupReflections.push(newReflection);
  writeDB(db);
  res.status(201).json(newReflection);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

