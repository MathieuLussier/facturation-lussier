import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@facturation/core';
import { apiFetch } from './api';

export interface ListProjectsParams {
  companyId?: string;
}

export function listProjects(params: ListProjectsParams = {}): Promise<Project[]> {
  const sp = new URLSearchParams();
  if (params.companyId) sp.set('companyId', params.companyId);
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
