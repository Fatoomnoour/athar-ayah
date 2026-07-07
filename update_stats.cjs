const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  'import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc, serverTimestamp, getDoc, orderBy } from "firebase/firestore";',
  'import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc, serverTimestamp, getDoc, orderBy, increment } from "firebase/firestore";'
);

code += `

// Premium: Update advanced stats
export async function updateAdvancedStats(userId: string, addedVerses: number, addedTimeMinutes: number, surahId: string) {
  if (!db) return;
  try {
    const ref = doc(db, \`users/\${userId}/readingProgress\`, "current");
    const snap = await getDoc(ref);
    let surahCounts = {};
    if (snap.exists() && snap.data().surahReadCounts) {
      surahCounts = snap.data().surahReadCounts;
    }
    
    // Check if it's a new day to update streak
    let currentStreak = snap.exists() ? (snap.data().currentStreak || 0) : 0;
    let longestStreak = snap.exists() ? (snap.data().longestStreak || 0) : 0;
    const lastReadStr = snap.exists() ? snap.data().lastReadDate : null;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (lastReadStr !== todayStr) {
      if (lastReadStr) {
        const lastRead = new Date(lastReadStr);
        const today = new Date(todayStr);
        const diffDays = Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1; // Reset streak
        }
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    surahCounts[surahId] = (surahCounts[surahId] || 0) + addedVerses;

    // We can also calculate khatmah percentage here if total verses is known. Total verses = 6236
    const prevTotal = snap.exists() ? (snap.data().totalVersesRead || 0) : 0;
    const newTotal = prevTotal + addedVerses;
    const khatmahPercentage = Math.min((newTotal / 6236) * 100, 100);

    await setDoc(ref, {
      totalVersesRead: increment(addedVerses),
      totalReadTimeMinutes: increment(addedTimeMinutes),
      points: increment(addedVerses + (addedTimeMinutes * 5)), // Score logic
      surahReadCounts: surahCounts,
      lastReadDate: todayStr,
      currentStreak,
      longestStreak,
      khatmahPercentage,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
  } catch (error) {
    console.error("Error updating stats", error);
  }
}
`;

fs.writeFileSync('src/services/firestoreService.ts', code);
