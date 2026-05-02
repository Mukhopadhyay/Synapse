import type { NodeFrontmatter, GraphNode, GraphEdge, EdgeType } from "@/types";

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
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);

            const edgeType = deriveEdgeType(node, nodeMap.get(connectionId)!);
            edges.push({ source: node.id, target: connectionId, type: edgeType });
        }
    }

    return { nodes: nodes as GraphNode[], edges };
}

/**
 * Derive a semantic edge type from the frontmatter of both endpoints.
 *
 * Priority:
 *  1. If both nodes list each other AND either declares `bidirectional` → "bidirectional"
 *  2. If either node's metadata.type contains "dependency" → "depends"
 *  3. If both nodes have low complexity (≤ 1) → "weak"
 *  4. Default → "directed"
 */
function deriveEdgeType(a: NodeFrontmatter, b: NodeFrontmatter): EdgeType {
    const aDir =
        typeof a.direction === "object" ? a.direction?.type : undefined;
    const bDir =
        typeof b.direction === "object" ? b.direction?.type : undefined;

    // Bidirectional: either endpoint explicitly says so, or both list each other
    const aConnectsB = (a.connections ?? []).includes(b.id);
    const bConnectsA = (b.connections ?? []).includes(a.id);

    if (
        aDir === "bidirectional" ||
        bDir === "bidirectional" ||
        (aConnectsB && bConnectsA)
    ) {
        return "bidirectional";
    }

    // Dependency: metadata.type contains "dependency"
    const aType = a.metadata?.type?.toLowerCase() ?? "";
    const bType = b.metadata?.type?.toLowerCase() ?? "";
    if (aType.includes("dependency") || bType.includes("dependency")) {
        return "depends";
    }

    // Weak: both endpoints are low-complexity / low-difficulty
    const aCplx = a.metadata?.complexity ?? a.difficulty ?? 3;
    const bCplx = b.metadata?.complexity ?? b.difficulty ?? 3;
    if (aCplx <= 1 && bCplx <= 1) {
        return "weak";
    }

    return "directed";
}
