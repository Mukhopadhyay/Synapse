# Synapse

A knowledge graph explorer for interconnected concepts. Nodes are authored as MDX files; the graph, edges, and visual importance are all derived automatically from the frontmatter.

---

## Content authoring

All nodes live in `content/nodes/`. Each file is an `.mdx` file with a YAML frontmatter block followed by optional Markdown/MDX body content.

### Frontmatter reference

```yaml
---
# ── Required ─────────────────────────────────────────────────────────────────
id: my-node-id          # Unique slug. Must match the filename (kebab-case).
title: My Node          # Display name shown on the graph card.
description: "…"        # Short summary shown in the inspector panel.
createdAt: 2024-01-01   # ISO date string.
updatedAt: 2024-01-02   # ISO date string.
connections:            # IDs of directly connected nodes. Drives edge generation.
  - other-node-id

# ── Recommended ───────────────────────────────────────────────────────────────
tags:
  - nlp                 # Shown on the graph card (up to 3 for high-importance nodes).
difficulty: 3           # Integer 1–5. Influences edge type derivation.

# ── Direction ─────────────────────────────────────────────────────────────────
direction:
  type: bidirectional   # "unidirectional" | "bidirectional"
  incoming:             # Informational — IDs that point to this node.
    - other-node-id
  outgoing:             # Informational — IDs this node points to.
    - another-node-id

# ── Metadata ──────────────────────────────────────────────────────────────────
metadata:
  type: concept.core    # Dot-separated category. The first segment is shown on high-importance cards.
                        # Use "dependency" anywhere in the type to force a "depends" edge style.
  complexity: 3         # Integer 1–5. Used together with difficulty for edge type.
  imageUrl: /images/x.jpg  # Optional hero image (unused in current UI).

# ── Contributors ──────────────────────────────────────────────────────────────
contributors:
  - name: Jane Smith
    github: janesmith
---
```

### Body content

Everything after the `---` closing fence is rendered as Markdown in the inspector panel. Standard Markdown syntax is supported, including fenced code blocks.

---

## How graph nodes and edges are generated

### Node importance (card size)

Node visual size is determined at render time by the node's **degree** (number of connected edges):

| Degree | Importance | Card size |
|--------|-----------|-----------|
| ≥ 4    | `high`    | 190 × 84 px — shows category label + up to 3 tags |
| ≥ 2    | `medium`  | 160 × 68 px — shows up to 2 tags |
| < 2    | `low`     | 130 × 48 px — title only |

### Edge type derivation

Edge types are derived automatically from the frontmatter of both connected nodes (see `lib/graph/builder.ts`):

| Condition | Edge type |
|-----------|-----------|
| Either node sets `direction.type: bidirectional`, **or** both nodes list each other in `connections` | `bidirectional` — arrow on both ends |
| Either node's `metadata.type` contains the word `dependency` | `depends` — dashed line, no arrows |
| Both nodes have `metadata.complexity` (or `difficulty`) ≤ 1 | `weak` — faint line |
| Default | `directed` — single arrowhead |

### Adding a new node

1. Create `content/nodes/my-topic.mdx` with the frontmatter above.
2. Add the new node's `id` to the `connections` list of any related existing nodes.
3. The graph API route (`app/api/graph/route.ts`) picks up all `.mdx` files automatically on the next request — no config changes needed.

---

## Project structure

```
content/nodes/      MDX source files (one per graph node)
app/api/graph/      API route that parses MDX and builds the graph payload
lib/graph/          Edge derivation logic (builder.ts)
lib/mdx/            Frontmatter + body parser (parser.ts)
components/graph/   ForceGraph renderer, NodeCard, ListView
components/inspector/ Node detail panel
store/              Zustand store (selected node, search, highlights)
types/              Shared TypeScript interfaces
```
