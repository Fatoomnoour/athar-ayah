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
  addDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  QuranNote,
  ReadingProgress,
  Bookmark,
  MemorizationPlan,
  GroupReflection,
} from "../types";
import { SURAH_VERSE_COUNTS } from "../utils/quranUtils";

// =========================
// User Profile
// =========================
export async function createUserProfile(userId: string, data: any) {
  if (!db) return;

  const userRef = doc(db, "users", userId);

  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
  }
}

// =========================
// Notes / Reflections
// =========================
export async function createNote(userId: string, noteData: Partial<QuranNote>) {
  if (!db) return;

  try {
    const notesRef = collection(db, `users/${userId}/notes`);

    await addDoc(notesRef, {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/notes`);
  }
}

export async function getUserNotes(userId: string, surahId?: number) {
  if (!db) return [];

  try {
    const notesRef = collection(db, `users/${userId}/notes`);

    const q = surahId
      ? query(notesRef, where("surahId", "==", surahId))
      : query(notesRef, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const results = snap.docs.map(
      (document) =>
        ({
          id: document.id,
          ...(document.data() as Partial<QuranNote>),
        } as QuranNote)
    );

    if (surahId) {
      results.sort((a, b) => {
        const aDate = new Date((a as any).createdAt || 0).getTime();
        const bDate = new Date((b as any).createdAt || 0).getTime();
        return bDate - aDate;
      });
    }

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`);
    return [];
  }
}

export async function updateNote(
  userId: string,
  noteId: string,
  noteData: Partial<QuranNote>
) {
  if (!db) return;

  try {
    const noteRef = doc(db, `users/${userId}/notes`, noteId);

    await updateDoc(noteRef, {
      ...noteData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${userId}/notes/${noteId}`
    );
  }
}

export async function deleteNote(userId: string, noteId: string) {
  if (!db) return;

  try {
    await deleteDoc(doc(db, `users/${userId}/notes`, noteId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${userId}/notes/${noteId}`
    );
  }
}

// =========================
// Bookmarks
// =========================
export async function createBookmark(
  userId: string,
  bookmarkData: Partial<Bookmark>
) {
  if (!db) return;

  try {
    const ref = collection(db, `users/${userId}/bookmarks`);

    await addDoc(ref, {
      ...bookmarkData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `users/${userId}/bookmarks`
    );
  }
}

export async function getUserBookmarks(userId: string) {
  if (!db) return [];

  try {
    const ref = collection(db, `users/${userId}/bookmarks`);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map(
      (document) =>
        ({
          id: document.id,
          ...(document.data() as any),
        } as Bookmark)
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.LIST,
      `users/${userId}/bookmarks`
    );
    return [];
  }
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  if (!db) return;

  try {
    await deleteDoc(doc(db, `users/${userId}/bookmarks`, bookmarkId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${userId}/bookmarks/${bookmarkId}`
    );
  }
}

// =========================
// Reading Progress
// =========================
export async function saveReadingProgress(
  userId: string,
  progressData: Partial<ReadingProgress>
) {
  if (!db) return;

  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");

    await setDoc(
      ref,
      {
        ...progressData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${userId}/readingProgress/current`
    );
  }
}

export async function getReadingProgress(userId: string) {
  if (!db) return null;

  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return {
        id: snap.id,
        ...(snap.data() as any),
      } as ReadingProgress;
    }

    return null;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.GET,
      `users/${userId}/readingProgress/current`
    );
    return null;
  }
}

// =========================
// Memorization Plans
// =========================
export async function createMemorizationPlan(
  userId: string,
  planData: Partial<MemorizationPlan>
) {
  if (!db) return;

  try {
    const ref = collection(db, `users/${userId}/memorizationPlans`);

    await addDoc(ref, {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `users/${userId}/memorizationPlans`
    );
  }
}

export async function getUserMemorizationPlans(userId: string) {
  if (!db) return [];

  try {
    const ref = collection(db, `users/${userId}/memorizationPlans`);
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map(
      (document) =>
        ({
          id: document.id,
          ...(document.data() as any),
        } as MemorizationPlan)
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.LIST,
      `users/${userId}/memorizationPlans`
    );
    return [];
  }
}

export async function updateMemorizationPlan(
  userId: string,
  planId: string,
  data: Partial<MemorizationPlan>
) {
  if (!db) return;

  try {
    const ref = doc(db, `users/${userId}/memorizationPlans`, planId);

    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `users/${userId}/memorizationPlans/${planId}`
    );
  }
}

export async function deleteMemorizationPlan(userId: string, planId: string) {
  if (!db) return;

  try {
    await deleteDoc(doc(db, `users/${userId}/memorizationPlans`, planId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `users/${userId}/memorizationPlans/${planId}`
    );
  }
}

// =========================
// Groups
// =========================
type GroupMember = {
  userId: string;
  name: string;
  role: "admin" | "member";
  joinedAt?: any;
};

function normalizeJoinCode(joinCode: string) {
  return joinCode.trim().toUpperCase();
}

async function getGroupMembersFromSubcollection(groupId: string) {
  if (!db) return [];

  try {
    const membersRef = collection(db, `groups/${groupId}/members`);
    const snap = await getDocs(membersRef);

    return snap.docs.map((memberDoc) => {
      const data = memberDoc.data() as any;

      return {
        userId: data.userId || memberDoc.id,
        name: data.name || "عضو",
        role: data.role || "member",
        joinedAt: data.joinedAt,
      } as GroupMember;
    });
  } catch (error) {
    console.warn("Could not load group members subcollection:", error);
    return [];
  }
}

export async function getUserGroups(userId: string) {
  if (!db) return [];

  try {
    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", userId)
    );

    const snap = await getDocs(q);

    const groups = await Promise.all(
      snap.docs.map(async (groupDocument) => {
        const data = groupDocument.data() as any;
        const groupId = groupDocument.id;

        const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
        const cachedMembers = Array.isArray(data.members) ? data.members : [];

        const subcollectionMembers = await getGroupMembersFromSubcollection(
          groupId
        );

        const mergedMembersMap = new Map<string, GroupMember>();

        cachedMembers.forEach((member: any) => {
          if (!member?.userId) return;

          mergedMembersMap.set(member.userId, {
            userId: member.userId,
            name: member.name || "عضو",
            role: member.role || "member",
            joinedAt: member.joinedAt,
          });
        });

        subcollectionMembers.forEach((member) => {
          if (!member?.userId) return;
          mergedMembersMap.set(member.userId, member);
        });

        memberIds.forEach((memberId: string) => {
          if (!mergedMembersMap.has(memberId)) {
            mergedMembersMap.set(memberId, {
              userId: memberId,
              name: memberId === userId ? "أنت" : "عضو منضم",
              role: "member",
            });
          }
        });

        return {
          id: groupId,
          ...data,
          memberIds,
          members: Array.from(mergedMembersMap.values()),
        };
      })
    );

    return groups;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "groups");
    return [];
  }
}

export async function createGroup(userId: string, groupData: any) {
  if (!db) return;

  try {
    const ref = collection(db, "groups");

    const adminMember: GroupMember = {
      userId,
      name:
        groupData?.members?.[0]?.name ||
        groupData?.adminName ||
        groupData?.userName ||
        "مشرف",
      role: "admin",
      joinedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(ref, {
      createdBy: userId,
      adminId: groupData.adminId || userId,
      ...groupData,
      memberIds: [userId],
      members: [adminMember],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const memberRef = doc(db, `groups/${docRef.id}/members`, userId);

    await setDoc(memberRef, {
      ...adminMember,
      joinedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "groups");
    throw error;
  }
}

export async function joinGroup(
  userId: string,
  joinCode: string,
  userName: string
) {
  if (!db) throw new Error("Database not connected");

  const normalizedCode = normalizeJoinCode(joinCode);

  if (!normalizedCode) {
    throw new Error("رمز الانضمام مطلوب");
  }

  try {
    const q = query(
      collection(db, "groups"),
      where("joinCode", "==", normalizedCode)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("رمز الانضمام غير صحيح");
    }

    const groupDocument = snap.docs[0];
    const groupData = groupDocument.data() as any;
    const groupRef = doc(db, "groups", groupDocument.id);

    const currentMemberIds = Array.isArray(groupData.memberIds)
      ? groupData.memberIds
      : [];

    const currentMembers = Array.isArray(groupData.members)
      ? groupData.members
      : [];

    const safeUserName = userName || "عضو";

    const memberRecord: GroupMember = {
      userId,
      name: safeUserName,
      role: "member",
      joinedAt: new Date().toISOString(),
    };

    const isAlreadyMember = currentMemberIds.includes(userId);

    const filteredMembers = currentMembers.filter(
      (member: any) => member?.userId !== userId
    );

    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId),
      members: isAlreadyMember
        ? currentMembers
        : [...filteredMembers, memberRecord],
      updatedAt: serverTimestamp(),
    });

    const memberRef = doc(db, `groups/${groupDocument.id}/members`, userId);

    await setDoc(
      memberRef,
      {
        ...memberRecord,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return groupDocument.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "groups/join");
    throw error;
  }
}

export async function updateGroupWird(
  groupId: string,
  data: {
    surahId: number;
    surahName: string;
    verseRange: string;
  }
) {
  if (!db) return;

  try {
    const groupRef = doc(db, "groups", groupId);

    await updateDoc(groupRef, {
      surahId: data.surahId,
      surahName: data.surahName,
      verseRange: data.verseRange,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/wird`);
    throw error;
  }
}

export async function getGroupReflections(groupId: string) {
  if (!db) return [];

  try {
    const q = query(
      collection(db, `groups/${groupId}/reflections`),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((document) => ({
      id: document.id,
      ...(document.data() as any),
    }));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.LIST,
      `groups/${groupId}/reflections`
    );
    return [];
  }
}

export async function addGroupReflection(groupId: string, reflectionData: any) {
  if (!db) return;

  try {
    const ref = collection(db, `groups/${groupId}/reflections`);

    await addDoc(ref, {
      ...reflectionData,
      reactionUserIds: Array.isArray(reflectionData.reactionUserIds)
        ? reflectionData.reactionUserIds
        : [],
      comments: Array.isArray(reflectionData.comments)
        ? reflectionData.comments
        : [],
      isPinned: Boolean(reflectionData.isPinned),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `groups/${groupId}/reflections`
    );
    throw error;
  }
}

export async function updateGroupReflection(
  groupId: string,
  reflectionId: string,
  data: Partial<GroupReflection>
) {
  if (!db) return;

  try {
    const ref = doc(db, `groups/${groupId}/reflections`, reflectionId);

    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `groups/${groupId}/reflections/${reflectionId}`
    );
    throw error;
  }
}

export async function toggleGroupReflectionReaction(
  groupId: string,
  reflectionId: string,
  userId: string
) {
  if (!db) return;

  const reflectionRef = doc(db, `groups/${groupId}/reflections`, reflectionId);

  try {
    const reflectionSnap = await getDoc(reflectionRef);

    if (!reflectionSnap.exists()) {
      throw new Error("Reflection not found");
    }

    const currentReactions = Array.isArray(
      reflectionSnap.data().reactionUserIds
    )
      ? reflectionSnap.data().reactionUserIds
      : [];

    const updatedReactions = currentReactions.includes(userId)
      ? currentReactions.filter((id: string) => id !== userId)
      : [...currentReactions, userId];

    await updateDoc(reflectionRef, {
      reactionUserIds: updatedReactions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `groups/${groupId}/reflections/${reflectionId}`
    );
    throw error;
  }
}

// =========================
// Premium: Update Advanced Stats
// =========================
export async function updateAdvancedStats(
  userId: string,
  addedVerses: number,
  addedTimeMinutes: number,
  surahId: string,
  lastVerseNumber?: number,
  lastSurahName?: string
) {
  if (!db) return;

  try {
    const ref = doc(db, `users/${userId}/readingProgress`, "current");
    const snap = await getDoc(ref);

    let surahCounts: Record<string, number> = {};

    if (snap.exists() && snap.data().surahReadCounts) {
      surahCounts = snap.data().surahReadCounts;
    }

    let currentStreak = snap.exists() ? snap.data().currentStreak || 0 : 0;
    let longestStreak = snap.exists() ? snap.data().longestStreak || 0 : 0;

    const lastReadStr = snap.exists() ? snap.data().lastReadDate : null;
    const todayStr = new Date().toISOString().split("T")[0];

    if (lastReadStr !== todayStr) {
      if (lastReadStr) {
        const lastRead = new Date(lastReadStr);
        const today = new Date(todayStr);

        const diffDays = Math.floor(
          (today.getTime() - lastRead.getTime()) / (1000 * 3600 * 24)
        );

        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    surahCounts[surahId] = (surahCounts[surahId] || 0) + addedVerses;

    const completedSurahs: number[] =
      snap.exists() && snap.data().completedSurahs
        ? snap.data().completedSurahs
        : [];

    const numericSurahId = Number(surahId);

    if (!completedSurahs.includes(numericSurahId)) {
      if (surahCounts[surahId] >= SURAH_VERSE_COUNTS[numericSurahId - 1]) {
        completedSurahs.push(numericSurahId);
      }
    }

    const previousTotal = snap.exists() ? snap.data().totalVersesRead || 0 : 0;
    const newTotal = previousTotal + addedVerses;
    const khatmahPercentage = Math.min((newTotal / 6236) * 100, 100);
    
    const completedChallengeIds: string[] = snap.exists() && Array.isArray(snap.data().completedChallengeIds)
      ? snap.data().completedChallengeIds
      : [];
    let bonusPoints = 0;

    const updateData: any = {
      totalVersesRead: increment(addedVerses),
      totalReadTimeMinutes: increment(addedTimeMinutes),
      points: increment(addedVerses + addedTimeMinutes * 5),
      surahReadCounts: surahCounts,
      completedSurahs,
      lastReadDate: todayStr,
      currentStreak,
      longestStreak,
      khatmahPercentage,
      updatedAt: serverTimestamp(),
    };

    if (lastVerseNumber !== undefined) {
      updateData.lastSurahId = numericSurahId;
      updateData.lastVerseNumber = lastVerseNumber;
      updateData.lastSurahName = lastSurahName || "";
    }

    // --- Challenge Reward Logic ---

    // Challenge A: Complete Surah Al-Kahf (ID: 18)
    const kahfChallengeId = "weekly_surah_kahf";
    if (!completedChallengeIds.includes(kahfChallengeId)) {
      const kahfVerseCount = SURAH_VERSE_COUNTS[17]; // Surah 18 is at index 17
      if (surahCounts[surahId] >= kahfVerseCount && numericSurahId === 18) {
        bonusPoints += 50;
        completedChallengeIds.push(kahfChallengeId);
      }
    }

    // Challenge B: Read 500 Ayahs
    const read500ChallengeId = "read_500_ayahs";
    if (!completedChallengeIds.includes(read500ChallengeId)) {
      if (newTotal >= 500) {
        bonusPoints += 200;
        completedChallengeIds.push(read500ChallengeId);
      }
    }

    // Add bonus points to the total points increment
    if (bonusPoints > 0) {
      updateData.points = increment(addedVerses + (addedTimeMinutes * 5) + bonusPoints);
    }

    // Ensure the completed challenges list is updated
    if (completedChallengeIds.length > (snap.data()?.completedChallengeIds?.length || 0)) {
      updateData.completedChallengeIds = completedChallengeIds;
    }

    await setDoc(ref, updateData, { merge: true });


  } catch (error) {
    console.error("Error updating stats", error);
  }
}