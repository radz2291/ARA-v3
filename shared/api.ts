/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

export interface ExecutionStep {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}
