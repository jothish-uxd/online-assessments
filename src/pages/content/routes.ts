export const BASE = '/assessment-content';
export const contentRoutes = {
  assets: (id?: string) => `${BASE}/assets${id ? `/${id}` : ''}`,
  modules: () => `${BASE}/modules`,
  module: (id: string) => `${BASE}/modules/${id}`,
  assessments: () => `${BASE}/assessments`,
};
