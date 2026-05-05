import type { NodeFrontmatter, GraphNode, GraphEdge, EdgeType } from "@/types";

export function buildGraphData(nodes: NodeFrontmatter[]): {
    nodes: GraphNode[];
    edges: GraphEdge[];
} {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const edges: GraphEdge[] = [];
    const seenEdges = new Set<string>();

    for (const node of nodes) {
        // Primary: new links-based schema
        for (const link of node.links ?? []) {
            if (!nodeMap.has(link.to)) continue;
            const key = [node.id, link.to].sort().join("--");
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);
            edges.push({ source: node.id, target: link.to, type: mapLinkType(link.type) });
        }

        // Legacy fallback: connections array (only when links is absent)
        if (!node.links?.length && node.connections?.length) {
            for (const connectionId of node.connections) {
                if (!nodeMap.has(connectionId)) continue;
                const key = [node.id, connectionId].sort().join("--");
                if (seenEdges.has(key)) continue;
                seenEdges.add(key);
                edges.push({ source: node.id, target: connectionId, type: "directed" });
            }
        }
    }

    return { nodes: nodes as GraphNode[], edges };
}

function mapLinkType(type: "uni" | "bi" | "depends" | undefined): EdgeType {
    switch (type) {
        case "bi": return "bidirectional";
        case "depends": return "depends";
        default: return "directed";
    }
}

