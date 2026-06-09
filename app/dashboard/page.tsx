"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createTree, getUserTrees, updateTreeName } from "@/lib/firestore";

const token = {
  bg:          "#0c0c0c",
  surface:     "#141414",
  surfaceHigh: "#1c1c1c",
  border:      "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  gold:        "#c9a96e",
  goldDim:     "rgba(201,169,110,0.15)",
  text:        "#f0ede8",
  textMuted:   "#7a7672",
  textDim:     "#4a4846",
  accent:      "#3b82f6",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  .db-root * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }

  .db-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 20px;
    background: ${token.surface};
    border-bottom: 1px solid ${token.border};
    box-shadow: 0 1px 0 0 ${token.gold}22;
    position: relative;
    flex-shrink: 0;
  }
  .db-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, ${token.gold} 40%, ${token.gold} 60%, transparent 100%);
    opacity: 0.6;
  }

  .db-header-left  { display: flex; align-items: center; gap: 4px; flex: 1; }
  .db-header-title { flex: 0 1 auto; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: ${token.text}; letter-spacing: 0.02em; }
  .db-header-right { display: flex; align-items: center; gap: 4px; flex: 1; justify-content: flex-end; }

  .db-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: ${token.textMuted};
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: color .15s, background .15s, border-color .15s;
    white-space: nowrap;
  }
  .db-btn:hover {
    color: ${token.text};
    background: ${token.surfaceHigh};
    border-color: ${token.border};
  }

  .db-btn-danger:hover {
    color: #f87171;
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.2);
  }

  .db-divider {
    width: 1px;
    height: 18px;
    background: ${token.border};
    margin: 0 6px;
    flex-shrink: 0;
  }

  .db-email {
    font-size: 12px;
    color: ${token.textDim};
    font-weight: 400;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  /* ── main area ───────────────────────────────────────────────────────── */
  .db-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    overflow-y: auto;
  }
  .db-content {
    width: 100%;
    max-width: 780px;
  }

  /* ── create bar ──────────────────────────────────────────────────────── */
  .db-create-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
  }
  .db-create-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px dashed ${token.borderHover};
    background: transparent;
    color: ${token.textMuted};
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: border-color .2s, background .2s, color .2s;
    width: 100%;
    justify-content: center;
    margin-bottom: 32px;
  }
  .db-create-btn:hover {
    border-color: ${token.gold}55;
    background: ${token.goldDim};
    color: ${token.gold};
  }
  .db-create-btn::before {
    content: '+';
    font-size: 18px;
    font-weight: 300;
    line-height: 1;
    color: ${token.textDim};
    transition: color .2s;
  }
  .db-create-btn:hover::before { color: ${token.gold}; }

  .db-create-input {
    flex: 1;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid ${token.borderHover};
    background: ${token.surfaceHigh};
    color: ${token.text};
    font-size: 13px;
    outline: none;
    transition: border-color .15s;
  }
  .db-create-input:focus { border-color: ${token.gold}55; box-shadow: 0 0 0 3px ${token.gold}11; }
  .db-create-input::placeholder { color: ${token.textDim}; }

  .db-create-submit {
    padding: 10px 18px;
    border-radius: 7px;
    border: none;
    background: ${token.gold};
    color: #0c0c0c;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
    white-space: nowrap;
  }
  .db-create-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .db-create-submit:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

  .db-create-cancel {
    padding: 5px 10px;
    background: transparent;
    border: none;
    color: ${token.textDim};
    font-size: 12px;
    cursor: pointer;
    transition: color .15s;
  }
  .db-create-cancel:hover { color: ${token.textMuted}; }

  /* ── tree cards ──────────────────────────────────────────────────────── */
  .db-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  .db-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 18px 18px 16px;
    border-radius: 10px;
    border: 1px solid ${token.border};
    background: ${token.surface};
    cursor: pointer;
    transition: border-color .2s, background .2s, transform .15s;
    text-align: left;
  }
  .db-card:hover {
    border-color: ${token.borderHover};
    background: ${token.surfaceHigh};
    transform: translateY(-2px);
  }
  .db-card-inner { display: flex; flex-direction: column; gap: 4px; }

  .db-card-name {
    font-size: 14px;
    font-weight: 500;
    color: ${token.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 44px;
  }
  .db-card-date {
    font-size: 11px;
    color: ${token.textDim};
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .db-card-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity .15s;
  }
  .db-card:hover .db-card-actions { opacity: 1; }

  .db-card-action {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: ${token.textDim};
    font-size: 14px;
    cursor: pointer;
    transition: color .15s, background .15s;
  }
  .db-card-action:hover { background: rgba(255,255,255,0.06); }
  .db-card-rename:hover { color: ${token.textMuted}; }
  .db-card-delete:hover { color: #f87171; }

  .db-card-rename-input {
    width: 100%;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid ${token.gold}55;
    background: ${token.surfaceHigh};
    color: ${token.text};
    font-size: 13px;
    outline: none;
    box-shadow: 0 0 0 3px ${token.gold}11;
  }

  /* empty state */
  .db-empty {
    text-align: center;
    padding: 60px 20px;
    color: ${token.textDim};
  }
  .db-empty-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.4; }
  .db-empty-title { font-size: 14px; font-weight: 500; color: ${token.textMuted}; margin-bottom: 6px; }
  .db-empty-desc { font-size: 12px; color: ${token.textDim}; }

  /* ── loading overlay ─────────────────────────────────────────────────── */
  .db-loading {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: ${token.bg};
    gap: 16px;
  }
  .db-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid ${token.border};
    border-top-color: ${token.gold};
    border-radius: 50%;
    animation: db-spin 0.8s linear infinite;
  }
  @keyframes db-spin { to { transform: rotate(360deg); } }
  .db-loading-text {
    font-size: 12px;
    color: ${token.textMuted};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`;

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
      <div className="db-root" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100vh", background: token.bg, color: token.text }}>
        <style>{styles}</style>
        <div className="db-loading">
          <div className="db-spinner" />
          <span className="db-loading-text">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100vh", background: token.bg, color: token.text }}>
      <style>{styles}</style>

      {/* loading overlay */}
      {loadingTrees && (
        <div className="db-loading">
          <div className="db-spinner" />
          <span className="db-loading-text">Loading trees</span>
        </div>
      )}

      {/* header */}
      <header className="db-header">
        <div className="db-header-left" />
        <div className="db-header-title">My Family Trees</div>
        <div className="db-header-right">
          <span className="db-email">{user?.email}</span>
          <div className="db-divider" />
          <button className="db-btn db-btn-danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* main */}
      <div className="db-main">
        <div className="db-content">
          {/* create bar */}
          {!showCreateInput ? (
            <button className="db-create-btn" onClick={() => setShowCreateInput(true)}>
              New Family Tree
            </button>
          ) : (
            <div className="db-create-bar">
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowCreateInput(false); setCreateName(""); }
                }}
                placeholder="Tree name..."
                className="db-create-input"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="db-create-submit"
              >
                {creating ? "Creating" : "Create"}
              </button>
              <button
                onClick={() => { setShowCreateInput(false); setCreateName(""); }}
                className="db-create-cancel"
              >
                Cancel
              </button>
            </div>
          )}

          {/* tree grid */}
          {!loadingTrees && trees.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon">🌳</div>
              <div className="db-empty-title">No trees yet</div>
              <div className="db-empty-desc">Create your first family tree above</div>
            </div>
          ) : (
            <div className="db-grid">
              {trees.map((tree) =>
                renamingId === tree.id ? (
                  <div key={tree.id} className="db-card" style={{ cursor: "default" }}>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={submitRename}
                      className="db-card-rename-input"
                    />
                  </div>
                ) : (
                  <button
                    key={tree.id}
                    onClick={() => router.push(`/tree/${tree.id}`)}
                    className="db-card"
                  >
                    <div className="db-card-inner">
                      <span className="db-card-name">{tree.name}</span>
                      <span className="db-card-date">{tree.createdAt.toLocaleDateString()}</span>
                    </div>
                    <div className="db-card-actions">
                      <span
                        className="db-card-action db-card-rename"
                        onClick={(e) => startRename(e, tree)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startRename(e as unknown as React.MouseEvent, tree); } }}
                      >
                        ✎
                      </span>
                      <span
                        className="db-card-action db-card-delete"
                        onClick={(e) => handleDelete(e, tree.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(e as unknown as React.MouseEvent, tree.id); } }}
                      >
                        ✕
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
