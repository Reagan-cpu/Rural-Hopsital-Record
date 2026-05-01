import { apiFetch, apiFetchDownload } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const householdsApi = {
  list:             (params)       => apiFetch(`/households?${qs(params)}`),
  listForMap:       ()             => apiFetch('/households/map'),
  checkDuplicates:  (params)       => apiFetch(`/households/check-duplicates?${qs(params)}`),
  get:              (id)           => apiFetch(`/households/${id}`),
  create:           (data)         => apiFetch('/households', { method: 'POST', body: JSON.stringify(data) }),
  update:           (id, data)     => apiFetch(`/households/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  changeHead:       (id, data)     => apiFetch(`/households/${id}/change-head`, { method: 'POST', body: JSON.stringify(data) }),
  migrate:          (id, data)     => apiFetch(`/households/${id}/migrate`, { method: 'POST', body: JSON.stringify(data) }),
  dissolve:         (id)           => apiFetch(`/households/${id}/dissolve`, { method: 'POST' }),
  listMembers:      (id, params)   => apiFetch(`/households/${id}/members?${qs(params)}`),
  addMember:        (id, data)     => apiFetch(`/households/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  healthCard:       (id)           => apiFetchDownload(`/households/${id}/health-card`, `household-card-${id}.pdf`),
};
