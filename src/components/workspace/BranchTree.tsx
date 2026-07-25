"use client";

import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  // ── Canon path ──────────────────────────────────────────
  {
    id: "scene-1",
    position: { x: 160, y: 40 },
    data: { label: "Scene 1\nCanon" },
    style: {
      background: "#1e3a5f",
      border: "2px solid #3b82f6",
      borderRadius: 8,
      color: "#bfdbfe",
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 14px",
      textAlign: "center",
      whiteSpace: "pre-line",
    },
  },
  {
    id: "scene-2",
    position: { x: 160, y: 160 },
    data: { label: "Scene 2\nCanon" },
    style: {
      background: "#1e3a5f",
      border: "2px solid #3b82f6",
      borderRadius: 8,
      color: "#bfdbfe",
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 14px",
      textAlign: "center",
      whiteSpace: "pre-line",
    },
  },
  {
    id: "scene-3",
    position: { x: 160, y: 280 },
    data: { label: "Scene 3\nCanon" },
    style: {
      background: "#1e3a5f",
      border: "2px solid #3b82f6",
      borderRadius: 8,
      color: "#bfdbfe",
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 14px",
      textAlign: "center",
      whiteSpace: "pre-line",
    },
  },

  // ── Alt / Draft path ────────────────────────────────────
  {
    id: "alt-scene-2a",
    position: { x: 260, y: 220 },
    data: { label: "Alt-Scene 2A\nDraft" },
    style: {
      background: "#1e1040",
      border: "2px dashed #7c3aed",
      borderRadius: 8,
      color: "#ddd6fe",
      fontSize: 12,
      fontWeight: 500,
      padding: "8px 14px",
      textAlign: "center",
      whiteSpace: "pre-line",
      opacity: 0.85,
    },
  },
  {
    id: "alt-scene-2b",
    position: { x: 260, y: 340 },
    data: { label: "Alt-Scene 2B\nDraft" },
    style: {
      background: "#1e1040",
      border: "2px dashed #7c3aed",
      borderRadius: 8,
      color: "#ddd6fe",
      fontSize: 12,
      fontWeight: 500,
      padding: "8px 14px",
      textAlign: "center",
      whiteSpace: "pre-line",
      opacity: 0.85,
    },
  },
];

const initialEdges: Edge[] = [
  // ── Canon edges (solid blue, thick) ─────────────────────
  {
    id: "e1-2",
    source: "scene-1",
    target: "scene-2",
    style: { stroke: "#3b82f6", strokeWidth: 3 },
    animated: false,
  },
  {
    id: "e2-3",
    source: "scene-2",
    target: "scene-3",
    style: { stroke: "#3b82f6", strokeWidth: 3 },
    animated: false,
  },

  // ── Alt edges (dashed purple, thin) ─────────────────────
  {
    id: "e2-2a",
    source: "scene-2",
    target: "alt-scene-2a",
    style: { stroke: "#7c3aed", strokeWidth: 1.5, strokeDasharray: "6 4" },
    animated: false,
  },
  {
    id: "e2a-2b",
    source: "alt-scene-2a",
    target: "alt-scene-2b",
    style: { stroke: "#7c3aed", strokeWidth: 1.5, strokeDasharray: "6 4" },
    animated: false,
  },
];

export function BranchTree() {
  return (
    <ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#334155" gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
