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
    if (!user) {
      router.replace("/");
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    const key = `refreshed-tree`;
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, []);

  useEffect(() => {
    if (authLoading || !user || !chartRef.current) return;

    let f3Chart: ReturnType<typeof f3.createChart> | null = null;
    let f3EditTree: ReturnType<
      ReturnType<typeof f3.createChart>["editTree"]
    > | null = null;

    let cancelled = false;

    async function init() {
      console.log("[tree] Loading tree:", treeId);

      let familyData: Data;

      try {
        const tree = await getTree(treeId);
        if (!tree) {
          console.warn("[tree] Tree not found");
          return;
        }
        setTreeName(tree.name);
        familyData = tree.people;
        console.log("[tree] Loaded", familyData.length, "people");
      } catch (err) {
        console.warn("[tree] Failed to load from Firestore:", err);
        familyData = DEFAULT_PEOPLE;
      }

      if (!chartRef.current) return;

      if (familyData.length === 0) {
        familyData = DEFAULT_PEOPLE;
      }

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
        .setCardDisplay([
          ["first name", "last name"],
          ["birthday"],
        ])
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
          updateTreePeople(treeId, data).catch((err) =>
            console.warn("[tree] Save failed:", err)
          );
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

    return () => {
      cancelled = true;
      f3EditTree?.destroy();
    };
  }, [treeId, user, authLoading]);

  const handleCompare = () => {
    if (!compareP1 || !compareP2 || compareP1 === compareP2) return;
    const people = peopleRef.current;
    const finder = new RelationShipFinder(people);
    const allPaths = finder.findAllPaths(compareP1, compareP2);
    const seen = new Set<string>();
    const all: Array<{
      code: string;
      telugu: string | null;
      genDelta: number;
    }> = [];
    for (const path of allPaths) {
      const merged = mergeSteps(path);
      const code = stepsToCode(merged);
      if (seen.has(code)) continue;
      seen.add(code);
      const genDelta = merged.reduce(
        (acc, s) =>
          acc + (s.type === "parent" ? 1 : s.type === "child" ? -1 : 0),
        0
      );
      let telugu: string | null = null;
      try {
        telugu = findRelation(code);
      } catch {}
      all.push({ code, telugu, genDelta });
    }
    const gens = [...new Set(all.map((r) => r.genDelta))];
    const results =
      gens.length <= 1
        ? all.slice(0, 1)
        : all
            .filter((r) => r.genDelta === gens[0])
            .slice(0, 1)
            .concat(
              all.filter((r) => r.genDelta !== gens[0]).slice(0, 1)
            );
    setCompareResults(results);
  };

  return (
    <div className="relative flex flex-col h-screen bg-[rgb(33,33,33)]">
      {(authLoading || loading) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(33,33,33)] text-white">
          <p>{authLoading ? "Loading..." : "Loading family tree..."}</p>
        </div>
      )}
      <div className="flex items-center justify-between bg-[rgb(40,40,40)] px-4 py-2 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
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
            className="rounded border border-gray-600 bg-[rgb(55,55,55)] px-2 py-0.5 text-sm text-white outline-none text-center"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-medium truncate mx-4 hover:text-gray-300 transition-colors"
          >
            {treeName}
          </button>
        )}
        <button
          onClick={() => {
            const next = !editing;
            const chart = f3ChartRef.current;
            const editTree = f3EditTreeRef.current;
            const card = f3CardRef.current;
            if (next) {
              editTree?.setEdit();
              if (card && editTree) editTree.setCardClickOpen(card);
              if (chart) {
                editTree?.open(chart.getMainDatum());
                chart.updateTree({ initial: true });
              }
            } else {
              editTree?.setNoEdit();
              editTree?.closeForm();
              card?.setOnCardClick(() => {});
              chart?.updateTree({ initial: true });
            }
            setEditing(next);
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {editing ? "View" : "Edit"}
        </button>
        <button
          onClick={() => {
            setCompareOpen((v) => !v);
            setCompareResults([]);
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {compareOpen ? "Close" : "Compare"}
        </button>
        <button
          onClick={signOut}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
      {compareOpen && (
        <div
          className="absolute z-10"
          style={{
            left: 8,
            top: 8,
            background: "#1e1e1e",
            color: "#eee",
            borderRadius: 6,
            padding: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,.4)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 240,
            maxHeight: "80vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 700 }}>Compare Two People</div>
          {([1, 2] as const).map((slot) => {
            const pid = slot === 1 ? compareP1 : compareP2;
            const isSelecting = compareSelecting === slot;
            const people = peopleRef.current;
            const selected = pid
              ? people.find((p) => p.id === pid)
              : null;
            return (
              <div key={slot} style={{ position: "relative" }}>
                <div
                  onClick={() =>
                    setCompareSelecting(
                      isSelecting ? null : slot
                    )
                  }
                  style={{
                    padding: "6px 10px",
                    cursor: "pointer",
                    borderRadius: 4,
                    background: isSelecting ? "#333" : "#2a2a2a",
                    border: isSelecting
                      ? "1px solid #555"
                      : "1px solid #444",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 36,
                  }}
                >
                  {selected ? (
                    <>
                      {selected.data.avatar ? (
                        <img
                          src={selected.data.avatar}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          alt=""
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLElement
                            ).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "#555",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span>{`${
                        selected.data["first name"] || ""
                      } ${
                        selected.data["last name"] || ""
                      }`.trim() || selected.id}</span>
                    </>
                  ) : (
                    <span style={{ color: "#888" }}>
                      — Select person {slot} —
                    </span>
                  )}
                </div>
                {isSelecting && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      background: "#2a2a2a",
                      borderRadius: 4,
                      marginTop: 2,
                      maxHeight: 200,
                      overflowY: "auto",
                      border: "1px solid #444",
                    }}
                  >
                    {people
                      .filter((p) => p.id && p.data)
                      .map((p) => {
                        const name =
                          `${
                            p.data["first name"] || ""
                          } ${p.data["last name"] || ""}`.trim() ||
                          p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (slot === 1)
                                setCompareP1(p.id);
                              else setCompareP2(p.id);
                              setCompareSelecting(null);
                            }}
                            style={{
                              padding: "6px 10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              background:
                                pid === p.id
                                  ? "#444"
                                  : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (pid !== p.id)
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background = "#333";
                            }}
                            onMouseLeave={(e) => {
                              if (pid !== p.id)
                                (
                                  e.currentTarget as HTMLElement
                                ).style.background = "";
                            }}
                          >
                            {p.data.avatar ? (
                              <img
                                src={p.data.avatar}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                                alt=""
                                onError={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#555",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span>{name}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={handleCompare}
            disabled={!compareP1 || !compareP2}
            style={{
              padding: "6px 14px",
              cursor:
                !compareP1 || !compareP2
                  ? "not-allowed"
                  : "pointer",
              fontSize: 13,
              opacity: !compareP1 || !compareP2 ? 0.5 : 1,
              background: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
          >
            Compare
          </button>
          {compareResults.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #444",
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#aaa",
                  marginBottom: 4,
                }}
              >
                Relations:
              </div>
              {compareResults.map((r, i) => (
                <div
                  key={i}
                  style={{ fontSize: 12, padding: "2px 0" }}
                >
                  <span style={{ fontFamily: "monospace" }}>
                    {r.code}
                  </span>
                  {r.telugu && (
                    <span style={{ marginLeft: 8, color: "#aaa" }}>
                      {r.telugu}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div
        ref={chartRef}
        id="FamilyChart"
        className="f3 flex-1"
        style={{
          width: "100%",
          minHeight: 0,
          margin: "auto",
          backgroundColor: "rgb(33,33,33)",
          color: "#fff",
        }}
      />
    </div>
  );
}
