"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import * as d3 from "d3";
import { createRoot, type Root } from "react-dom/client";
import type { GraphNode, GraphEdge, EdgeType } from "@/types";
import { useSynapseStore } from "@/store";
import { theme as t } from "@/lib/theme";
import { NodeCard, type Importance, NODE_DIMS } from "./NodeCard";
import { useGraphConfig } from "@/hooks/use-graph-config";
import { GraphControls } from "./GraphControls";

interface ForceGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// ── Importance thresholds ─────────────────────────────────────────────────────
const HIGH_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 2;

function getImportance(node: GraphNode, degree: number): Importance {
    if (node.important === true) return "high";
    if (degree >= HIGH_THRESHOLD) return "high";
    if (degree >= MEDIUM_THRESHOLD) return "medium";
    return "low";
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
    const rootsRef = useRef<Map<string, Root>>(new Map());
    const importanceMapRef = useRef<Map<string, Importance>>(new Map());
    const selectedNodeRef = useRef<GraphNode | null>(null);
    const highlightedNodesRef = useRef<string[]>([]);
    const isDarkRef = useRef<boolean>(false);
    const { selectedNode, setSelectedNode, highlightedNodes, searchQuery } =
        useSynapseStore();
    const { resolvedTheme } = useTheme();
    const { config, setConfig, resetConfig } = useGraphConfig();
    const configRef = useRef(config);
    useEffect(() => { configRef.current = config; }, [config]);

    // ── Keep refs in sync with latest store state (for use inside D3 closures) ──
    useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
    useEffect(() => { highlightedNodesRef.current = highlightedNodes; }, [highlightedNodes]);
    useEffect(() => { isDarkRef.current = resolvedTheme === "dark"; }, [resolvedTheme]);

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
            importanceMap.set(n.id, getImportance(n, degreeMap.get(n.id) ?? 0));
        });
        importanceMapRef.current = importanceMap;
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
        const cfg = configRef.current;
        const simulation = d3
            .forceSimulation<GraphNode>(simNodes)
            .force("link", d3.forceLink<GraphNode, GraphEdge>(simEdges).id((d) => d.id).distance(cfg.linkDistance).strength(0.6))
            .force("charge", d3.forceManyBody().strength(cfg.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(cfg.collideRadius))
            .alphaDecay(cfg.alphaDecay);
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
                // Re-render NodeCard with hover state
                const imp = importanceMapRef.current.get(d.id) ?? "low";
                const root = rootsRef.current.get(d.id);
                root?.render(
                    <NodeCard
                        node={d}
                        importance={imp}
                        isSelected={selectedNodeRef.current?.id === d.id}
                        isHighlighted={highlightedNodesRef.current.includes(d.id)}
                        isHovered={true}
                        isDark={isDarkRef.current}
                    />
                );

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
                // Restore NodeCard to non-hover state
                const imp = importanceMapRef.current.get(d.id) ?? "low";
                const root = rootsRef.current.get(d.id);
                root?.render(
                    <NodeCard
                        node={d}
                        importance={imp}
                        isSelected={selectedNodeRef.current?.id === d.id}
                        isHighlighted={highlightedNodesRef.current.includes(d.id)}
                        isHovered={false}
                        isDark={isDarkRef.current}
                    />
                );

                // Restore edge styles
                link.each(function (ed) {
                    const edgeData = ed as GraphEdge;
                    d3.select(this)
                        .attr("stroke", edgeColor(edgeData.type))
                        .attr("stroke-width", edgeStrokeWidth(edgeData.type))
                        .attr("opacity", edgeOpacity(edgeData.type));
                });
            });

        // ── React NodeCard rendered into each node via foreignObject ─────────────────
        nodeGroup.each(function (d) {
            const g = d3.select<SVGGElement, GraphNode>(this);
            const imp = importanceMap.get(d.id) ?? "low";
            const { w, h } = NODE_DIMS[imp];

            // Visual layer — pointer-events disabled so SVG hit rect below handles interactions
            const fo = g.append("foreignObject")
                .attr("width", w)
                .attr("height", h)
                .attr("x", -w / 2)
                .attr("y", -h / 2)
                .style("pointer-events", "none");

            const div = document.createElement("div");
            div.style.width = `${w}px`;
            div.style.height = `${h}px`;
            div.style.pointerEvents = "none";
            (fo.node() as SVGForeignObjectElement).appendChild(div);

            const root = createRoot(div);
            rootsRef.current.set(d.id, root);
            root.render(
                <NodeCard
                    node={d}
                    importance={imp}
                    isSelected={selectedNodeRef.current?.id === d.id}
                    isHighlighted={highlightedNodesRef.current.includes(d.id)}
                    isHovered={false}
                    isDark={isDark}
                />
            );

            // Transparent hit area on top — receives all D3 pointer events (drag, click, hover)
            g.append("rect")
                .attr("x", -w / 2)
                .attr("y", -h / 2)
                .attr("width", w)
                .attr("height", h)
                .attr("rx", 12)
                .attr("fill", "transparent")
                .style("pointer-events", "all");
        });

        // ── Tick ─────────────────────────────────────────────────────────────
        simulation.on("tick", () => {
            link
                .attr("x1", (d) => {
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return sx;
                    const { w } = NODE_DIMS[importanceMap.get(((d.source as GraphNode).id ?? d.source) as string) ?? "low"];
                    return sx + (dx / dist) * (w / 2 + 6);
                })
                .attr("y1", (d) => {
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return sy;
                    const { h } = NODE_DIMS[importanceMap.get(((d.source as GraphNode).id ?? d.source) as string) ?? "low"];
                    return sy + (dy / dist) * (h / 2 + 6);
                })
                .attr("x2", (d) => {
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return tx;
                    const { w } = NODE_DIMS[importanceMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? "low"];
                    return tx - (dx / dist) * (w / 2 + 6);
                })
                .attr("y2", (d) => {
                    const sx = (d.source as GraphNode).x ?? 0;
                    const tx = (d.target as GraphNode).x ?? 0;
                    const sy = (d.source as GraphNode).y ?? 0;
                    const ty = (d.target as GraphNode).y ?? 0;
                    const dx = tx - sx, dy = ty - sy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return ty;
                    const { h } = NODE_DIMS[importanceMap.get(((d.target as GraphNode).id ?? d.target) as string) ?? "low"];
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

        return () => {
            simulation.stop();
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, resolvedTheme]);

    // ── Reactive: update D3 forces in-place when config changes ──────────────
    useEffect(() => {
        const sim = simulationRef.current;
        if (!sim) return;
        (sim.force("link") as d3.ForceLink<GraphNode, GraphEdge> | null)?.distance(config.linkDistance);
        (sim.force("charge") as d3.ForceManyBody<GraphNode> | null)?.strength(config.chargeStrength);
        (sim.force("collide") as d3.ForceCollide<GraphNode> | null)?.radius(config.collideRadius);
        sim.alphaDecay(config.alphaDecay);
        sim.alpha(0.3).restart();
    }, [config]);

    // ── Reactive: update NodeCard props when selection / highlight changes ─────
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const currentIsDark = resolvedTheme === "dark";
        const isSearching = searchQuery.trim().length > 0;

        svg.selectAll<SVGGElement, GraphNode>(".node-group").each(function (d) {
            const isSelected = selectedNode?.id === d.id;
            const isHighlighted = highlightedNodes.includes(d.id);
            const dimmed = isSearching && !isHighlighted;

            d3.select(this).style("opacity", dimmed ? 0.2 : 1);

            const root = rootsRef.current.get(d.id);
            const imp = importanceMapRef.current.get(d.id) ?? "low";
            root?.render(
                <NodeCard
                    node={d}
                    importance={imp}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isHovered={false}
                    isDark={currentIsDark}
                />
            );
        });
    }, [selectedNode, highlightedNodes, searchQuery, resolvedTheme]);

    return (
        <div className="relative w-full h-full">
            <svg
                ref={svgRef}
                className="w-full h-full"
                style={{ background: "transparent" }}
            />
            <GraphControls config={config} onChange={setConfig} onReset={resetConfig} />
        </div>
    );
}
