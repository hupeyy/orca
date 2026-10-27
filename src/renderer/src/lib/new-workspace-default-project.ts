import type { NewWorkspaceDefaultProject } from '../../../shared/new-workspace-default-project-types'
import type { Project } from '../../../shared/project-types'

export type NewWorkspaceDefaultProjectSeed = {
  projectId: string | null
  projectGroupId: string | null
}

const NO_DEFAULT_PROJECT_SEED: NewWorkspaceDefaultProjectSeed = {
  projectId: null,
  projectGroupId: null
}

export function resolveNewWorkspaceDefaultProjectSeed({
  defaultProject,
  projects,
  hasOtherSeed
}: {
  defaultProject: NewWorkspaceDefaultProject | null | undefined
  projects: readonly Pick<Project, 'id'>[]
  hasOtherSeed: boolean
}): NewWorkspaceDefaultProjectSeed {
  if (!defaultProject || hasOtherSeed) {
    return NO_DEFAULT_PROJECT_SEED
  }
  if (defaultProject.kind === 'project') {
    // A removed project must fall through to the first-project default, not show a missing-project error.
    return projects.some((project) => project.id === defaultProject.projectId)
      ? { projectId: defaultProject.projectId, projectGroupId: null }
      : NO_DEFAULT_PROJECT_SEED
  }
  // Missing or unreachable groups are dropped by findActionableFolderProjectGroup downstream.
  return { projectId: null, projectGroupId: defaultProject.projectGroupId }
}
