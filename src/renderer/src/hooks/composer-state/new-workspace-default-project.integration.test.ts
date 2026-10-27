// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store'
import { getDefaultSettings } from '../../../../shared/constants'
import type { NewWorkspaceDefaultProject } from '../../../../shared/new-workspace-default-project-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import { projectHostSetupProjectionFromRepos } from '../../../../shared/project-host-setup-projection'
import { EMPTY_RETIRED_NAME_REGISTRY } from '../../../../shared/worktree/retired-name-registry'
import { useComposerState } from '../useComposerState'

const originalState = useAppStore.getState()
let originalApiDescriptor: PropertyDescriptor | undefined

const firstRepo: Repo = {
  id: 'first',
  path: '/repos/first',
  displayName: 'A',
  badgeColor: '',
  addedAt: 0
}
const defaultRepo: Repo = { ...firstRepo, id: 'default', path: '/repos/default', displayName: 'B' }
const folderGroup: ProjectGroup = {
  id: 'dev',
  name: 'dev',
  parentPath: '/dev',
  parentGroupId: null,
  createdFrom: 'folder-scan',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 0,
  updatedAt: 0
}

function openComposer({
  defaultProject,
  activeRepoId = null,
  initialRepoId
}: {
  defaultProject: NewWorkspaceDefaultProject | null
  activeRepoId?: string | null
  initialRepoId?: string
}) {
  const repos = [firstRepo, defaultRepo]
  const projection = projectHostSetupProjectionFromRepos(repos)
  useAppStore.setState({
    repos,
    projects: [...projection.projects],
    projectHostSetups: [...projection.setups],
    projectGroups: [folderGroup],
    activeRepoId,
    newWorkspaceDraft: null,
    worktreesByRepo: {},
    sparsePresetsByRepo: {},
    settings: { ...getDefaultSettings('/home'), newWorkspaceDefaultProject: defaultProject }
  })
  return renderHook(() => useComposerState({ persistDraft: false, initialRepoId })).result.current
    .cardProps
}

// Background lookups only need to settle: calls resolve null, and on* subscriptions return an unsubscribe.
function stubIpcNamespace(overrides: Record<string, unknown> = {}, name = ''): unknown {
  const namespaces = new Map<PropertyKey, unknown>(Object.entries(overrides))
  const call = name.startsWith('on') ? () => () => {} : () => Promise.resolve(null)
  return new Proxy(call, {
    get: (_target, key) => {
      if (key === 'then') {
        return undefined
      }
      if (!namespaces.has(key)) {
        namespaces.set(key, stubIpcNamespace({}, String(key)))
      }
      return namespaces.get(key)
    }
  })
}

beforeEach(() => {
  originalApiDescriptor = Object.getOwnPropertyDescriptor(window, 'api')
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: stubIpcNamespace({
      preflight: { detectAgents: vi.fn().mockResolvedValue([]) },
      worktrees: stubIpcNamespace({
        listRetiredNames: vi.fn().mockResolvedValue(EMPTY_RETIRED_NAME_REGISTRY)
      })
    })
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useAppStore.setState(originalState, true)
  if (originalApiDescriptor) {
    Object.defineProperty(window, 'api', originalApiDescriptor)
  } else {
    Reflect.deleteProperty(window, 'api')
  }
})

describe('new workspace default project', () => {
  it('starts on the default folder group when nothing else seeds the composer', () => {
    const card = openComposer({
      defaultProject: { kind: 'project-group', projectGroupId: folderGroup.id }
    })
    expect(card.selectedProjectId).toBe(`project-group:${folderGroup.id}`)
  })

  it('starts on the default project instead of the first one', () => {
    const card = openComposer({ defaultProject: { kind: 'project', projectId: 'repo:default' } })
    expect(card.selectedRepo?.id).toBe(defaultRepo.id)
  })

  it.each([
    ['the active repo', { activeRepoId: firstRepo.id }],
    ['an explicit repo', { initialRepoId: firstRepo.id }]
  ])('lets %s win over the default', (_label, seed) => {
    const card = openComposer({
      defaultProject: { kind: 'project-group', projectGroupId: folderGroup.id },
      ...seed
    })
    expect(card.selectedProjectId).not.toBe(`project-group:${folderGroup.id}`)
    expect(card.selectedRepo?.id).toBe(firstRepo.id)
  })

  it.each<NewWorkspaceDefaultProject>([
    { kind: 'project', projectId: 'repo:removed' },
    { kind: 'project-group', projectGroupId: 'removed' }
  ])('falls back to the first project when the default no longer exists (%j)', (defaultProject) => {
    const card = openComposer({ defaultProject })
    expect(card.selectedRepo?.id).toBe(firstRepo.id)
    expect(card.selectedProjectId).toBe('repo:first')
  })
})
