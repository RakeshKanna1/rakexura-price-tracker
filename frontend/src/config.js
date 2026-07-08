export const API_BASE = window.location.port && window.location.port !== '8000'
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : '/api';

const responseCache = {};

export const cacheGet = (key) => {
  return responseCache[key] || null;
};

export const cacheSet = (key, data) => {
  responseCache[key] = data;
};
