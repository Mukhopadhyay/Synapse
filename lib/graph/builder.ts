import type { NodeFrontmatter, GraphNode, GraphEdge } from "@/types";

export function buildGraphData(nodes: NodeFrontmatter[]): {
    nodes: GraphNode[];
    edges: GraphEdge[];
} {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const edges: GraphEdge[] = [];
    const seenEdges = new Set<string>();

    for (const node of nodes) {
        for (const connectionId of node.connections ?? []) {
            if (!nodeMap.has(connectionId)) continue;
            const key = [node.id, connectionId].sort().join("--");
            if (!seenEdges.has(key)) {
                seenEdges.add(key);
                const dirType =
                    typeof node.direction === "object"
                        ? (node.direction?.type ?? "unidirectional")
                        : "unidirectional";
                edges.push({ source: node.id, target: connectionId, direction: dirType });
            }
        }
    }

    return { nodes: nodes as GraphNode[], edges };
}
