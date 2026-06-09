"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createTree, getUserTrees, updateTreeName } from "@/lib/firestore";

interface TreeItem {
  id: string;
  name: string;
  createdAt: Date;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [loadingTrees, setLoadingTrees] = useState(true);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const items = await getUserTrees(user.uid);
        setTrees(items);
      } catch (err) {
        console.warn("[dashboard] Failed to load trees:", err);
      } finally {
        setLoadingTrees(false);
      }
    })();
  }, [user, authLoading, router]);

  const handleCreate = async () => {
    if (!user || creating || !createName.trim()) return;
    setCreating(true);
    try {
      const id = await createTree(user.uid, createName.trim());
      router.push(`/tree/${id}`);
    } catch (err) {
      console.error("[dashboard] Failed to create tree:", err);
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, treeId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this tree permanently?")) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      await deleteDoc(doc(db, "trees", treeId));
      setTrees((prev) => prev.filter((t) => t.id !== treeId));
    } catch (err) {
      console.error("[dashboard] Failed to delete tree:", err);
    }
  };

  const startRename = (e: React.MouseEvent, tree: TreeItem) => {
    e.stopPropagation();
    setRenamingId(tree.id);
    setRenameValue(tree.name);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await updateTreeName(renamingId, renameValue.trim());
      setTrees((prev) =>
        prev.map((t) =>
          t.id === renamingId ? { ...t, name: renameValue.trim() } : t
        )
      );
    } catch (err) {
      console.error("[dashboard] Failed to rename tree:", err);
    }
    setRenamingId(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[rgb(33,33,33)] text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(33,33,33)] text-white">
      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold">My Family Trees</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button
            onClick={signOut}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        {!showCreateInput ? (
          <button
            onClick={() => setShowCreateInput(true)}
            className="mb-6 rounded-lg border-2 border-dashed border-gray-600 px-6 py-3 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
          >
            + New Family Tree
          </button>
        ) : (
          <div className="mb-6 flex items-center gap-2">
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowCreateInput(false);
                  setCreateName("");
                }
              }}
              placeholder="Tree name..."
              className="rounded-lg border border-gray-600 bg-[rgb(40,40,40)] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-400 w-64"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreateInput(false);
                setCreateName("");
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {loadingTrees ? (
          <p className="text-gray-400">Loading trees...</p>
        ) : trees.length === 0 ? (
          <p className="text-gray-500">
            No trees yet. Create your first one above.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trees.map((tree) =>
              renamingId === tree.id ? (
                <div
                  key={tree.id}
                  className="rounded-lg border border-gray-700 bg-[rgb(40,40,40)] p-5"
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={submitRename}
                    className="w-full rounded border border-gray-600 bg-[rgb(55,55,55)] px-2 py-1 text-sm text-white outline-none focus:border-gray-400"
                  />
                </div>
              ) : (
                <button
                  key={tree.id}
                  onClick={() => router.push(`/tree/${tree.id}`)}
                  className="group relative rounded-lg border border-gray-700 bg-[rgb(40,40,40)] p-5 text-left hover:border-gray-500 transition-colors"
                >
                  <p className="font-medium truncate pr-12">{tree.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tree.createdAt.toLocaleDateString()}
                  </p>
                  <span
                    onClick={(e) => { e.stopPropagation(); startRename(e, tree); }}
                    className="absolute right-8 top-3 text-gray-600 hover:text-white transition-colors text-sm cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startRename(e as unknown as React.MouseEvent, tree); } }}
                  >
                    ✎
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDelete(e, tree.id); }}
                    className="absolute right-3 top-3 text-gray-600 hover:text-red-400 transition-colors text-sm cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(e as unknown as React.MouseEvent, tree.id); } }}
                  >
                    ✕
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
