"use client";

import { useEffect, useState } from "react";
import { useSynapseStore } from "@/store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { TopBar } from "@/components/ui/TopBar";
import { ForceGraph } from "@/components/graph/ForceGraph";
import { ListView } from "@/components/graph/ListView";
import type { GraphNode, GraphEdge } from "@/types";

export function GraphClient() {
    const { nodes, edges, setNodes, setEdges } = useSynapseStore();
    const [activeTab, setActiveTab] = useState<"graph" | "list">("graph");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/graph")
            .then((r) => r.json())
            .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
                setNodes(data.nodes);
                setEdges(data.edges);
            })
            .finally(() => setLoading(false));
    }, [setNodes, setEdges]);

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 overflow-hidden">
            <TopBar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />

                {/* Main canvas */}
                <main className="flex-1 relative overflow-hidden">
                    {/* Dotted background */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    />

                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="size-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs text-zinc-500">Loading graph…</span>
                            </div>
                        </div>
                    ) : activeTab === "graph" ? (
                        <ForceGraph nodes={nodes} edges={edges} />
                    ) : (
                        <ListView />
                    )}
                </main>

                {/* Right inspector panel (positioned absolutely inside the relative main) */}
                <NodeInspector />
            </div>
        </div>
    );
}
