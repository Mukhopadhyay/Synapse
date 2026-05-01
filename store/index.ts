import { create } from "zustand";
import type { GraphNode, GraphEdge } from "@/types";

interface SynapseStore {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedNode: GraphNode | null;
    searchQuery: string;
    highlightedNodes: string[];
    pinnedNodes: string[];
    isSidebarCollapsed: boolean;
    isInspectorOpen: boolean;
    isInspectorFullscreen: boolean;
    setNodes: (nodes: GraphNode[]) => void;
    setEdges: (edges: GraphEdge[]) => void;
    setSelectedNode: (node: GraphNode | null) => void;
    setSearch: (query: string) => void;
    setHighlightedNodes: (ids: string[]) => void;
    togglePinNode: (id: string) => void;
    setSidebarCollapsed: (v: boolean) => void;
    setInspectorFullscreen: (v: boolean) => void;
}

export const useSynapseStore = create<SynapseStore>((set) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    searchQuery: "",
    highlightedNodes: [],
    pinnedNodes: [],
    isSidebarCollapsed: false,
    isInspectorOpen: false,
    isInspectorFullscreen: false,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setSelectedNode: (node) => set({ selectedNode: node, isInspectorOpen: node !== null }),
    setSearch: (query) => set({ searchQuery: query }),
    setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),
    togglePinNode: (id) =>
        set((state) => ({
            pinnedNodes: state.pinnedNodes.includes(id)
                ? state.pinnedNodes.filter((p) => p !== id)
                : [...state.pinnedNodes, id],
        })),
    setSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
    setInspectorFullscreen: (v) => set({ isInspectorFullscreen: v }),
}));
