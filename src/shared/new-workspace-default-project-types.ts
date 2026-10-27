export type NewWorkspaceDefaultProject =
  | { kind: 'project'; projectId: string }
  | { kind: 'project-group'; projectGroupId: string }

export type NewWorkspaceDefaultProjectSettings = {
  /** Preselected in the new-workspace composer only when no draft, explicit target or active repo seeds it. */
  newWorkspaceDefaultProject: NewWorkspaceDefaultProject | null
}
