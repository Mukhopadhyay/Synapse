import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { NodeFrontmatter } from "@/types";

const NODES_DIR = path.join(process.cwd(), "content/nodes");

export function getAllNodeFiles(): string[] {
    if (!fs.existsSync(NODES_DIR)) return [];
    return fs
        .readdirSync(NODES_DIR)
        .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
}

export function parseNodeFile(filename: string): NodeFrontmatter | null {
    const filePath = path.join(NODES_DIR, filename);
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(raw);
        return { ...data, content: content.trim() } as NodeFrontmatter;
    } catch {
        return null;
    }
}

export function getAllNodes(): NodeFrontmatter[] {
    return getAllNodeFiles()
        .map(parseNodeFile)
        .filter((n): n is NodeFrontmatter => n !== null);
}
