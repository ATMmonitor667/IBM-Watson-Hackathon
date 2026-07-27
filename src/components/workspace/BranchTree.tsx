"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CanonNode, AlternateNode, type BranchNodeData } from "@/components/workspace/BranchNodes";
import { useSceneStore } from "@/store/sceneStore";
import { useUiStore } from "@/store/uiStore";
import type { Branch, Scene, SceneReviewStatus } from "@/types/workspace";

// Register custom node types once (stable reference outside component)
const nodeTypes = {
  canon:     CanonNode,
  alternate: AlternateNode,
};

// ---------------------------------------------------------------------------
// Reduced-motion detection (evaluated once per module load in the browser)
// ---------------------------------------------------------------------------
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------
// Helpers: convert Branch[] → React Flow nodes + edges
// ---------------------------------------------------------------------------
function sceneToNode(
  scene: Scene,
  branchId: string,
  isCanon: boolean,
  selectedSceneId: string | null,
  xPos: number,
  yPos: number,
  onActivate: () => void,
): Node<BranchNodeData> {
  return {
    id: scene.id,
    type: isCanon ? "canon" : "alternate",
    position: { x: xPos, y: yPos },
    data: {
      label: scene.title,
      sceneNumber: scene.sceneNumber,
      reviewStatus: scene.reviewStatus as SceneReviewStatus,
      isSelected: selectedSceneId === scene.id,
      continuityFlag: scene.continuityFlag,
      branchId,
      isCanon,
      onActivate,
    },
  };
}

function buildGraph(
  branches: Branch[],
  selectedSceneId: string | null,
  onActivate: (id: string) => void,
): { nodes: Node<BranchNodeData>[]; edges: Edge[] } {
  const nodes: Node<BranchNodeData>[] = [];
  const edges: Edge[] = [];
  const seenIds = new Set<string>();

  // Column layout: canon branch down the centre, alts offset to the right
  const CANON_X = 140;
  const ALT_X_OFFSET = 120; // offset per alt branch from canon x
  let altColumnIdx = 0;

  for (const branch of branches) {
    const isCanon = branch.isCanon;
    const xBase = isCanon ? CANON_X : CANON_X + ALT_X_OFFSET * (++altColumnIdx);

    const sorted = [...branch.scenes].sort((a, b) => a.order - b.order);
    sorted.forEach((scene, idx) => {
      if (seenIds.has(scene.id)) return;
      seenIds.add(scene.id);

      nodes.push(
        sceneToNode(
          scene,
          branch.id,
          isCanon,
          selectedSceneId,
          xBase,
          idx * 130 + 40,
          () => onActivate(scene.id),
        ),
      );

      // Edge from parentId or previous in sequence
      const sourceId = scene.parentId ?? (idx > 0 ? sorted[idx - 1].id : null);
      if (sourceId) {
        edges.push({
          id: `e-${sourceId}-${scene.id}`,
          source: sourceId,
          target: scene.id,
          style: isCanon
            ? { stroke: "#3b82f6", strokeWidth: 3 }
            : { stroke: "#7c3aed", strokeWidth: 1.5, strokeDasharray: "6 4" },
          animated: false,
        });
      }
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface BranchTreeProps {
  branches: Branch[];
}

export function BranchTree({ branches }: BranchTreeProps) {
  const selectedSceneId = useSceneStore((s) => s.selectedSceneId);
  const selectNode      = useSceneStore((s) => s.selectNode);
  const openPanel       = useUiStore((s) => s.openPanel);

  // Shared activation handler used by both mouse clicks and keyboard events
  const activateNode = useCallback(
    (id: string) => {
      selectNode(id);
      openPanel("scene-detail");
    },
    [selectNode, openPanel],
  );

  const { nodes, edges } = useMemo(
    () => buildGraph(branches, selectedSceneId, activateNode),
    [branches, selectedSceneId, activateNode],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => activateNode(node.id),
    [activateNode],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3, duration: prefersReduced ? 0 : 300 }}
      nodesDraggable={false}
      nodesConnectable={false}
      // Disable animated pan/zoom when user prefers reduced motion
      panOnDrag={!prefersReduced}
      zoomOnScroll={!prefersReduced}
      zoomOnPinch={!prefersReduced}
      zoomOnDoubleClick={!prefersReduced}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#334155" gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
