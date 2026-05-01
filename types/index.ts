export interface NodeFrontmatter {
    id: string;
    title: string;
    description: string;
    tags: string[];
    direction?: {
        type?: "unidirectional" | "bidirectional";
        incoming?: string[];
        outgoing?: string[];
    } | string;
    difficulty?: number; // 1–5
    createdAt: string;
    updatedAt: string;
    contributors?: { name: string; github: string }[];
    metadata?: {
        type?: string;
        complexity?: number;
        imageUrl?: string;
    };
    connections: string[];
    content?: string;
}

export interface GraphNode extends NodeFrontmatter {
    // D3 simulation fields (populated at runtime)
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
    index?: number;
}

export interface GraphEdge {
    source: string | GraphNode;
    target: string | GraphNode;
    direction?: "unidirectional" | "bidirectional";
}
