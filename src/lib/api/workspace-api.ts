import type { Workspace } from '@/types'
import { api } from '@/lib/api/api-client'

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get<Workspace[]>('/workspaces')
  return data
}

export async function createOrganization(
  name: string,
  description?: string,
  vertical?: string,
): Promise<Workspace> {
  const { data } = await api.post<Workspace>('/workspaces/organizations', {
    name,
    description,
    vertical,
  })
  return data
}
