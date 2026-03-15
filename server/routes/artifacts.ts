import { RequestHandler } from "express";
import { storage } from "../storage";
import { getSubtypes, type ArtifactType } from "../../shared/artifacts";

// ============================================
// Type/Subtype Validation Helpers
// ============================================

const VALID_TYPES: ArtifactType[] = ["output", "summary", "code"];

function isValidType(type: string): type is ArtifactType {
  return VALID_TYPES.includes(type as ArtifactType);
}

function isValidSubtype(type: ArtifactType, subtype: string): boolean {
  const subtypes = getSubtypes(type);
  if (subtypes.length === 0) return true;
  return subtypes.some((s) => s.value === subtype);
}

// GET /api/artifacts
export const handleListArtifacts: RequestHandler = (req, res) => {
  const { type, subtype, agentId, search } = req.query as Record<
    string,
    string
  >;

  // Validate type if provided
  if (type && !isValidType(type)) {
    res.status(400).json({
      error: `Invalid type: ${type}. Valid types: ${VALID_TYPES.join(", ")}`,
    });
    return;
  }

  // Validate subtype if type and subtype are both provided
  if (type && subtype && !isValidSubtype(type as ArtifactType, subtype)) {
    res
      .status(400)
      .json({ error: `Invalid subtype '${subtype}' for type '${type}'` });
    return;
  }

  const artifacts = storage.artifacts.list({
    type: type as ArtifactType,
    subtype,
    agentId,
    search,
  });
  res.json(artifacts);
};

// POST /api/artifacts
export const handleCreateArtifact: RequestHandler = (req, res) => {
  const { name, type, subtype, description, agentId, content } = req.body;
  if (!name || !type || content === undefined) {
    res.status(400).json({ error: "name, type, and content are required" });
    return;
  }

  // Validate type
  if (!isValidType(type)) {
    res.status(400).json({
      error: `Invalid type: ${type}. Valid types: ${VALID_TYPES.join(", ")}`,
    });
    return;
  }

  // Validate subtype
  if (subtype && !isValidSubtype(type, subtype)) {
    res
      .status(400)
      .json({ error: `Invalid subtype '${subtype}' for type '${type}'` });
    return;
  }

  const artifact = storage.artifacts.create({
    name,
    type: type as ArtifactType,
    subtype,
    description,
    agentId,
    content,
  });
  res.status(201).json(artifact);
};

// GET /api/artifacts/:id
export const handleGetArtifact: RequestHandler = (req, res) => {
  const artifact = storage.artifacts.get(req.params.id);
  if (!artifact) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }
  res.json(artifact);
};

// PATCH /api/artifacts/:id  — update content (auto-versions) or metadata
export const handleUpdateArtifact: RequestHandler = (req, res) => {
  const { content, note, name, description, subtype } = req.body;
  try {
    let artifact = storage.artifacts.get(req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    if (content !== undefined) {
      artifact = storage.artifacts.update(req.params.id, content, note);
    }

    if (
      name !== undefined ||
      description !== undefined ||
      subtype !== undefined
    ) {
      // Validate subtype if provided
      if (subtype && !isValidSubtype(artifact.type, subtype)) {
        res.status(400).json({
          error: `Invalid subtype '${subtype}' for type '${artifact.type}'`,
        });
        return;
      }

      artifact = storage.artifacts.updateMeta(req.params.id, {
        name,
        description,
        subtype,
      });
    }

    res.json(artifact);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

// DELETE /api/artifacts/:id
export const handleDeleteArtifact: RequestHandler = (req, res) => {
  const deleted = storage.artifacts.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  res.json({ success: true });
};

// POST /api/artifacts/:id/restore/:versionId
export const handleRestoreArtifact: RequestHandler = (req, res) => {
  try {
    const artifact = storage.artifacts.restore(
      req.params.id,
      req.params.versionId,
    );

    res.json(artifact);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};
