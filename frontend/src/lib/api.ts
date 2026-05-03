import type { Project } from "./types";

const BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:7979";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface ProjectMeta {
  id: string;
  name: string;
  updated_at: number;
}

export const api = {
  listProjects: () => request<ProjectMeta[]>("/projects"),

  getProject: (id: string) => request<Project>(`/projects/${id}`),

  createProject: (name: string) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  saveProject: (project: Project) =>
    request<Project>(`/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify(project),
    }),

  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),

  compile: async (projectId: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/projects/${projectId}/compile`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`compile failed: ${res.status}`);
    return res.blob();
  },
};
