export interface NodeLink {
    to: string;
    type?: "uni" | "bi" | "depends";
}

export interface NodeContributor {
    name: string;
    github: string;
}

export interface NodeFrontmatter {
    id: string;
    title: string;
    description?: string;
    difficulty: number; // 1–5
    tags?: string[];
    aliases?: string[];
    important?: boolean;
    contributors: NodeContributor[];
    links: NodeLink[];
    content?: string;
    // Legacy optional fields kept for compatibility
    createdAt?: string;
    updatedAt?: string;
    connections?: string[];
    direction?: {
        type?: "unidirectional" | "bidirectional";
        incoming?: string[];
        outgoing?: string[];
    } | string;
    metadata?: {
        type?: string;
        complexity?: number;
        imageUrl?: string;
    };
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

export type EdgeType = "directed" | "bidirectional" | "depends" | "weak";

export interface GraphEdge {
    source: string | GraphNode;
    target: string | GraphNode;
    type: EdgeType;
}
