export const BASE = '/assessment-content';
export type WorkflowTab = 'builder' | 'scores' | 'misbehavior' | 'test-plan' | 'history';
export const contentRoutes = {
  assets: (id?: string) => `${BASE}/assets${id ? `/${id}` : ''}`,
  modules: () => `${BASE}/modules`,
  module: (id: string) => `${BASE}/modules/${id}`,
  workflows: () => `${BASE}/workflows`,
  workflow: (id: string, tab: WorkflowTab = 'builder') => `${BASE}/workflows/${id}${tab === 'builder' ? '' : `/${tab}`}`,
};
