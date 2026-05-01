"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import type { GraphNode, GraphEdge } from "@/types";
import { useSynapseStore } from "@/store";

interface ForceGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

const BASE_WIDTH = 150;
const BASE_HEIGHT = 64;
const CORNER_RADIUS = 12;
const SCALE_FACTOR = 10;
const MAX_EXTRA_W = 60;
const MAX_EXTRA_H = 20;

function getNodeDims(degree: number) {
    const w = BASE_WIDTH + Math.min(degree * SCALE_FACTOR, MAX_EXTRA_W);
    const h = BASE_HEIGHT + Math.min(degree * SCALE_FACTOR * 0.4, MAX_EXTRA_H);
    return { w, h };
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
            tagBg: isDark ? "rgba(109,40,217,0.3)" : "rgba(139,92,246,0.12)",
            tagBorder: isDark ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.4)",
            tagText: isDark ? "#a78bfa" : "#6d28d9",
            edgeUni: isDark ? "rgba(139,92,246,0.35)" : "rgba(109,40,217,0.3)",
            edgeBi: isDark ? "rgba(139,92,246,0.2)" : "rgba(109,40,217,0.18)",
            edgeHover: isDark ? "rgba(167,139,250,0.9)" : "rgba(109,40,217,0.9)",
            arrowFill: isDark ? "rgba(167,139,250,0.8)" : "rgba(109,40,217,0.7)",
            labelText: isDark ? "#a78bfa" : "#6d28d9",
            labelBg: isDark ? "rgba(24,24,27,0.85)" : "rgba(255,255,255,0.9)",
        };

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

        // Arrow marker for unidirectional edges
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

        // Hover arrow marker (brighter)
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

        // ── Clone data ───────────────────────────────────────────────────────
        const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
        const idToSimNode = new Map(simNodes.map((n) => [n.id, n]));

        const simEdges: GraphEdge[] = edges
            .map((e) => ({
                source: idToSimNode.get(e.source as string) ?? e.source,
                target: idToSimNode.get(e.target as string) ?? e.target,
                direction: e.direction,
            }))
            .filter((e) => e.source && e.target);

        // ── Degree map ───────────────────────────────────────────────────────
        const degreeMap = new Map<string, number>();
        simEdges.forEach((e) => {
            const s = ((e.source as GraphNode).id ?? e.source) as string;
            const t = ((e.target as GraphNode).id ?? e.target) as string;
            degreeMap.set(s, (degreeMap.get(s) ?? 0) + 1);
            degreeMap.set(t, (degreeMap.get(t) ?? 0) + 1);
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
            .attr("stroke", (d) => d.direction === "bidirectional" ? colors.edgeBi : colors.edgeUni)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", (d) => d.direction === "bidirectional" ? "5,4" : "none")
            .attr("marker-end", (d) => d.direction !== "bidirectional" ? "url(#arrowhead)" : null)
            .style("cursor", "pointer");

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
            .text((d) => d.direction ?? "unidirectional");

        link
            .on("mouseover", function (_, d) {
                d3.select(this)
                    .attr("stroke", colors.edgeHover)
                    .attr("stroke-width", 2.5)
                    .attr("marker-end", d.direction !== "bidirectional" ? "url(#arrowhead-hover)" : null);
                const i = simEdges.indexOf(d);
                edgeLabelBg.filter((_, j) => j === i).style("opacity", 1);
                edgeLabelText.filter((_, j) => j === i).style("opacity", 1);
            })
            .on("mouseout", function (_, d) {
                d3.select(this)
                    .attr("stroke", d.direction === "bidirectional" ? colors.edgeBi : colors.edgeUni)
                    .attr("stroke-width", 1.5)
                    .attr("marker-end", d.direction !== "bidirectional" ? "url(#arrowhead)" : null);
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
                const { w, h } = getNodeDims(degreeMap.get(d.id) ?? 0);
                d3.select(this).select("rect")
                    .attr("filter", "url(#node-glow)")
                    .attr("stroke", isDark ? "#8b5cf6" : "#6d28d9")
                    .attr("stroke-width", 2)
                    .attr("x", -w / 2 - 2).attr("y", -h / 2 - 2)
                    .attr("width", w + 4).attr("height", h + 4);
            })
            .on("mouseout", function (_, d) {
                const isSelected = selectedNode?.id === d.id;
                const { w, h } = getNodeDims(degreeMap.get(d.id) ?? 0);
                d3.select(this).select("rect")
                    .attr("filter", isSelected ? "url(#node-glow)" : "none")
                    .attr("stroke", isSelected ? (isDark ? "#8b5cf6" : "#6d28d9") : colors.nodeBorder)
                    .attr("stroke-width", isSelected ? 2.5 : 1.5)
                    .attr("x", -w / 2).attr("y", -h / 2)
                    .attr("width", w).attr("height", h);
            });

        // Card background (variable size based on degree)
        nodeGroup.append("rect")
            .attr("x", (d) => -getNodeDims(degreeMap.get(d.id) ?? 0).w / 2)
            .attr("y", (d) => -getNodeDims(degreeMap.get(d.id) ?? 0).h / 2)
            .attr("width", (d) => getNodeDims(degreeMap.get(d.id) ?? 0).w)
            .attr("height", (d) => getNodeDims(degreeMap.get(d.id) ?? 0).h)
            .attr("rx", CORNER_RADIUS)
            .attr("fill", colors.nodeBg)
            .attr("stroke", colors.nodeBorder)
            .attr("stroke-width", 1.5);

        // Category label
        nodeGroup.append("text")
            .attr("y", (d) => -getNodeDims(degreeMap.get(d.id) ?? 0).h / 2 + 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("fill", colors.nodeSubText)
            .attr("font-family", "inherit")
            .text((d) => d.metadata?.type?.split(".")[0]?.toUpperCase() ?? "");

        // Title
        nodeGroup.append("text")
            .attr("y", 2)
            .attr("text-anchor", "middle")
            .attr("font-size", (d) => {
                const deg = degreeMap.get(d.id) ?? 0;
                return deg >= 4 ? "14px" : deg >= 2 ? "13px" : "12px";
            })
            .attr("font-weight", "600")
            .attr("fill", colors.nodeText)
            .attr("font-family", "inherit")
            .text((d) => d.title);

        // Tags row
        nodeGroup.each(function (d) {
            const g = d3.select(this);
            const { h } = getNodeDims(degreeMap.get(d.id) ?? 0);
            const TAG_Y = h / 2 - 12;
            const tags = d.tags?.slice(0, 2) ?? [];
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
                    if (d.direction === "bidirectional") return tx;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return tx;
                    const { w } = getNodeDims(degreeMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? 0);
                    return tx - (dx / dist) * (w / 2 + 6);
                })
                .attr("y2", (d) => {
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    if (d.direction === "bidirectional") return ty;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return ty;
                    const { h } = getNodeDims(degreeMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? 0);
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
                    ? (isDark ? "#8b5cf6" : "#6d28d9")
                    : isHighlighted
                        ? (isDark ? "rgba(139,92,246,0.7)" : "rgba(109,40,217,0.7)")
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

