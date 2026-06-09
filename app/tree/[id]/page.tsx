"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import * as f3 from "family-chart";
import "family-chart/styles/family-chart.css";
import { useAuth } from "@/lib/auth";
import { getTree, updateTreePeople, updateTreeName } from "@/lib/firestore";
import { createEditForm, createNewForm } from "@/lib/family-form";
import type { Data, Datum } from "family-chart";
import { RelationShipFinder, mergeSteps, stepsToCode, findRelation } from "@/utils/relationship";

const DEFAULT_PEOPLE: Data = [
  {
    id: "0",
    rels: { parents: [], spouses: [], children: [] },
    data: {
      "first name": "Name",
      "last name": "Surname",
      birthday: 1970,
      avatar:
        "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
      gender: "M" as const,
    },
  },
];

/* ── design tokens ────────────────────────────────────────────────────────── */
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

  .tp-root * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }

  /* header */
  .tp-header {
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
  .tp-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, ${token.gold} 40%, ${token.gold} 60%, transparent 100%);
    opacity: 0.6;
  }

  /* nav groups */
  .tp-nav-left  { display: flex; align-items: center; gap: 4px; flex: 1; }
  .tp-nav-title { flex: 0 1 auto; display: flex; align-items: center; justify-content: center; }
  .tp-nav-right { display: flex; align-items: center; gap: 4px; flex: 1; justify-content: flex-end; }

  /* nav buttons */
  .tp-btn {
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
  .tp-btn:hover {
    color: ${token.text};
    background: ${token.surfaceHigh};
    border-color: ${token.border};
  }
  .tp-btn-back::before { content: '←'; font-size: 13px; opacity: 0.7; }

  .tp-btn-active {
    color: ${token.gold};
    background: ${token.goldDim};
    border-color: ${token.gold}33;
  }
  .tp-btn-active:hover {
    color: ${token.gold};
    background: ${token.goldDim};
    border-color: ${token.gold}55;
  }

  /* sign out — subtle red on hover */
  .tp-btn-danger:hover {
    color: #f87171;
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.2);
  }

  /* tree name */
  .tp-tree-name {
    font-size: 13px;
    font-weight: 500;
    color: ${token.text};
    letter-spacing: 0.02em;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 5px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: background .15s, border-color .15s;
  }
  .tp-tree-name:hover {
    background: ${token.surfaceHigh};
    border-color: ${token.border};
  }
  .tp-tree-input {
    font-size: 13px;
    font-weight: 500;
    color: ${token.text};
    background: ${token.surfaceHigh};
    border: 1px solid ${token.gold}55;
    border-radius: 6px;
    padding: 5px 10px;
    outline: none;
    text-align: center;
    max-width: 200px;
    box-shadow: 0 0 0 3px ${token.gold}11;
  }

  /* divider between button groups */
  .tp-divider {
    width: 1px;
    height: 18px;
    background: ${token.border};
    margin: 0 6px;
    flex-shrink: 0;
  }

  /* ── compare panel ─────────────────────────────────────────────────────── */
  .tp-panel {
    position: absolute;
    left: 16px;
    top: 16px;
    z-index: 20;
    width: 260px;
    background: rgba(18,18,18,0.92);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid ${token.border};
    border-radius: 12px;
    overflow: visible;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset;
  }
  .tp-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid ${token.border};
  }
  .tp-panel-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${token.gold};
    flex-shrink: 0;
  }
  .tp-panel-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${token.textMuted};
  }
  .tp-panel-body { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; }

  /* slot picker */
  .tp-slot {
    padding: 8px 10px;
    cursor: pointer;
    border-radius: 7px;
    border: 1px solid ${token.border};
    background: ${token.surfaceHigh};
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 40px;
    transition: border-color .15s, background .15s;
  }
  .tp-slot:hover { border-color: ${token.borderHover}; background: #222; }
  .tp-slot-active { border-color: ${token.gold}55 !important; background: ${token.goldDim} !important; }

  .tp-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid ${token.border};
  }
  .tp-avatar-empty {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${token.surfaceHigh};
    border: 1px dashed ${token.border};
    flex-shrink: 0;
  }
  .tp-slot-label { font-size: 12.5px; color: ${token.text}; }
  .tp-slot-placeholder { font-size: 12px; color: ${token.textDim}; font-style: italic; }

  /* dropdown list */
  .tp-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    z-index: 30;
    background: #1a1a1a;
    border: 1px solid ${token.borderHover};
    border-radius: 8px;
    max-height: 180px;
    overflow-y: auto;
    box-shadow: 0 8px 24px rgba(0,0,0,.5);
  }
  .tp-dropdown::-webkit-scrollbar { width: 4px; }
  .tp-dropdown::-webkit-scrollbar-track { background: transparent; }
  .tp-dropdown::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

  .tp-dropdown-item {
    padding: 7px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12.5px;
    color: ${token.text};
    transition: background .1s;
  }
  .tp-dropdown-item:hover { background: #242424; }
  .tp-dropdown-item-selected { background: #222; color: ${token.gold}; }

  /* compare button */
  .tp-compare-btn {
    margin-top: 2px;
    padding: 8px;
    font-size: 12.5px;
    font-weight: 500;
    border: none;
    border-radius: 7px;
    background: ${token.gold};
    color: #0c0c0c;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition: opacity .15s, transform .1s;
  }
  .tp-compare-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .tp-compare-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

  /* results */
  .tp-results {
    border-top: 1px solid ${token.border};
    padding-top: 10px;
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tp-results-label {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${token.textDim};
    margin-bottom: 2px;
  }
  .tp-result-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 10px;
    background: ${token.surfaceHigh};
    border-radius: 7px;
    border: 1px solid ${token.border};
  }
  .tp-result-code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: ${token.textMuted};
    flex-shrink: 0;
  }
  .tp-result-telugu {
    font-size: 14px;
    font-weight: 500;
    color: ${token.gold};
    letter-spacing: 0.01em;
  }

  /* loading overlay */
  .tp-loading {
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
  .tp-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid ${token.border};
    border-top-color: ${token.gold};
    border-radius: 50%;
    animation: tp-spin 0.8s linear infinite;
  }
  @keyframes tp-spin { to { transform: rotate(360deg); } }
  .tp-loading-text {
    font-size: 12px;
    color: ${token.textMuted};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`;

export default function TreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: treeId } = use(params);
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [treeName, setTreeName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editing, setEditing] = useState(true);
  const f3ChartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);
  const f3EditTreeRef = useRef<
    ReturnType<ReturnType<typeof f3.createChart>["editTree"]> | null
  >(null);
  const f3CardRef = useRef<ReturnType<ReturnType<typeof f3.createChart>["setCardHtml"]> | null>(null);
  const peopleRef = useRef<Datum[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareP1, setCompareP1] = useState("");
  const [compareP2, setCompareP2] = useState("");
  const [compareSelecting, setCompareSelecting] = useState<1 | 2 | null>(null);
  const [compareResults, setCompareResults] = useState<
    Array<{ code: string; telugu: string | null }>
  >([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    const key = `refreshed-tree`;
    if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); return; }
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, []);

  useEffect(() => {
    if (authLoading || !user || !chartRef.current) return;
    let f3Chart: ReturnType<typeof f3.createChart> | null = null;
    let f3EditTree: ReturnType<ReturnType<typeof f3.createChart>["editTree"]> | null = null;
    let cancelled = false;

    async function init() {
      let familyData: Data;
      try {
        const tree = await getTree(treeId);
        if (!tree) return;
        setTreeName(tree.name);
        familyData = tree.people;
      } catch {
        familyData = DEFAULT_PEOPLE;
      }
      if (!chartRef.current) return;
      if (familyData.length === 0) familyData = DEFAULT_PEOPLE;

      f3Chart = f3
        .createChart("#FamilyChart", familyData)
        .setTransitionTime(1000)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setSingleParentEmptyCard(true, { label: "ADD" })
        .setShowSiblingsOfMain(true)
        .setOrientationVertical();

      const f3Card = f3Chart
        .setCardHtml()
        .setCardDisplay([["first name", "last name"], ["birthday"]])
        .setCardDim({})
        .setMiniTree(true)
        .setStyle("imageCircle")
        .setOnHoverPathToMain();

      f3EditTree = f3Chart
        .editTree()
        .fixed()
        .setFields(["first name", "last name", "birthday", "avatar"])
        .setEditFirst(true)
        .setCreateFormEdit(createEditForm)
        .setCreateFormNew(createNewForm)
        .setOnChange(() => {
          if (!f3EditTree) return;
          const data = f3EditTree.exportData() as Data;
          updateTreePeople(treeId, data).catch(console.warn);
        });

      f3ChartRef.current = f3Chart;
      f3EditTreeRef.current = f3EditTree;
      f3CardRef.current = f3Card;
      peopleRef.current = familyData;

      if (editing) {
        f3EditTree.setEdit();
        f3EditTree.setCardClickOpen(f3Card);
        f3Chart.updateTree({ initial: true });
        if (familyData.length > 0) {
          f3EditTree.open(f3Chart.getMainDatum());
          f3Chart.updateTree({ initial: true });
        }
      } else {
        f3EditTree.setNoEdit();
        f3Card.setOnCardClick(() => {});
        f3Chart.updateTree({ initial: true });
      }
      setLoading(false);
    }

    init();
    return () => { cancelled = true; f3EditTree?.destroy(); };
  }, [treeId, user, authLoading]);

  const handleCompare = () => {
    if (!compareP1 || !compareP2 || compareP1 === compareP2) return;
    const people = peopleRef.current;
    const finder = new RelationShipFinder(people);
    const allPaths = finder.findAllPaths(compareP1, compareP2);
    const seen = new Set<string>();
    const all: Array<{ code: string; telugu: string | null; genDelta: number }> = [];
    for (const path of allPaths) {
      const merged = mergeSteps(path);
      const code = stepsToCode(merged);
      if (seen.has(code)) continue;
      seen.add(code);
      const genDelta = merged.reduce(
        (acc, s) => acc + (s.type === "parent" ? 1 : s.type === "child" ? -1 : 0), 0
      );
      let telugu: string | null = null;
      try { telugu = findRelation(code); } catch {}
      all.push({ code, telugu, genDelta });
    }
    const gens = [...new Set(all.map((r) => r.genDelta))];
    const results =
      gens.length <= 1
        ? all.slice(0, 1)
        : all.filter((r) => r.genDelta === gens[0]).slice(0, 1)
            .concat(all.filter((r) => r.genDelta !== gens[0]).slice(0, 1));
    setCompareResults(results);
  };

  const people = peopleRef.current;

  const renderSlot = (slot: 1 | 2) => {
    const pid = slot === 1 ? compareP1 : compareP2;
    const isSelecting = compareSelecting === slot;
    const selected = pid ? people.find((p) => p.id === pid) : null;
    const label = selected
      ? (`${selected.data["first name"] || ""} ${selected.data["last name"] || ""}`.trim() || selected.id)
      : null;

    return (
      <div key={slot} style={{ position: "relative" }}>
        <div
          className={`tp-slot${isSelecting ? " tp-slot-active" : ""}`}
          onClick={() => setCompareSelecting(isSelecting ? null : slot)}
        >
          {selected ? (
            selected.data.avatar ? (
              <img src={selected.data.avatar} className="tp-avatar" alt=""
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }} />
            ) : (
              <div className="tp-avatar-empty" />
            )
          ) : (
            <div className="tp-avatar-empty" />
          )}
          {selected
            ? <span className="tp-slot-label">{label}</span>
            : <span className="tp-slot-placeholder">Select person {slot}</span>
          }
        </div>

        {isSelecting && (
          <div className="tp-dropdown">
            {people.filter((p) => p.id && p.data).map((p) => {
              const name = `${p.data["first name"] || ""} ${p.data["last name"] || ""}`.trim() || p.id;
              return (
                <div
                  key={p.id}
                  className={`tp-dropdown-item${pid === p.id ? " tp-dropdown-item-selected" : ""}`}
                  onClick={() => {
                    if (slot === 1) setCompareP1(p.id); else setCompareP2(p.id);
                    setCompareSelecting(null);
                  }}
                >
                  {p.data.avatar ? (
                    <img src={p.data.avatar} className="tp-avatar" alt=""
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }} />
                  ) : (
                    <div className="tp-avatar-empty" />
                  )}
                  <span>{name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tp-root" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100vh", background: token.bg, color: token.text }}>
      <style>{styles}</style>

      {/* ── loading overlay ─────────────────────────────────────────────── */}
      {(authLoading || loading) && (
        <div className="tp-loading">
          <div className="tp-spinner" />
          <span className="tp-loading-text">{authLoading ? "Authenticating" : "Loading tree"}</span>
        </div>
      )}

      {/* ── header ──────────────────────────────────────────────────────── */}
      <header className="tp-header">
        {/* left */}
        <div className="tp-nav-left">
          <button className="tp-btn tp-btn-back" onClick={() => router.push("/dashboard")}>
            Dashboard
          </button>
        </div>

        {/* centre — tree name */}
        <div className="tp-nav-title">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateTreeName(treeId, treeName.trim()).catch(console.warn);
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              onBlur={() => setEditingName(false)}
              className="tp-tree-input"
            />
          ) : (
            <button className="tp-tree-name" onClick={() => setEditingName(true)}>
              {treeName}
            </button>
          )}
        </div>

        {/* right */}
        <div className="tp-nav-right">
          <button
            className={`tp-btn${compareOpen ? " tp-btn-active" : ""}`}
            onClick={() => { setCompareOpen((v) => !v); setCompareResults([]); }}
          >
            Compare
          </button>

          <div className="tp-divider" />

          <button
            className={`tp-btn${editing ? " tp-btn-active" : ""}`}
            onClick={() => {
              const next = !editing;
              const chart = f3ChartRef.current;
              const editTree = f3EditTreeRef.current;
              const card = f3CardRef.current;
              if (next) {
                editTree?.setEdit();
                if (card && editTree) editTree.setCardClickOpen(card);
                if (chart) { editTree?.open(chart.getMainDatum()); chart.updateTree({ initial: true }); }
              } else {
                editTree?.setNoEdit();
                editTree?.closeForm();
                card?.setOnCardClick(() => {});
                chart?.updateTree({ initial: true });
              }
              setEditing(next);
            }}
          >
            {editing ? "Editing" : "Edit"}
          </button>

          <div className="tp-divider" />

          <button className="tp-btn tp-btn-danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── compare panel ───────────────────────────────────────────────── */}
      {compareOpen && (
        <div className="tp-panel" onClick={(e) => e.stopPropagation()}>
          <div className="tp-panel-header">
            <div className="tp-panel-dot" />
            <span className="tp-panel-title">Relationship Finder</span>
          </div>

          <div className="tp-panel-body">
            {renderSlot(1)}
            {renderSlot(2)}

            <button
              className="tp-compare-btn"
              onClick={handleCompare}
              disabled={!compareP1 || !compareP2}
            >
              Find Relation
            </button>

            {compareResults.length > 0 && (
              <div className="tp-results">
                <div className="tp-results-label">Result</div>
                {compareResults.map((r, i) => (
                  <div key={i} className="tp-result-row">
                    <span className="tp-result-code">{r.code}</span>
                    {r.telugu && <span className="tp-result-telugu">{r.telugu}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── chart canvas ────────────────────────────────────────────────── */}
      <div
        ref={chartRef}
        id="FamilyChart"
        className="f3"
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          backgroundColor: token.bg,
          color: "#fff",
        }}
      />
    </div>
  );
}