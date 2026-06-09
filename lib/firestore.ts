import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import type { Data, Datum } from "family-chart";

const PEOPLE_COLLECTION = "people";
const peopleRef = collection(db, PEOPLE_COLLECTION);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function fetchPeople(): Promise<Data> {
  const snapshot = await withTimeout(getDocs(peopleRef), 8000);
  return snapshot.docs.map((d) => d.data() as Datum);
}

export async function savePeople(people: Data): Promise<void> {
  const batch = writeBatch(db);

  for (const person of people) {
    const ref = doc(peopleRef, person.id);
    batch.set(ref, person);
  }

  const existing = await getDocs(peopleRef);
  const currentIds = new Set(people.map((p) => p.id));
  for (const d of existing.docs) {
    if (!currentIds.has(d.id)) {
      batch.delete(d.ref);
    }
  }

  await batch.commit();
}
