import { db } from "./firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import type { Data } from "family-chart";

export interface TreeDoc {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  people: Data;
}

const treesRef = collection(db, "trees");

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function createTree(
  userId: string,
  name: string
): Promise<string> {
  const ref = await addDoc(treesRef, {
    userId,
    name,
    createdAt: serverTimestamp(),
    people: [],
  });
  return ref.id;
}

export async function getUserTrees(
  userId: string
): Promise<Pick<TreeDoc, "id" | "name" | "createdAt">[]> {
  const q = query(treesRef, where("userId", "==", userId));
  const snapshot = await withTimeout(getDocs(q), 8000);
  return snapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    createdAt: d.data().createdAt?.toDate() ?? new Date(),
  }));
}

export async function getTree(treeId: string): Promise<TreeDoc | null> {
  const snap = await withTimeout(getDoc(doc(treesRef, treeId)), 8000);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as TreeDoc;
}

export async function updateTreePeople(
  treeId: string,
  people: Data
): Promise<void> {
  await updateDoc(doc(treesRef, treeId), { people });
}

export async function updateTreeName(
  treeId: string,
  name: string
): Promise<void> {
  await updateDoc(doc(treesRef, treeId), { name });
}
