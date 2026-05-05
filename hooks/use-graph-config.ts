"use client";

import { useState, useCallback } from "react";

export interface GraphConfig {
    linkDistance: number;
    chargeStrength: number;
    collideRadius: number;
    alphaDecay: number;
}

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
    linkDistance: 240,
    chargeStrength: -700,
    collideRadius: 130,
    alphaDecay: 0.0228,
};

const STORAGE_KEY = "synapse-graph-config";

function loadConfig(): GraphConfig {
    if (typeof window === "undefined") return DEFAULT_GRAPH_CONFIG;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...DEFAULT_GRAPH_CONFIG, ...JSON.parse(stored) };
    } catch {
        // ignore
    }
    return DEFAULT_GRAPH_CONFIG;
}

export function useGraphConfig() {
    const [config, setConfigState] = useState<GraphConfig>(loadConfig);

    const setConfig = useCallback((update: Partial<GraphConfig>) => {
        setConfigState((prev) => {
            const next = { ...prev, ...update };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const resetConfig = useCallback(() => {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setConfigState(DEFAULT_GRAPH_CONFIG);
    }, []);

    return { config, setConfig, resetConfig };
}
