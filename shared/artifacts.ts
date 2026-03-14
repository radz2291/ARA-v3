import type { LucideIcon } from "lucide-react";
import { FileText, MessageSquare, Settings } from "lucide-react";
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
  system_prompt: {
    icon: FileText,
    label: "System Prompt",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    description: "AI instructions and prompts",
  },
  conversation: {
    icon: MessageSquare,
    label: "Conversation",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    description: "Chat history and messages",
  },
  system_config: {
    icon: Settings,
    label: "Config",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    description: "Configuration settings",
  },
};

// ============================================
// Subtype Definitions
// ============================================

/**
 * Subtype values available for system_prompt artifacts.
 */
export const SYSTEM_PROMPT_SUBTYPES = {
  AGENT_INSTRUCTIONS: "agent_instructions",
  CUSTOM_PROMPT: "custom_prompt",
} as const;

/**
 * Subtype values available for system_config artifacts.
 */
export const SYSTEM_CONFIG_SUBTYPES = {
  AGENT_CONFIG: "agent_config",
  MODEL_CONFIG: "model_config",
  WORKSPACE_CONFIG: "workspace_config",
  SESSION_CONFIG: "session_config",
} as const;

/**
 * All subtype values as a union type.
 */
export type ArtifactSubtypeValue =
  | (typeof SYSTEM_PROMPT_SUBTYPES)[keyof typeof SYSTEM_PROMPT_SUBTYPES]
  | (typeof SYSTEM_CONFIG_SUBTYPES)[keyof typeof SYSTEM_CONFIG_SUBTYPES];

export interface ArtifactSubtype {
  value: string;
  label: string;
}

/**
 * Subtypes available for each artifact type.
 * Empty array means the type has no subtypes.
 */
export const ARTIFACT_SUBTYPES: Record<ArtifactType, ArtifactSubtype[]> = {
  system_prompt: [
    {
      value: SYSTEM_PROMPT_SUBTYPES.AGENT_INSTRUCTIONS,
      label: "Agent Instructions",
    },
    { value: SYSTEM_PROMPT_SUBTYPES.CUSTOM_PROMPT, label: "Custom Prompt" },
  ],
  system_config: [
    { value: SYSTEM_CONFIG_SUBTYPES.AGENT_CONFIG, label: "Agent Config" },
    { value: SYSTEM_CONFIG_SUBTYPES.MODEL_CONFIG, label: "Model Config" },
    {
      value: SYSTEM_CONFIG_SUBTYPES.WORKSPACE_CONFIG,
      label: "Workspace Config",
    },
    { value: SYSTEM_CONFIG_SUBTYPES.SESSION_CONFIG, label: "Session Config" },
  ],
  conversation: [],
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
  return (
    artifact.type === "system_prompt" ||
    artifact.type === "system_config" ||
    artifact.subtype === SYSTEM_CONFIG_SUBTYPES.AGENT_CONFIG ||
    artifact.type === "conversation"
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
