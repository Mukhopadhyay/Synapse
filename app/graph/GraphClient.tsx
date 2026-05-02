"use client";

import { useEffect, useState } from "react";
import { useSynapseStore } from "@/store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NodeDialog } from "@/components/inspector/NodeDialog";
import { TopBar } from "@/components/ui/TopBar";
import { ForceGraph } from "@/components/graph/ForceGraph";
import { ListView } from "@/components/graph/ListView";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GraphNode, GraphEdge } from "@/types";

export function GraphClient() {
    const { nodes, edges, setNodes, setEdges, isInspectorFullscreen } = useSynapseStore();
    const [activeTab, setActiveTab] = useState<"graph" | "list">("graph");
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile();

    useEffect(() => {
        fetch("/api/graph")
            .then((r) => r.json())
            .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
                setNodes(data.nodes);
                setEdges(data.edges);
            })
            .finally(() => setLoading(false));
    }, [setNodes, setEdges]);

    const useDialog = isMobile || isInspectorFullscreen;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 overflow-hidden">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />

                {/* Main canvas */}
                <main className="flex-1 relative overflow-hidden">
                    {/* Theme-aware dotted background */}
                    <div className="absolute inset-0 pointer-events-none graph-grid-bg" />

                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="size-8 border-2 border-accent-theme border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-zinc-500">Loading graph…</span>
                            </div>
                        </div>
                    ) : activeTab === "graph" ? (
                        <ForceGraph nodes={nodes} edges={edges} />
                    ) : (
                        <ListView />
                    )}
                </main>

                {/* Inspector: dialog on mobile/fullscreen, side panel on desktop */}
                {useDialog ? <NodeDialog /> : <NodeInspector />}
            </div>
        </div>
    );
}
