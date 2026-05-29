import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@facturation/core';
import { apiFetch } from './api';

export interface ListProjectsParams {
  companyId?: string;
  /** Inclure les projets archivés (masqués par défaut). */
  includeArchived?: boolean;
}

export function listProjects(params: ListProjectsParams = {}): Promise<Project[]> {
  const sp = new URLSearchParams();
  if (params.companyId) sp.set('companyId', params.companyId);
  if (params.includeArchived) sp.set('includeArchived', 'true');
  const qs = sp.toString();
  return apiFetch<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
}

export function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function createProject(data: CreateProjectRequest): Promise<Project> {
  return apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
}

export function archiveProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}/unarchive`, { method: 'PATCH' });
}
