import type { LucideIcon } from "lucide-react";
import { FileCode, FileText, Zap } from "lucide-react";
import type { Artifact, ArtifactType } from "./types";

// Re-export ArtifactType for convenience
export type { ArtifactType } from "./types";

// ============================================
// Artifact Type Metadata
// ============================================

export interface ArtifactTypeMeta {
  icon: LucideIcon;
  label: string;
  color: string;
  description?: string;
}

/**
 * Central registry of all artifact type metadata.
 * Used for displaying type information in UI components.
 */
export const ARTIFACT_TYPES: Record<ArtifactType, ArtifactTypeMeta> = {
  output: {
    icon: Zap,
    label: "Output",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    description: "AI-generated output",
  },
  summary: {
    icon: FileText,
    label: "Summary",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    description: "AI-generated summary",
  },
  code: {
    icon: FileCode,
    label: "Code",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    description: "AI-generated code",
  },
};

// ============================================
// Subtype Definitions
// ============================================

export interface ArtifactSubtype {
  value: string;
  label: string;
}

/**
 * Subtypes available for each artifact type.
 * Empty array means the type has no subtypes.
 */
export const ARTIFACT_SUBTYPES: Record<ArtifactType, ArtifactSubtype[]> = {
  output: [],
  summary: [],
  code: [],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get metadata for an artifact type.
 * @param type - The artifact type
 * @returns The metadata for the type, or undefined if not found
 */
export function getArtifactMeta(
  type: ArtifactType,
): ArtifactTypeMeta | undefined {
  return ARTIFACT_TYPES[type];
}

/**
 * Get subtypes for an artifact type.
 * @param type - The artifact type
 * @returns Array of subtypes for the type
 */
export function getSubtypes(type: ArtifactType): ArtifactSubtype[] {
  return ARTIFACT_SUBTYPES[type] ?? [];
}

/**
 * Check if an artifact is editable.
 * @param artifact - The artifact to check
 * @returns True if the artifact is editable
 */
export function isArtifactEditable(artifact: Artifact): boolean {
  // AI-generated content artifacts are editable
  return (
    artifact.type === "output" ||
    artifact.type === "summary" ||
    artifact.type === "code"
  );
}

/**
 * Check if an artifact type has subtypes.
 * @param type - The artifact type
 * @returns True if the type has subtypes
 */
export function hasSubtypes(type: ArtifactType): boolean {
  return ARTIFACT_SUBTYPES[type]?.length > 0;
}
