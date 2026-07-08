export const API_BASE = window.location.port && window.location.port !== '8000'
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : '/api';
