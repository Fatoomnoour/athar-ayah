import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc, arrayUnion, increment
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { QuranNote, ReadingProgress, Bookmark, MemorizationPlan } from "../types";
import { SURAH_VERSE_COUNTS } from "../utils/quranUtils";

// User Profile
export async function createUserProfile(userId: string, data: any) {
  if (!db) return;
  const userRef = doc(db, "users", userId);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
  }
}

// Notes / Reflections
export async function createNote(userId: string, noteData: Partial<QuranNote>) {
  if (!db) return;
  try {
    const notesRef = collection(db, `users/${userId}/notes`);
    await addDoc(notesRef, {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/notes`);
  }
}

export async function getUserNotes(userId: string, surahId?: number) {
  if (!db) return [];
  try {
    const notesRef = collection(db, `users/${userId}/notes`);
    let q;
    if (surahId) {
      q = query(notesRef, where("surahId", "==", surahId)); // sort client side to avoid index requirement
    } else {
      q = query(notesRef, orderBy("createdAt", "desc"));
    }
    const snap = await getDocs(q);
    let results = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Partial<QuranNote>) } as QuranNote));
    if (surahId) {
      results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`);
    return [];
  }
}

export async function updateNote(userId: string, noteId: string, noteData: Partial<QuranNote>) {
  if (!db) return;
  try {
    const noteRef = doc(db, `users/${userId}/notes`, noteId);
    await updateDoc(noteRef, {
      ...noteData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notes/${noteId}`);
  }
}

export async function deleteNote(userId: string, noteId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/notes`, noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notes/${noteId}`);
  }
}

// Bookmarks
export async function createBookmark(userId: string, bookmarkData: Partial<Bookmark>) {
  if (!db) return;
  try {
    const ref = collection(db, `users/${userId}/bookmarks`);
    await addDoc(ref, {
      ...bookmarkData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/bookmarks`);
  }
}

export async function getUserBookmarks(userId: string) {
  if (!db) return [];
  try {
    const ref = collection(db, `users/${userId}/bookmarks`);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Bookmark));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/bookmarks`);
    return [];
  }
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/bookmarks`, bookmarkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/bookmarks/${bookmarkId}`);
  }
}

// Progress
export async function saveReadingProgress(userId: string, progressData: Partial<ReadingProgress>) {
  if (!db) return;
  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");
    await setDoc(ref, {
      ...progressData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/readingProgress/current`);
  }
}

export async function getReadingProgress(userId: string) {
  if (!db) return null;
  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) } as ReadingProgress;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/readingProgress/current`);
    return null;
  }
}

// Memorization Plans
export async function createMemorizationPlan(userId: string, planData: Partial<MemorizationPlan>) {
  if (!db) return;
  try {
    const ref = collection(db, `users/${userId}/memorizationPlans`);
    await addDoc(ref, {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/memorizationPlans`);
  }
}

export async function getUserMemorizationPlans(userId: string) {
  if (!db) return [];
  try {
    const ref = collection(db, `users/${userId}/memorizationPlans`);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as MemorizationPlan));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/memorizationPlans`);
    return [];
  }
}

export async function updateMemorizationPlan(userId: string, planId: string, data: Partial<MemorizationPlan>) {
  if (!db) return;
  try {
    const ref = doc(db, `users/${userId}/memorizationPlans`, planId);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/memorizationPlans/${planId}`);
  }
}

export async function deleteMemorizationPlan(userId: string, planId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/memorizationPlans`, planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/memorizationPlans/${planId}`);
  }
}

// Groups
export async function getUserGroups(userId: string) {
  if (!db) return [];
  try {
    const q = query(collection(db, "groups"), where("memberIds", "array-contains", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "groups");
    return [];
  }
}

export async function createGroup(userId: string, groupData: any) {
  if (!db) return;
  try {
    const ref = collection(db, "groups");
    const docRef = await addDoc(ref, {
      createdBy: userId,
      ...groupData,
      memberIds: [userId],
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "groups");
    throw error;
  }
}


export async function joinGroup(userId: string, joinCode: string, userName: string) {
  if (!db) throw new Error("Database not connected");
  try {
    const q = query(collection(db, "groups"), where("joinCode", "==", joinCode));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("المجموعة غير موجودة");
    
    const groupDoc = snap.docs[0];
    const groupRef = doc(db, "groups", groupDoc.id);
    
    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId)
    });
    
    const memberRef = doc(db, `groups/${groupDoc.id}/members`, userId);
    await setDoc(memberRef, {
      userId,
      name: userName,
      role: "member",
      joinedAt: serverTimestamp()
    });
    
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "groups/join");
    throw error;
  }
}

export async function getGroupReflections(groupId: string) {
  if (!db) return [];
  try {
    const q = query(collection(db, `groups/${groupId}/reflections`), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as any));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/reflections`);
    return [];
  }
}

export async function addGroupReflection(groupId: string, reflectionData: any) {
  if (!db) return;
  try {
    const ref = collection(db, `groups/${groupId}/reflections`);
    await addDoc(ref, {
      ...reflectionData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/reflections`);
  }
}


// Premium: Update advanced stats
export async function updateAdvancedStats(userId: string, addedVerses: number, addedTimeMinutes: number, surahId: string, lastVerseNumber?: number, lastSurahName?: string) {
  if (!db) return;
  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");
    const snap = await getDoc(ref);
    let surahCounts: Record<string, number> = {};
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

    let completedSurahs: number[] = snap.exists() && snap.data().completedSurahs ? snap.data().completedSurahs : [];
    
    // Check if current surah is completed
    const sId = Number(surahId);
    if (!completedSurahs.includes(sId)) {
      if (surahCounts[surahId] >= SURAH_VERSE_COUNTS[sId - 1]) {
        completedSurahs.push(sId);
      }
    }

    // We can also calculate khatmah percentage here if total verses is known. Total verses = 6236
    const prevTotal = snap.exists() ? (snap.data().totalVersesRead || 0) : 0;
    const newTotal = prevTotal + addedVerses;
    const khatmahPercentage = Math.min((newTotal / 6236) * 100, 100);

    const updateData: any = {
      totalVersesRead: increment(addedVerses),
      totalReadTimeMinutes: increment(addedTimeMinutes),
      points: increment(addedVerses + (addedTimeMinutes * 5)), // Score logic
      surahReadCounts: surahCounts,
      completedSurahs,
      lastReadDate: todayStr,
      currentStreak,
      longestStreak,
      khatmahPercentage,
      updatedAt: serverTimestamp()
    };

    if (lastVerseNumber !== undefined) {
      updateData.lastSurahId = Number(surahId);
      updateData.lastVerseNumber = lastVerseNumber;
      updateData.lastSurahName = lastSurahName || "";
    }

    await setDoc(ref, updateData, { merge: true });
    
  } catch (error) {
    console.error("Error updating stats", error);
  }
}
