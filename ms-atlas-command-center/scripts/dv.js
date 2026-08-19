// Minimal Dataverse Web API client for HVCG Development (Development/UAT provisioning).
import { getToken, DEV_RESOURCE } from './auth.js';

const API = `${DEV_RESOURCE}/api/data/v9.2`;

async function req(method, url, body, headers = {}) {
  const token = await getToken();
  const res = await fetch(url.startsWith('http') ? url : `${API}/${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const err = JSON.parse(text).error;
      msg = err?.message || text;
      const inner = err?.innererror?.message;
      if (inner && inner !== msg) msg += ` | inner: ${inner}`;
    } catch { /* keep raw */ }
    throw new Error(`${method} ${url} -> ${res.status}: ${msg}`);
  }
  const entityId = res.headers.get('OData-EntityId');
  const idGuid = entityId?.match(/\(([^)]+)\)/)?.[1] || null;
  if (!text) return { __entityId: entityId, id: idGuid };
  try { return { ...JSON.parse(text), __entityId: entityId, id: idGuid }; } catch { return { raw: text, __entityId: entityId, id: idGuid }; }
}

export const dv = {
  get: (url) => req('GET', url),
  post: (url, body, headers) => req('POST', url, body, headers),
  patch: (url, body, headers) => req('PATCH', url, body, headers),
  del: (url) => req('DELETE', url),
  async action(name, body) { return req('POST', name, body); },
};

export function label(text) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.Label',
    LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 }],
  };
}

export { API, DEV_RESOURCE };
