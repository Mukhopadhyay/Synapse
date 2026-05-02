"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import type { GraphNode, GraphEdge, EdgeType } from "@/types";
import { useSynapseStore } from "@/store";
import { theme as t } from "@/lib/theme";

interface ForceGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// ── Importance thresholds ─────────────────────────────────────────────────────
const HIGH_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 2;

type Importance = "high" | "medium" | "low";

function getImportance(degree: number): Importance {
    if (degree >= HIGH_THRESHOLD) return "high";
    if (degree >= MEDIUM_THRESHOLD) return "medium";
    return "low";
}

// ── Node dimensions by importance ─────────────────────────────────────────────
const CORNER_RADIUS = 12;

function getNodeDims(importance: Importance) {
    switch (importance) {
        case "high":
            return { w: 190, h: 84 };
        case "medium":
            return { w: 160, h: 68 };
        case "low":
            return { w: 130, h: 48 };
    }
}

function getTitleFontSize(importance: Importance) {
    switch (importance) {
        case "high":
            return "15px";
        case "medium":
            return "13px";
        case "low":
            return "11px";
    }
}

// ── Edge style helpers ────────────────────────────────────────────────────────
function edgeStrokeWidth(type: EdgeType): number {
    switch (type) {
        case "depends":
            return 2;
        case "weak":
            return 1;
        default:
            return 1.5;
    }
}

function edgeDashArray(type: EdgeType): string {
    return type === "depends" ? "6,4" : "none";
}

function edgeOpacity(type: EdgeType): number {
    return type === "weak" ? 0.4 : 1;
}

export function ForceGraph({ nodes, edges }: ForceGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
    const { selectedNode, setSelectedNode, highlightedNodes, searchQuery } =
        useSynapseStore();
    const { resolvedTheme } = useTheme();

    const handleNodeClick = useCallback(
        (node: GraphNode) => {
            setSelectedNode(selectedNode?.id === node.id ? null : node);
        },
        [selectedNode, setSelectedNode]
    );

    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const isDark = resolvedTheme === "dark";

        // ── Color palette ────────────────────────────────────────────────────
        const colors = {
            nodeBg: isDark ? "rgba(24,24,27,0.92)" : "rgba(255,255,255,0.95)",
            nodeBorder: isDark ? "rgba(63,63,70,0.8)" : "rgba(200,200,210,0.9)",
            nodeText: isDark ? "#f4f4f5" : "#18181b",
            nodeSubText: isDark ? "rgba(161,161,170,0.8)" : "rgba(90,90,100,0.8)",
            tagBg: isDark ? `${t.accent}4d` : `${t.accent}1f`,
            tagBorder: isDark ? `${t.accentBright}66` : `${t.accentBright}66`,
            tagText: isDark ? t.accentLight : t.accentDark,
            edgeDirected: isDark ? `${t.accentBright}59` : `${t.accent}4d`,
            edgeBi: isDark ? `${t.accentBright}4d` : `${t.accent}3d`,
            edgeDepends: isDark ? "rgba(161,161,170,0.55)" : "rgba(120,120,140,0.50)",
            edgeWeak: isDark ? "rgba(161,161,170,0.25)" : "rgba(120,120,140,0.20)",
            edgeHover: isDark ? `${t.accentLight}e6` : `${t.accent}e6`,
            arrowFill: isDark ? `${t.accentLight}cc` : `${t.accent}b3`,
            arrowFillBi: isDark ? `${t.accentLight}99` : `${t.accent}80`,
            labelText: isDark ? t.accentLight : t.accentDark,
            labelBg: isDark ? "rgba(24,24,27,0.85)" : "rgba(255,255,255,0.9)",
            glowHigh: isDark ? `${t.accentBright}33` : `${t.accent}1a`,
        };

        function edgeColor(type: EdgeType) {
            switch (type) {
                case "bidirectional":
                    return colors.edgeBi;
                case "depends":
                    return colors.edgeDepends;
                case "weak":
                    return colors.edgeWeak;
                default:
                    return colors.edgeDirected;
            }
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = svgRef.current.clientWidth || 900;
        const height = svgRef.current.clientHeight || 600;

        // ── Zoom / Pan ───────────────────────────────────────────────────────
        const container = svg.append("g").attr("class", "zoom-container");
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.15, 4])
            .on("zoom", (event) => container.attr("transform", event.transform));
        svg.call(zoom);

        // ── Defs: glow filter + arrow markers ───────────────────────────────
        const defs = svg.append("defs");

        // Glow filter
        const glowFilter = defs
            .append("filter")
            .attr("id", "node-glow")
            .attr("x", "-50%").attr("y", "-50%")
            .attr("width", "200%").attr("height", "200%");
        glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // High-importance shadow filter
        const shadowFilter = defs
            .append("filter")
            .attr("id", "node-shadow")
            .attr("x", "-30%").attr("y", "-30%")
            .attr("width", "160%").attr("height", "160%");
        shadowFilter.append("feDropShadow")
            .attr("dx", "0").attr("dy", "2")
            .attr("stdDeviation", "4")
            .attr("flood-color", colors.glowHigh)
            .attr("flood-opacity", "0.8");

        // Arrow marker for directed edges (end)
        defs.append("marker")
            .attr("id", "arrowhead")
            .attr("markerWidth", "8")
            .attr("markerHeight", "6")
            .attr("refX", "7")
            .attr("refY", "3")
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 8 3, 0 6")
            .attr("fill", colors.arrowFill);

        // Arrow marker for bidirectional edges (start — reversed)
        defs.append("marker")
            .attr("id", "arrowhead-start")
            .attr("markerWidth", "8")
            .attr("markerHeight", "6")
            .attr("refX", "1")
            .attr("refY", "3")
            .attr("orient", "auto-start-reverse")
            .append("polygon")
            .attr("points", "8 0, 0 3, 8 6")
            .attr("fill", colors.arrowFillBi);

        // Hover arrow marker (brighter) — end
        defs.append("marker")
            .attr("id", "arrowhead-hover")
            .attr("markerWidth", "8")
            .attr("markerHeight", "6")
            .attr("refX", "7")
            .attr("refY", "3")
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 8 3, 0 6")
            .attr("fill", colors.edgeHover);

        // Hover arrow marker (brighter) — start
        defs.append("marker")
            .attr("id", "arrowhead-start-hover")
            .attr("markerWidth", "8")
            .attr("markerHeight", "6")
            .attr("refX", "1")
            .attr("refY", "3")
            .attr("orient", "auto-start-reverse")
            .append("polygon")
            .attr("points", "8 0, 0 3, 8 6")
            .attr("fill", colors.edgeHover);

        // ── Clone data ───────────────────────────────────────────────────────
        const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
        const idToSimNode = new Map(simNodes.map((n) => [n.id, n]));

        const simEdges: GraphEdge[] = edges
            .map((e) => ({
                source: idToSimNode.get(e.source as string) ?? e.source,
                target: idToSimNode.get(e.target as string) ?? e.target,
                type: e.type,
            }))
            .filter((e) => e.source && e.target);

        // ── Degree map & importance ──────────────────────────────────────────
        const degreeMap = new Map<string, number>();
        simEdges.forEach((e) => {
            const s = ((e.source as GraphNode).id ?? e.source) as string;
            const t2 = ((e.target as GraphNode).id ?? e.target) as string;
            degreeMap.set(s, (degreeMap.get(s) ?? 0) + 1);
            degreeMap.set(t2, (degreeMap.get(t2) ?? 0) + 1);
        });

        const importanceMap = new Map<string, Importance>();
        simNodes.forEach((n) => {
            importanceMap.set(n.id, getImportance(degreeMap.get(n.id) ?? 0));
        });

        // ── Edge set for quick neighbor lookup ───────────────────────────────
        const neighborEdges = new Map<string, Set<number>>();
        simEdges.forEach((e, i) => {
            const sId = ((e.source as GraphNode).id ?? e.source) as string;
            const tId = ((e.target as GraphNode).id ?? e.target) as string;
            if (!neighborEdges.has(sId)) neighborEdges.set(sId, new Set());
            if (!neighborEdges.has(tId)) neighborEdges.set(tId, new Set());
            neighborEdges.get(sId)!.add(i);
            neighborEdges.get(tId)!.add(i);
        });

        // ── Simulation ───────────────────────────────────────────────────────
        const simulation = d3
            .forceSimulation<GraphNode>(simNodes)
            .force("link", d3.forceLink<GraphNode, GraphEdge>(simEdges).id((d) => d.id).distance(240).strength(0.6))
            .force("charge", d3.forceManyBody().strength(-700))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(130));
        simulationRef.current = simulation;

        // ── Edges ────────────────────────────────────────────────────────────
        const linkGroup = container.append("g").attr("class", "edges");

        const link = linkGroup
            .selectAll<SVGLineElement, GraphEdge>("line")
            .data(simEdges)
            .enter()
            .append("line")
            .attr("stroke", (d) => edgeColor(d.type))
            .attr("stroke-width", (d) => edgeStrokeWidth(d.type))
            .attr("stroke-dasharray", (d) => edgeDashArray(d.type))
            .attr("opacity", (d) => edgeOpacity(d.type))
            .attr("marker-end", (d) => {
                if (d.type === "depends") return null;
                return "url(#arrowhead)";
            })
            .attr("marker-start", (d) => {
                if (d.type === "bidirectional") return "url(#arrowhead-start)";
                return null;
            })
            .style("cursor", "pointer")
            .style("transition", "stroke 0.2s, stroke-width 0.2s, opacity 0.2s");

        // ── Edge hover labels ────────────────────────────────────────────────
        const labelGroup = container.append("g").attr("class", "edge-labels");

        const edgeLabelBg = labelGroup
            .selectAll<SVGRectElement, GraphEdge>("rect")
            .data(simEdges)
            .enter()
            .append("rect")
            .attr("rx", 3).attr("ry", 3)
            .attr("fill", colors.labelBg)
            .attr("stroke", colors.tagBorder)
            .attr("stroke-width", 0.5)
            .attr("pointer-events", "none")
            .style("opacity", 0);

        const edgeLabelText = labelGroup
            .selectAll<SVGTextElement, GraphEdge>("text")
            .data(simEdges)
            .enter()
            .append("text")
            .attr("font-size", "9px")
            .attr("font-family", "inherit")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", colors.labelText)
            .attr("pointer-events", "none")
            .style("opacity", 0)
            .text((d) => d.type);

        link
            .on("mouseover", function (_, d) {
                d3.select(this)
                    .attr("stroke", colors.edgeHover)
                    .attr("stroke-width", edgeStrokeWidth(d.type) + 1)
                    .attr("opacity", 1)
                    .attr("marker-end", d.type !== "depends" ? "url(#arrowhead-hover)" : null)
                    .attr("marker-start", d.type === "bidirectional" ? "url(#arrowhead-start-hover)" : null);
                const i = simEdges.indexOf(d);
                edgeLabelBg.filter((_, j) => j === i).style("opacity", 1);
                edgeLabelText.filter((_, j) => j === i).style("opacity", 1);
            })
            .on("mouseout", function (_, d) {
                d3.select(this)
                    .attr("stroke", edgeColor(d.type))
                    .attr("stroke-width", edgeStrokeWidth(d.type))
                    .attr("opacity", edgeOpacity(d.type))
                    .attr("marker-end", d.type !== "depends" ? "url(#arrowhead)" : null)
                    .attr("marker-start", d.type === "bidirectional" ? "url(#arrowhead-start)" : null);
                const i = simEdges.indexOf(d);
                edgeLabelBg.filter((_, j) => j === i).style("opacity", 0);
                edgeLabelText.filter((_, j) => j === i).style("opacity", 0);
            });

        // ── Node groups ──────────────────────────────────────────────────────
        const nodeGroup = container
            .append("g")
            .attr("class", "nodes")
            .selectAll<SVGGElement, GraphNode>("g")
            .data(simNodes)
            .enter()
            .append("g")
            .attr("class", "node-group")
            .style("cursor", "pointer")
            .call(
                d3.drag<SVGGElement, GraphNode>()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x; d.fy = d.y;
                    })
                    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null; d.fy = null;
                    })
            )
            .on("click", (_event, d) => handleNodeClick(d))
            .on("mouseover", function (_, d) {
                const imp = importanceMap.get(d.id) ?? "low";
                const { w, h } = getNodeDims(imp);

                // Scale up the hovered node
                d3.select(this).select("rect")
                    .attr("filter", "url(#node-glow)")
                    .attr("stroke", isDark ? t.accentBright : t.accent)
                    .attr("stroke-width", 2)
                    .attr("x", -w / 2 - 2).attr("y", -h / 2 - 2)
                    .attr("width", w + 4).attr("height", h + 4);

                // Highlight connected edges, dim others
                const connectedEdgeIndices = neighborEdges.get(d.id) ?? new Set();
                link.each(function (_, i) {
                    if (connectedEdgeIndices.has(i)) {
                        d3.select(this)
                            .attr("stroke", colors.edgeHover)
                            .attr("stroke-width", 2.5)
                            .attr("opacity", 1);
                    } else {
                        d3.select(this).attr("opacity", 0.15);
                    }
                });
            })
            .on("mouseout", function (_, d) {
                const isSelected = selectedNode?.id === d.id;
                const imp = importanceMap.get(d.id) ?? "low";
                const { w, h } = getNodeDims(imp);

                d3.select(this).select("rect")
                    .attr("filter", isSelected ? "url(#node-glow)" : (imp === "high" ? "url(#node-shadow)" : "none"))
                    .attr("stroke", isSelected ? (isDark ? t.accentBright : t.accent) : colors.nodeBorder)
                    .attr("stroke-width", isSelected ? 2.5 : (imp === "high" ? 1.8 : 1.5))
                    .attr("x", -w / 2).attr("y", -h / 2)
                    .attr("width", w).attr("height", h);

                // Restore edge styles
                link.each(function (ed) {
                    const edgeData = ed as GraphEdge;
                    d3.select(this)
                        .attr("stroke", edgeColor(edgeData.type))
                        .attr("stroke-width", edgeStrokeWidth(edgeData.type))
                        .attr("opacity", edgeOpacity(edgeData.type));
                });
            });

        // Card background (variable size based on importance)
        nodeGroup.append("rect")
            .attr("x", (d) => -getNodeDims(importanceMap.get(d.id) ?? "low").w / 2)
            .attr("y", (d) => -getNodeDims(importanceMap.get(d.id) ?? "low").h / 2)
            .attr("width", (d) => getNodeDims(importanceMap.get(d.id) ?? "low").w)
            .attr("height", (d) => getNodeDims(importanceMap.get(d.id) ?? "low").h)
            .attr("rx", CORNER_RADIUS)
            .attr("fill", colors.nodeBg)
            .attr("stroke", (d) => {
                const imp = importanceMap.get(d.id) ?? "low";
                if (imp === "high") return isDark ? `${t.accentBright}40` : `${t.accent}30`;
                return colors.nodeBorder;
            })
            .attr("stroke-width", (d) => {
                const imp = importanceMap.get(d.id) ?? "low";
                return imp === "high" ? 1.8 : 1.5;
            })
            .attr("filter", (d) => {
                const imp = importanceMap.get(d.id) ?? "low";
                return imp === "high" ? "url(#node-shadow)" : "none";
            });

        // Category label (high importance only)
        nodeGroup
            .filter((d) => (importanceMap.get(d.id) ?? "low") === "high")
            .append("text")
            .attr("y", (d) => -getNodeDims("high").h / 2 + 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("fill", colors.nodeSubText)
            .attr("font-family", "inherit")
            .attr("letter-spacing", "0.5px")
            .text((d) => d.metadata?.type?.split(".")[0]?.toUpperCase() ?? "");

        // Title (all nodes)
        nodeGroup.append("text")
            .attr("y", (d) => {
                const imp = importanceMap.get(d.id) ?? "low";
                if (imp === "high") return 2;
                if (imp === "medium") return 0;
                return 1;
            })
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => getTitleFontSize(importanceMap.get(d.id) ?? "low"))
            .attr("font-weight", (d) => {
                const imp = importanceMap.get(d.id) ?? "low";
                return imp === "high" ? "700" : imp === "medium" ? "600" : "500";
            })
            .attr("fill", colors.nodeText)
            .attr("font-family", "inherit")
            .text((d) => d.title);

        // Tags row (high and medium importance only)
        nodeGroup.each(function (d) {
            const imp = importanceMap.get(d.id) ?? "low";
            if (imp === "low") return; // No tags for low importance

            const g = d3.select(this);
            const { h } = getNodeDims(imp);
            const TAG_Y = h / 2 - 12;
            const tags = d.tags?.slice(0, imp === "high" ? 3 : 2) ?? [];
            const tagWidth = 42;
            const gap = 5;
            const totalWidth = tags.length * tagWidth + (tags.length - 1) * gap;
            let startX = -totalWidth / 2;
            tags.forEach((tag) => {
                g.append("rect")
                    .attr("x", startX).attr("y", TAG_Y - 8)
                    .attr("width", tagWidth).attr("height", 13)
                    .attr("rx", 3)
                    .attr("fill", colors.tagBg).attr("stroke", colors.tagBorder).attr("stroke-width", 0.8);
                g.append("text")
                    .attr("x", startX + tagWidth / 2).attr("y", TAG_Y)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "8px").attr("fill", colors.tagText).attr("font-family", "inherit")
                    .text(tag.length > 6 ? tag.slice(0, 5) + "…" : tag);
                startX += tagWidth + gap;
            });
        });

        // ── Tick ─────────────────────────────────────────────────────────────
        simulation.on("tick", () => {
            link
                .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
                .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
                .attr("x2", (d) => {
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    if (d.type === "depends") return tx; // no offset needed — no arrowhead
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return tx;
                    const { w } = getNodeDims(importanceMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? "low");
                    return tx - (dx / dist) * (w / 2 + 6);
                })
                .attr("y2", (d) => {
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    if (d.type === "depends") return ty;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return ty;
                    const { h } = getNodeDims(importanceMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? "low");
                    return ty - (dy / dist) * (h / 2 + 6);
                });

            nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);

            // Update edge label positions
            const getMid = (d: GraphEdge) => ({
                mx: ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2,
                my: ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2,
            });
            edgeLabelText.attr("x", (d) => getMid(d).mx).attr("y", (d) => getMid(d).my);
            edgeLabelBg
                .attr("x", (d) => getMid(d).mx - 34).attr("y", (d) => getMid(d).my - 8)
                .attr("width", 68).attr("height", 14);
        });

        return () => { simulation.stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, resolvedTheme]);

    // ── Reactive: update selection / highlight styles ─────────────────────
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const isDark = resolvedTheme === "dark";
        const isSearching = searchQuery.trim().length > 0;

        svg.selectAll<SVGGElement, GraphNode>(".node-group").each(function (d) {
            const g = d3.select(this);
            const isSelected = selectedNode?.id === d.id;
            const isHighlighted = highlightedNodes.includes(d.id);
            const dimmed = isSearching && !isHighlighted;

            g.select("rect")
                .attr("stroke", isSelected
                    ? (isDark ? t.accentBright : t.accent)
                    : isHighlighted
                        ? (isDark ? `${t.accentBright}b3` : `${t.accent}b3`)
                        : (isDark ? "rgba(63,63,70,0.8)" : "rgba(200,200,210,0.9)"))
                .attr("stroke-width", isSelected ? 2.5 : isHighlighted ? 1.8 : 1.5)
                .attr("filter", isSelected || isHighlighted ? "url(#node-glow)" : "none");

            g.style("opacity", dimmed ? 0.2 : 1);
        });
    }, [selectedNode, highlightedNodes, searchQuery, resolvedTheme]);

    return (
        <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: "transparent" }}
        />
    );
}
