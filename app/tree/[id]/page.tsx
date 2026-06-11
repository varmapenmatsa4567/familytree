"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import * as f3 from "family-chart";
import "family-chart/styles/family-chart.css";
import { useAuth } from "@/lib/auth";
import { getTree, updateTreePeople, updateTreeName } from "@/lib/firestore";
import { createEditForm, createNewForm } from "@/lib/family-form";
import type { SpouseDateInfo } from "@/lib/family-form";
import type { Data, Datum } from "family-chart";
import { RelationShipFinder, mergeSteps, stepsToCode, findRelation } from "@/utils/relationship";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

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

  /* ── form panel ─────────────────────────────────────────────────────────── */
  .f3-form-cont {
    background: rgba(16,16,16,0.96) !important;
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-left: 1px solid ${token.border} !important;
    box-shadow: -4px 0 24px rgba(0,0,0,0.4) !important;
  }
  .f3-form-cont.opened { width: 340px !important; }

  .f3-form {
    padding: 16px 18px 20px !important;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .f3-form-title {
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    color: ${token.text} !important;
    text-align: center !important;
    letter-spacing: 0.02em;
    margin: 2px 0 16px !important;
    padding-bottom: 12px;
    border-bottom: 1px solid ${token.border};
  }

  .f3-close-btn {
    color: ${token.textDim} !important;
    font-size: 22px !important;
    left: 12px !important;
    top: 10px !important;
    transition: color .15s;
    line-height: 1;
  }
  .f3-close-btn:hover { color: ${token.text} !important; }

  .f3-form-field {
    margin-bottom: 12px;
  }
  .f3-form-field label {
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    color: ${token.textMuted} !important;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 4px;
    display: block;
  }

  .f3-form input[type="text"],
  .f3-form input[type="date"],
  .f3-form input[type="number"],
  .f3-form textarea,
  .f3-form select {
    width: 100% !important;
    padding: 8px 10px !important;
    margin: 0 !important;
    border: 1px solid ${token.borderHover} !important;
    border-radius: 6px !important;
    background: ${token.surfaceHigh} !important;
    color: ${token.text} !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 13px !important;
    outline: none !important;
    transition: border-color .15s !important;
    box-sizing: border-box !important;
  }
  .f3-form input[type="text"]:focus,
  .f3-form input[type="date"]:focus { border-color: ${token.gold}55 !important; box-shadow: 0 0 0 3px ${token.gold}11 !important; }
  .f3-form input[type="text"]::placeholder { color: ${token.textDim}; }

  .f3-date-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .f3-date-wrap input[type="date"] {
    color-scheme: dark;
    padding-right: 32px !important;
    appearance: none;
    -webkit-appearance: none;
  }
  .f3-date-wrap input[type="date"]::-webkit-calendar-picker-indicator {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    cursor: pointer;
    opacity: 0.45;
    filter: invert(1);
    transition: opacity .15s;
  }
  .f3-date-wrap input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 0.8;
  }

  .f3-form input[type="radio"] {
    accent-color: ${token.gold};
  }

  .f3-form-buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 4px;
    margin-bottom: 6px;
  }

  .f3-form button {
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    margin: 0 !important;
    padding: 7px 14px !important;
    border-radius: 6px !important;
    border: 1px solid transparent !important;
    cursor: pointer !important;
    transition: opacity .15s, background .15s, border-color .15s !important;
  }

  .f3-form button[type="submit"] {
    background: ${token.gold} !important;
    color: #0c0c0c !important;
    border-color: ${token.gold} !important;
  }
  .f3-form button[type="submit"]:hover { opacity: 0.88 !important; }

  .f3-cancel-btn {
    background: transparent !important;
    color: ${token.textMuted} !important;
    border-color: ${token.border} !important;
  }
  .f3-cancel-btn:hover {
    color: ${token.text} !important;
    background: ${token.surfaceHigh} !important;
    border-color: ${token.borderHover} !important;
  }

  .f3-form hr {
    border: none !important;
    border-top: 1px solid ${token.border} !important;
    margin: 8px 0 !important;
    opacity: 1 !important;
  }

  .f3-form .f3-delete-btn,
  .f3-form .f3-remove-relative-btn {
    width: 100% !important;
    margin: 4px 0 0 !important;
    padding: 7px 14px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }
  .f3-form .f3-delete-btn {
    background: transparent !important;
    color: #f87171 !important;
    border: 1px solid rgba(248,113,113,0.2) !important;
  }
  .f3-form .f3-delete-btn:hover {
    background: rgba(248,113,113,0.08) !important;
    border-color: rgba(248,113,113,0.3) !important;
  }
  .f3-form .f3-remove-relative-btn {
    background: transparent !important;
    color: ${token.textMuted} !important;
    border: 1px solid ${token.borderHover} !important;
  }
  .f3-form .f3-remove-relative-btn:hover {
    color: ${token.text} !important;
    background: ${token.surfaceHigh} !important;
  }

  .f3-form .f3-add-rel-btn {
    font-size: 16px !important;
    padding: 4px 10px !important;
    border-radius: 5px !important;
    background: transparent !important;
    color: ${token.textMuted} !important;
    border: 1px solid ${token.border} !important;
    float: none !important;
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
    transition: color .15s, border-color .15s, background .15s !important;
  }
  .f3-form .f3-add-rel-btn:hover {
    color: ${token.gold} !important;
    border-color: ${token.gold}55 !important;
    background: ${token.goldDim} !important;
  }

  /* gender radio group */
  .f3-form .f3-form-field > div:has(input[type="radio"]) {
    display: flex !important;
    gap: 16px !important;
    margin-top: 2px;
  }
  .f3-form .f3-form-field > div:has(input[type="radio"]) label {
    display: flex !important;
    align-items: center;
    gap: 6px;
    font-size: 12.5px !important;
    text-transform: none !important;
    letter-spacing: 0 !important;
    cursor: pointer;
    color: ${token.text} !important;
    font-weight: 400 !important;
  }
  .f3-form .f3-form-field > div:has(input[type="radio"]) input[type="radio"] {
    margin: 0 !important;
    width: auto !important;
  }

  /* avatar section */
  .f3-avatar-cont {
    display: flex !important;
    align-items: center;
    gap: 12px;
    margin-top: 2px;
  }
  .f3-avatar-preview {
    width: 48px !important;
    height: 48px !important;
    border-radius: 50% !important;
    overflow: hidden;
    flex-shrink: 0;
    background: ${token.surfaceHigh} !important;
    border: 1px solid ${token.border} !important;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: ${token.textDim};
  }
  .f3-avatar-btn {
    padding: 6px 12px !important;
    border-radius: 6px !important;
    border: 1px solid ${token.border} !important;
    background: transparent !important;
    color: ${token.textMuted} !important;
    font-size: 12px !important;
    cursor: pointer !important;
    transition: color .15s, border-color .15s, background .15s !important;
    font-family: 'Inter', system-ui, sans-serif !important;
  }
  .f3-avatar-btn:hover {
    color: ${token.text} !important;
    border-color: ${token.borderHover} !important;
    background: ${token.surfaceHigh} !important;
  }

  /* location field */
  .f3-loc-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .f3-loc-display {
    flex: 1;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid ${token.borderHover};
    background: ${token.surfaceHigh};
    color: ${token.textMuted};
    font-size: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .f3-loc-btn {
    padding: 7px 12px !important;
    border-radius: 6px !important;
    border: 1px solid ${token.border} !important;
    background: transparent !important;
    color: ${token.textMuted} !important;
    font-size: 12px !important;
    cursor: pointer !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    white-space: nowrap;
    transition: color .15s, border-color .15s, background .15s !important;
  }
  .f3-loc-btn:hover {
    color: ${token.text} !important;
    border-color: ${token.borderHover} !important;
    background: ${token.surfaceHigh} !important;
  }

  /* marriage dates */
  .f3-marriage-section {
    border-top: 1px solid ${token.border};
    padding-top: 4px;
    margin-top: 4px;
  }
  .f3-marriage-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .f3-marriage-name {
    font-size: 12px;
    color: ${token.textMuted};
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .f3-marriage-input {
    padding: 6px 8px !important;
    border-radius: 5px !important;
    border: 1px solid ${token.borderHover} !important;
    background: ${token.surfaceHigh} !important;
    color: ${token.text} !important;
    font-size: 12px !important;
    outline: none !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    color-scheme: dark !important;
    max-width: 160px !important;
    width: auto !important;
  }
  .f3-marriage-input:focus {
    border-color: ${token.gold}55 !important;
    box-shadow: 0 0 0 3px ${token.gold}11 !important;
  }

  /* timeline slider */
  .tp-timeline {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 20px;
    background: ${token.surface};
    border-top: 1px solid ${token.border};
    flex-shrink: 0;
  }
  .tp-timeline-label {
    font-size: 11px;
    font-weight: 500;
    color: ${token.textMuted};
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .tp-timeline-input {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: ${token.border};
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .tp-timeline-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${token.gold};
    border: 2px solid ${token.bg};
    box-shadow: 0 1px 4px rgba(0,0,0,.4);
    cursor: pointer;
    transition: transform .1s;
  }
  .tp-timeline-input::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  .tp-timeline-input::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${token.gold};
    border: 2px solid ${token.bg};
    box-shadow: 0 1px 4px rgba(0,0,0,.4);
    cursor: pointer;
  }
  .tp-timeline-value {
    font-size: 12px;
    font-weight: 600;
    color: ${token.gold};
    min-width: 44px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .tp-timeline-reset {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid ${token.border};
    background: transparent;
    color: ${token.textMuted};
    cursor: pointer;
    transition: color .15s, border-color .15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .tp-timeline-reset:hover {
    color: ${token.text};
    border-color: ${token.borderHover};
  }

  /* map */
  .leaflet-container {
    background: ${token.bg} !important;
    font-family: 'Inter', system-ui, sans-serif !important;
  }
  .leaflet-control-zoom a {
    background: ${token.surface} !important;
    color: ${token.text} !important;
    border-color: ${token.border} !important;
  }
  .leaflet-control-zoom a:hover {
    background: ${token.surfaceHigh} !important;
  }
  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 2px 8px rgba(0,0,0,.3) !important;
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
  const fullDataRef = useRef<Data>([]);
  const [sliderYear, setSliderYear] = useState<number | null>(null);
  const [yearRange, setYearRange] = useState<[number, number] | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareP1, setCompareP1] = useState("");
  const [compareP2, setCompareP2] = useState("");
  const [compareSelecting, setCompareSelecting] = useState<1 | 2 | null>(null);
  const [compareResults, setCompareResults] = useState<
    Array<{ code: string; telugu: string | null }>
  >([]);
  const [showMap, setShowMap] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<
    Array<{ kind: "birthday" | "anniversary"; person: Datum; spouseName?: string; dateLabel: string; sortKey: number }>
  >([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    if (!showMap) return;
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      requestAnimationFrame(() => mapInstanceRef.current!.invalidateSize());
      return;
    }

    let L: typeof import("leaflet");
    let map: ReturnType<typeof import("leaflet")["map"]>;

    import("leaflet").then(async (mod) => {
      const mutableL = { ...mod } as typeof import("leaflet");
      (window as any).L = mutableL;
      await import("leaflet.markercluster");
      L = mutableL;
      map = L.map(mapRef.current!, {
        center: [20, 78],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const mcg = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16,
        iconCreateFunction: (cluster) => {
          let total = 0;
          cluster.getAllChildMarkers().forEach((m) => {
            total += (m.options as any).personCount || 1;
          });
          return L.divIcon({
            className: "",
            html: `<div style="width:40px;height:40px;border-radius:50%;background:${token.gold};color:#0c0c0c;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;font-family:Inter,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid #fff">${total}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
        },
      });
      mapInstanceRef.current = map;

      const people = peopleRef.current;
      const locMap = new Map<string, typeof people>();
      const key = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
      people.forEach((p) => {
        const loc = p.data.location;
        if (!loc) return;
        const parts = loc.split(",");
        if (parts.length < 2) return;
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) return;
        const k = key(lat, lng);
        if (!locMap.has(k)) locMap.set(k, []);
        locMap.get(k)!.push(p);
      });
      const bounds: [number, number][] = [];
      locMap.forEach((group) => {
        const [lat, lng] = group[0].data.location!.split(",").map(Number);
        let iconHtml: string;
        let iconSize: [number, number];
        let iconAnchor: [number, number];

        if (group.length === 1) {
          const p = group[0];
          const name = `${p.data["first name"] || ""} ${p.data["last name"] || ""}`.trim() || p.id;
          const avatar = p.data.avatar || "";
          const img = avatar
            ? `<img src="${avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${token.gold};box-shadow:0 2px 8px rgba(0,0,0,.5)" />`
            : `<div style="width:36px;height:36px;border-radius:50%;background:${token.surfaceHigh};border:2px solid ${token.textDim};display:flex;align-items:center;justify-content:center;font-size:14px;color:${token.textMuted}">${name.charAt(0).toUpperCase()}</div>`;
          iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">${img}<span style="font-size:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8);white-space:nowrap;background:rgba(0,0,0,.5);padding:1px 6px;border-radius:4px;max-width:100px;overflow:hidden;text-overflow:ellipsis">${name}</span></div>`;
          iconSize = [42, 56];
          iconAnchor = [21, 56];
        } else {
          const avatarsHtml = group.map((p) => {
            const name = `${p.data["first name"] || ""} ${p.data["last name"] || ""}`.trim() || p.id;
            const avatar = p.data.avatar || "";
            return avatar
              ? `<img src="${avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid ${token.gold}" title="${name}" />`
              : `<div style="width:28px;height:28px;border-radius:50%;background:${token.surfaceHigh};border:2px solid ${token.textDim};display:flex;align-items:center;justify-content:center;font-size:12px;color:${token.textMuted}" title="${name}">${name.charAt(0).toUpperCase()}</div>`;
          }).join("");
          const count = group.length;
          iconHtml = `<div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:0;background:rgba(0,0,0,.65);padding:4px 6px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.6)">${avatarsHtml}</div><div style="text-align:center;font-size:9px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.9);margin-top:2px">${count} members</div>`;
          iconSize = [group.length * 30 + 12, 48];
          iconAnchor = [(group.length * 30 + 12) / 2, 48];
        }

        const icon = L.divIcon({
          className: "",
          html: iconHtml,
          iconSize,
          iconAnchor,
        });
        const marker = L.marker([lat, lng], { icon });
        (marker.options as any).personCount = group.length;
        mcg.addLayer(marker);

        if (group.length > 1) {
          const namesHtml = group.map((p) => {
            const name = `${p.data["first name"] || ""} ${p.data["last name"] || ""}`.trim() || p.id;
            const avatar = p.data.avatar || "";
            const img = avatar
              ? `<img src="${avatar}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px" />`
              : `<div style="display:inline-flex;width:24px;height:24px;border-radius:50%;background:${token.surfaceHigh};align-items:center;justify-content:center;font-size:10px;color:${token.textMuted};vertical-align:middle;margin-right:6px">${name.charAt(0).toUpperCase()}</div>`;
            return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">${img}<span style="font-size:13px">${name}</span></div>`;
          }).join("");
          marker.bindPopup(
            `<div style="font-family:Inter,sans-serif;background:#1a1a1a;color:#e0e0e0;padding:8px 12px;border-radius:8px;min-width:160px">${namesHtml}</div>`,
            { closeButton: false },
          );
        }

        bounds.push([lat, lng]);
      });
      map.addLayer(mcg);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
      map.invalidateSize();
    });

  }, [showMap]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

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
        familyData = tree.people.map((d: any) => {
          if (d._new_rel_data) delete d._new_rel_data;
          if (d.to_add) delete d.to_add;
          return d;
        });
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
        .setCardDisplay([["first name"]])
        .setCardDim({})
        .setMiniTree(true)
        .setStyle("imageCircle")
        .setOnHoverPathToMain();

      f3EditTree = f3Chart
        .editTree()
        .fixed()
        .setFields(["first name", "last name", "birthday", "avatar", "location"])
        .setEditFirst(true)
        .setCreateFormEdit((fc, cb) => {
          const people = peopleRef.current;
          const names = [...new Set(people.map(p => p.data["last name"]).filter(Boolean))];
          const datum = people.find(p => p.id === fc.datum_id);
          let spouseDates: SpouseDateInfo[] | undefined;
          if (datum?.rels.spouses?.length) {
            const marriageDates: Record<string, string> = {};
            try { Object.assign(marriageDates, JSON.parse(datum.data["marriage_dates"] || "{}")); } catch {}
            spouseDates = datum.rels.spouses.map(id => {
              const s = people.find(p => p.id === id);
              return { spouseId: id, spouseName: s ? `${s.data["first name"] || ""} ${s.data["last name"] || ""}`.trim() || id : id, date: marriageDates[id] || "" };
            });
          }
          return createEditForm(fc, cb, names.length ? names : undefined, spouseDates);
        })
        .setCreateFormNew((fc, cb) => {
          const names = [...new Set(peopleRef.current.map(p => p.data["last name"]).filter(Boolean))];
          return createNewForm(fc, cb, names.length ? names : undefined);
        })
        .setOnChange(() => {
          if (!f3EditTree) return;
          const exportData = f3EditTree.exportData() as Data;
          const exportIds = new Set(exportData.map(p => p.id));
          for (const p of fullDataRef.current) {
            if (!exportIds.has(p.id)) exportData.push(p);
          }
          // sync marriage dates between spouses
          for (const p of exportData) {
            const dates: Record<string, string> = {};
            try { Object.assign(dates, JSON.parse(p.data["marriage_dates"] || "{}")); } catch {}
            if (Object.keys(dates).length === 0) continue;
            for (const [spouseId, date] of Object.entries(dates)) {
              const spouse = exportData.find(d => d.id === spouseId);
              if (!spouse) continue;
              const spouseDates: Record<string, string> = {};
              try { Object.assign(spouseDates, JSON.parse(spouse.data["marriage_dates"] || "{}")); } catch {}
              if (spouseDates[p.id] !== date) {
                spouseDates[p.id] = date;
                spouse.data["marriage_dates"] = JSON.stringify(spouseDates);
                // also update the chart's store so the spouse form sees it immediately
                const chartDatum = (f3EditTree as any).store?.state?.data?.find((d: any) => d.id === spouseId);
                if (chartDatum) chartDatum.data["marriage_dates"] = spouse.data["marriage_dates"];
              }
            }
          }
          fullDataRef.current = exportData;
          updateTreePeople(treeId, exportData).catch(console.warn);
        });

      fullDataRef.current = familyData;

      // compute year range (birthdays + marriage dates)
      const years = familyData.flatMap(p => {
        const result: number[] = [];
        const b = p.data.birthday;
        if (b != null) {
          if (typeof b === "number" && b > 0) result.push(b);
          else { const y = new Date(b).getFullYear(); if (!isNaN(y)) result.push(y); }
        }
        const dates: Record<string, string> = {};
        try { Object.assign(dates, JSON.parse(p.data["marriage_dates"] || "{}")); } catch {}
        for (const d of Object.values(dates)) {
          const y = new Date(d).getFullYear();
          if (!isNaN(y)) result.push(y);
        }
        return result;
      });
      if (years.length > 0) {
        const min = Math.min(...years);
        const max = Math.max(...years);
        setYearRange([min, max]);
        setSliderYear(max);
      }

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
        (f3Card as any).setOnCardClick((e: any, d: any) => { (f3Card as any).onCardClickDefault(e, d); });
        f3Chart.updateTree({ initial: true });
      }
      setLoading(false);
    }

    init();
    return () => { cancelled = true; f3EditTree?.destroy(); };
  }, [treeId, user, authLoading]);

  const handleSliderChange = (year: number) => {
    setSliderYear(year);
    const full = fullDataRef.current;
    const chart = f3ChartRef.current;
    const editTree = f3EditTreeRef.current;
    if (!chart || !editTree) return;
    editTree.closeForm();
    const raw: Data = JSON.parse(JSON.stringify(full));

    // Pass 1: filter by birthday
    const keep = raw.filter(p => {
      if (!p.data.birthday) return true;
      const b = typeof p.data.birthday === "number" ? p.data.birthday : new Date(p.data.birthday).getFullYear();
      return !isNaN(b) && b <= year;
    });
    const keepIds = new Set(keep.map(p => p.id));

    // Pass 2: build marriage date lookup
    const marriageMap = new Map<string, Record<string, string>>();
    for (const p of keep) {
      const dates: Record<string, string> = {};
      try { Object.assign(dates, JSON.parse(p.data["marriage_dates"] || "{}")); } catch {}
      marriageMap.set(p.id, dates);
    }

    // Pass 3: prune spousal relationships where marriage date hasn't been reached
    for (const p of keep) {
      if (!p.rels.spouses?.length) continue;
      p.rels.spouses = p.rels.spouses.filter(spouseId => {
        const dateStr = marriageMap.get(p.id)?.[spouseId];
        if (!dateStr) return true;
        const marriageYear = new Date(dateStr).getFullYear();
        return !isNaN(marriageYear) && marriageYear <= year;
      });
    }

    // Pass 4: filter all relationships by keepIds
    for (const p of keep) {
      p.rels.parents = p.rels.parents.filter(id => keepIds.has(id));
      p.rels.spouses = p.rels.spouses.filter(id => keepIds.has(id));
      p.rels.children = p.rels.children.filter(id => keepIds.has(id));
    }

    // Pass 5: remove completely disconnected people
    const connected = keep.filter(p => p.rels.parents.length || p.rels.spouses.length || p.rels.children.length);

    (connected as any).main_id = connected[0]?.id;
    chart.updateData(connected);
    chart.updateTree({ transition_time: 300 });
    peopleRef.current = connected;
  };

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
            className={`tp-btn${eventsOpen ? " tp-btn-active" : ""}`}
            onClick={() => {
              if (!eventsOpen) {
                const today = new Date();
                const md = today.getMonth() * 100 + today.getDate();
                const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const ordinal = (d: number) => d >= 11 && d <= 13 ? "th" : ["th","st","nd","rd","th","th","th","th","th","th"][d % 10] || "th";
                const formatDate = (m: number, d: number) => `${d}${ordinal(d)} ${months[m]}`;
                const upcoming: Array<{ kind: "birthday" | "anniversary"; person: Datum; spouseName?: string; dateLabel: string; sortKey: number }> = [];
                const seenAnniversary = new Set<string>();
                for (const p of peopleRef.current) {
                  // birthday
                  const b = p.data.birthday;
                  if (typeof b === "string") {
                    const bd = new Date(b);
                    if (!isNaN(bd.getTime())) {
                      const bmd = bd.getMonth() * 100 + bd.getDate();
                      if (bmd >= md) {
                        upcoming.push({ kind: "birthday", person: p, dateLabel: formatDate(bd.getMonth(), bd.getDate()), sortKey: bmd });
                      }
                    }
                  }
                  // marriage anniversaries (deduplicated per couple)
                  const dates: Record<string, string> = {};
                  try { Object.assign(dates, JSON.parse(p.data["marriage_dates"] || "{}")); } catch {}
                  for (const [spouseId, d] of Object.entries(dates)) {
                    const coupleKey = [p.id, spouseId].sort().join("|");
                    if (seenAnniversary.has(coupleKey)) continue;
                    seenAnniversary.add(coupleKey);
                    const ad = new Date(d);
                    if (!isNaN(ad.getTime())) {
                      const amd = ad.getMonth() * 100 + ad.getDate();
                      if (amd >= md) {
                        const spouse = peopleRef.current.find(s => s.id === spouseId);
                        const spouseName = spouse
                          ? `${spouse.data["first name"] || ""} ${spouse.data["last name"] || ""}`.trim() || spouseId
                          : spouseId;
                        upcoming.push({ kind: "anniversary", person: p, spouseName, dateLabel: formatDate(ad.getMonth(), ad.getDate()), sortKey: amd });
                      }
                    }
                  }
                }
                upcoming.sort((a, b) => a.sortKey - b.sortKey);
                setEvents(upcoming);
              }
              setEventsOpen((v) => !v);
              setCompareOpen(false);
            }}
          >
            Events
          </button>

          <div className="tp-divider" />

          <button
            className={`tp-btn${showMap ? " tp-btn-active" : ""}`}
            onClick={() => {
              setShowMap((v) => !v);
              setCompareOpen(false);
              setEventsOpen(false);
            }}
          >
            Map
          </button>

          <div className="tp-divider" />

          <button
            className={`tp-btn${compareOpen ? " tp-btn-active" : ""}`}
            onClick={() => { setCompareOpen((v) => !v); setCompareResults([]); setEventsOpen(false); }}
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
                if (card) (card as any).setOnCardClick((e: any, d: any) => { (card as any).onCardClickDefault(e, d); });
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

      {/* ── events panel ──────────────────────────────────────────────────── */}
      {eventsOpen && (
        <div className="tp-panel" onClick={(e) => e.stopPropagation()}>
          <div className="tp-panel-header">
            <div className="tp-panel-dot" />
            <span className="tp-panel-title">Upcoming Events</span>
          </div>
          <div className="tp-panel-body">
            {events.length === 0 ? (
              <div style={{ fontSize: 12, color: token.textDim, fontStyle: "italic", padding: "4px 0" }}>
                No upcoming events found
              </div>
            ) : (
              events.map((ev, i) => {
                const avatar = ev.person.data.avatar || "";
                const name = `${ev.person.data["first name"] || ""} ${ev.person.data["last name"] || ""}`.trim() || ev.person.id;
                const icon = ev.kind === "birthday" ? "🎂" : "💍";
                return (
                  <div key={i} className="tp-result-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                      <span style={{ fontSize: 13 }}>{icon}</span>
                      <span style={{ fontSize: 11, color: token.gold, fontWeight: 600 }}>{ev.dateLabel}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {avatar ? (
                        <img src={avatar} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: `1px solid ${token.border}` }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: token.surfaceHigh, border: `1px dashed ${token.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: token.textMuted }}>{name.charAt(0).toUpperCase()}</div>
                      )}
                      <span style={{ fontSize: 12.5, color: token.text }}>
                        {ev.kind === "birthday" ? `${name}'s Birthday` : `${name} & ${ev.spouseName}'s Anniversary`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── chart / map ──────────────────────────────────────────────────── */}
      <div
        ref={chartRef}
        id="FamilyChart"
        className="f3"
        style={{
          display: showMap ? "none" : "flex",
          flex: 1,
          width: "100%",
          minHeight: 0,
          backgroundColor: token.bg,
          color: "#fff",
        }}
      />
      <div
        ref={mapRef}
        style={{
          display: showMap ? "flex" : "none",
          flex: 1,
          width: "100%",
          minHeight: 0,
          position: "relative",
          zIndex: 0,
        }}
      />

      {/* ── timeline slider ──────────────────────────────────────────────── */}
      {yearRange && sliderYear !== null && !editing && (
        <div className="tp-timeline">
          <span className="tp-timeline-label">Timeline</span>
          <input
            type="range"
            className="tp-timeline-input"
            min={yearRange[0]}
            max={yearRange[1]}
            value={sliderYear}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
          />
          <span className="tp-timeline-value">{sliderYear}</span>
          <button
            className="tp-timeline-reset"
            onClick={() => handleSliderChange(yearRange[1])}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}