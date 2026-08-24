import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { VerseMatchResult } from "./recitationMatchingService";

export interface RecitationSessionSelection {
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  verseKeys: string[];
}

export interface RecitationSessionResult {
  score: number;
  matchedWords: number;
  expectedWords: number;
  mismatchCount: number;
  feedback: VerseMatchResult[];
  durationSeconds: number;
  transcript?: string;
}

function sessionsPath(uid: string) {
  return `users/${uid}/recitationSessions`;
}

export async function createRecitationSession(
  uid: string,
  selection: RecitationSessionSelection,
): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, sessionsPath(uid)), {
      userId: uid,
      ...selection,
      status: "started",
      engine: "web-speech",
      recognitionLanguage: "ar-SA",
      startedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, sessionsPath(uid));
    return null;
  }
}

export async function completeRecitationSession(
  uid: string,
  sessionId: string,
  result: RecitationSessionResult,
) {
  if (!db) return;
  try {
    await updateDoc(doc(db, sessionsPath(uid), sessionId), {
      ...result,
      status: "completed",
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${sessionsPath(uid)}/${sessionId}`);
  }
}

export async function abandonRecitationSession(uid: string, sessionId: string) {
  if (!db) return;
  try {
    await updateDoc(doc(db, sessionsPath(uid), sessionId), {
      status: "abandoned",
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${sessionsPath(uid)}/${sessionId}`);
  }
}

export async function getRecentRecitationSessions(uid: string, maxResults = 10) {
  if (!db) return [];
  try {
    const sessionsQuery = query(
      collection(db, sessionsPath(uid)),
      orderBy("startedAt", "desc"),
      limit(maxResults),
    );
    const snapshot = await getDocs(sessionsQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, sessionsPath(uid));
    return [];
  }
}
