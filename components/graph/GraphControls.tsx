"use client";

import { useState } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import type { GraphConfig } from "@/hooks/use-graph-config";
import { DEFAULT_GRAPH_CONFIG } from "@/hooks/use-graph-config";

interface GraphControlsProps {
    config: GraphConfig;
    onChange: (update: Partial<GraphConfig>) => void;
    onReset: () => void;
}

export function GraphControls({ config, onChange, onReset }: GraphControlsProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed md:absolute bottom-4 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
            {open && (
                <div className="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-4 w-64 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                            Graph Settings
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={onReset}
                                title="Reset to defaults"
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                <RotateCcw className="size-3.5" />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <ConfigSlider
                            label="Link distance"
                            value={config.linkDistance}
                            min={80} max={600} step={10}
                            defaultValue={DEFAULT_GRAPH_CONFIG.linkDistance}
                            onChange={(v) => onChange({ linkDistance: v })}
                        />
                        <ConfigSlider
                            label="Charge strength"
                            value={config.chargeStrength}
                            min={-2000} max={-100} step={50}
                            defaultValue={DEFAULT_GRAPH_CONFIG.chargeStrength}
                            onChange={(v) => onChange({ chargeStrength: v })}
                        />
                        <ConfigSlider
                            label="Collision radius"
                            value={config.collideRadius}
                            min={40} max={300} step={10}
                            defaultValue={DEFAULT_GRAPH_CONFIG.collideRadius}
                            onChange={(v) => onChange({ collideRadius: v })}
                        />
                        <ConfigSlider
                            label="Alpha decay"
                            value={config.alphaDecay}
                            min={0.005} max={0.1} step={0.005}
                            defaultValue={DEFAULT_GRAPH_CONFIG.alphaDecay}
                            onChange={(v) => onChange({ alphaDecay: v })}
                            display={(v) => v.toFixed(3)}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen((o) => !o)}
                title="Graph settings"
                className="pointer-events-auto size-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
                <SlidersHorizontal className="size-4" />
            </button>
        </div>
    );
}

interface ConfigSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    onChange: (v: number) => void;
    display?: (v: number) => string;
}

function ConfigSlider({ label, value, min, max, step, onChange, display }: ConfigSliderProps) {
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
                <span className="text-[11px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                    {display ? display(value) : value}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 cursor-pointer accent-[#dc2626]"
            />
        </div>
    );
}
