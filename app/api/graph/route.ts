import { getAllNodes } from "@/lib/mdx/parser";
import { buildGraphData } from "@/lib/graph/builder";
import { NextResponse } from "next/server";

export async function GET() {
    const nodes = getAllNodes();
    const { nodes: graphNodes, edges } = buildGraphData(nodes);
    return NextResponse.json({ nodes: graphNodes, edges });
}
