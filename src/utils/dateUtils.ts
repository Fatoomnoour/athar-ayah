import { Timestamp } from "firebase/firestore";

type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
  toDate?: () => Date;
};

type DateLike =
  | Timestamp
  | Date
  | string
  | number
  | FirestoreTimestampLike
  | null
  | undefined;

function toSafeDate(dateValue: DateLike): Date | null {
  if (!dateValue) {
    return null;
  }

  try {
    // Firestore Timestamp instance
    if (dateValue instanceof Timestamp) {
      return dateValue.toDate();
    }

    // Firestore Timestamp-like object with toDate()
    if (
      typeof dateValue === "object" &&
      typeof dateValue.toDate === "function"
    ) {
      return dateValue.toDate();
    }

    // JS Date
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Firestore Timestamp object: { seconds, nanoseconds }
    if (
      typeof dateValue === "object" &&
      typeof dateValue.seconds === "number"
    ) {
      return new Date(dateValue.seconds * 1000);
    }

    // Serialized Firestore Timestamp: { _seconds, _nanoseconds }
    if (
      typeof dateValue === "object" &&
      typeof dateValue._seconds === "number"
    ) {
      return new Date(dateValue._seconds * 1000);
    }

    // ISO string / normal date string / timestamp number
    const parsedDate = new Date(dateValue as string | number);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  } catch {
    return null;
  }
}

export function formatFirestoreDate(dateValue: DateLike): string {
  const date = toSafeDate(dateValue);

  if (!date || Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatFirestoreDateTime(dateValue: DateLike): string {
  const date = toSafeDate(dateValue);

  if (!date || Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}