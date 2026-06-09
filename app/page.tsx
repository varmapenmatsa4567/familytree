"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import * as f3 from "family-chart";
import "family-chart/styles/family-chart.css";
import { fetchPeople, savePeople } from "@/lib/firestore";
import type { Data } from "family-chart";

const DEFAULT_PEOPLE: Data = [
  {
    id: "0",
    rels: {
      parents: [],
      spouses: [],
      children: [],
    },
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

export default function FamilyTree(): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!chartRef.current) return;

    let f3Chart: ReturnType<typeof f3.createChart> | null = null;
    let f3EditTree: ReturnType<
      ReturnType<typeof f3.createChart>["editTree"]
    > | null = null;

    async function init() {
      console.log("[init] Starting family tree initialization");

      let familyData: Data;

      try {
        console.log("[init] Fetching people from Firestore...");
        familyData = await fetchPeople();
        console.log("[init] Firestore fetch succeeded, records:", familyData.length);
      } catch (err) {
        console.warn("[init] Firestore fetch failed:", err);
        familyData = DEFAULT_PEOPLE;
        setOffline(true);
      }

      if (!chartRef.current) {
        console.log("[init] chartRef no longer valid, aborting");
        return;
      }

      if (familyData.length === 0) {
        console.log("[init] No data from Firestore, using defaults");
        familyData = DEFAULT_PEOPLE;
      }

      console.log("[init] Creating chart with", familyData.length, "people");
      f3Chart = f3
        .createChart("#FamilyChart", familyData)
        .setTransitionTime(1000)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setSingleParentEmptyCard(true, { label: "ADD" })
        .setShowSiblingsOfMain(false)
        .setOrientationVertical();
      console.log("[init] Chart created");

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
      console.log("[init] Card HTML configured");

      f3EditTree = f3Chart
        .editTree()
        .fixed()
        .setFields(["first name", "last name", "birthday", "avatar"])
        .setEditFirst(true)
        .setCardClickOpen(f3Card)
        .setOnChange(() => {
          console.log("[onChange] Data changed, saving to Firestore...");
          if (!f3EditTree) return;
          const data = f3EditTree.exportData() as Data;
          savePeople(data)
            .then(() => console.log("[onChange] Save to Firestore succeeded"))
            .catch((err) =>
              console.warn("[onChange] Save to Firestore failed:", err)
            );
        });
      console.log("[init] Edit tree configured");

      f3EditTree.setEdit();
      console.log("[init] Edit mode enabled");

      f3Chart.updateTree({ initial: true });
      console.log("[init] First tree update done");

      if (familyData.length > 0) {
        f3EditTree.open(f3Chart.getMainDatum());
        f3Chart.updateTree({ initial: true });
        console.log("[init] Second tree update (with main datum open) done");
      }

      console.log("[init] Initialization complete");
      setLoading(false);
    }

    init();

    return () => {
      f3EditTree?.destroy();
    };
  }, []);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgb(33,33,33)] text-white">
          <p>Loading family tree...</p>
        </div>
      )}
      {offline && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-yellow-600 text-white text-center text-sm py-1">
          Firestore unavailable — using local data. Edits won&apos;t persist
          across sessions.
        </div>
      )}
      <div
        ref={chartRef}
        id="FamilyChart"
        className="f3"
        style={{
          width: "100%",
          height: "900px",
          margin: "auto",
          backgroundColor: "rgb(33,33,33)",
          color: "#fff",
        }}
      />
    </div>
  );
}
