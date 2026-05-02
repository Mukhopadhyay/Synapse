"use client";

import { useSynapseStore } from "@/store";
import { NodeInspectorContent } from "@/components/inspector/NodeInspector";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

/**
 * Modal dialog for inspecting a node — used on mobile viewports and when the
 * desktop inspector is in "fullscreen" mode.  Shares the same content
 * component as the side-panel inspector.
 */
export function NodeDialog() {
    const { selectedNode, setSelectedNode, setInspectorFullscreen } =
        useSynapseStore();

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedNode(null);
            setInspectorFullscreen(false);
        }
    };

    return (
        <Dialog open={!!selectedNode} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden gap-0"
                showCloseButton
            >
                {/* Accessible title (visually shown inside NodeInspectorContent hero) */}
                <DialogTitle className="sr-only">
                    {selectedNode?.title ?? "Node Inspector"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Details and metadata for the selected knowledge graph node.
                </DialogDescription>

                <ScrollArea className="max-h-[85vh]">
                    <NodeInspectorContent />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
