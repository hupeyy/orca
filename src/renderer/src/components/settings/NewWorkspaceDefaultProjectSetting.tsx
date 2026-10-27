import type React from 'react'
import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getComposerEligibleRepos } from '@/lib/new-workspace-composer-repo'
import {
  buildNewWorkspaceCreateTargetOptions,
  getProjectGroupIdFromNewWorkspaceOptionId,
  NEW_WORKSPACE_PROJECT_GROUP_OPTION_PREFIX
} from '@/lib/new-workspace-project-options'
import { translate } from '@/i18n/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import type { NewWorkspaceDefaultProject } from '../../../../shared/new-workspace-default-project-types'

const NO_DEFAULT_VALUE = '__none__'

function toOptionId(defaultProject: NewWorkspaceDefaultProject | null): string {
  if (!defaultProject) {
    return NO_DEFAULT_VALUE
  }
  return defaultProject.kind === 'project'
    ? defaultProject.projectId
    : `${NEW_WORKSPACE_PROJECT_GROUP_OPTION_PREFIX}${defaultProject.projectGroupId}`
}

function fromOptionId(optionId: string): NewWorkspaceDefaultProject | null {
  if (optionId === NO_DEFAULT_VALUE) {
    return null
  }
  const projectGroupId = getProjectGroupIdFromNewWorkspaceOptionId(optionId)
  return projectGroupId
    ? { kind: 'project-group', projectGroupId }
    : { kind: 'project', projectId: optionId }
}

export function NewWorkspaceDefaultProjectSetting({
  settings,
  updateSettings,
  labelId
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  labelId: string
}): React.JSX.Element {
  const repos = useAppStore((s) => s.repos)
  const projects = useAppStore((s) => s.projects)
  const projectHostSetups = useAppStore((s) => s.projectHostSetups)
  const projectGroups = useAppStore((s) => s.projectGroups)

  const options = useMemo(
    () =>
      buildNewWorkspaceCreateTargetOptions({
        projects,
        projectHostSetups,
        eligibleRepos: getComposerEligibleRepos(repos),
        projectGroups
      }),
    [projectGroups, projectHostSetups, projects, repos]
  )

  const selectedOptionId = toOptionId(settings.newWorkspaceDefaultProject ?? null)
  // A removed project or folder reads as no default instead of an empty trigger.
  const value =
    selectedOptionId === NO_DEFAULT_VALUE ||
    options.some((option) => option.id === selectedOptionId)
      ? selectedOptionId
      : NO_DEFAULT_VALUE

  return (
    <Select
      value={value}
      onValueChange={(next) => updateSettings({ newWorkspaceDefaultProject: fromOptionId(next) })}
    >
      <SelectTrigger size="sm" className="min-w-56" aria-labelledby={labelId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DEFAULT_VALUE}>
          {translate(
            'auto.components.settings.NewWorkspaceDefaultProjectSetting.none',
            'Current or first project'
          )}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.displayName}
            <span className="ml-2 text-muted-foreground">{option.detail}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
