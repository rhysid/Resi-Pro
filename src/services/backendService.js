const { createApiClient, handleApi } = require('./apiClient');

async function verifyToken(token) {
  const client = createApiClient();
  return handleApi(client.post('/auth/telegram-token/verify', { token }));
}

async function fetchMe(accessToken) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/auth/me'));
}

async function logout(accessToken) {
  const client = createApiClient(accessToken);
  return handleApi(client.post('/auth/logout'));
}

async function getDashboardSummary(accessToken) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/dashboard/summary'));
}

async function listLabels(accessToken, query = {}) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/labels', { params: query }));
}

async function listBelumScan(accessToken, query = {}) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/labels/status/belum-scan', { params: query }));
}

async function listSelesai(accessToken, query = {}) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/labels/status/selesai', { params: query }));
}

async function getLabelDetail(accessToken, id) {
  const client = createApiClient(accessToken);
  return handleApi(client.get(`/labels/${id}`));
}

async function createLabel(accessToken, payload) {
  const client = createApiClient(accessToken);
  return handleApi(client.post('/labels', payload));
}

async function scanResi(accessToken, payload) {
  const client = createApiClient(accessToken);
  return handleApi(client.post('/scan', payload));
}

async function listActivityLogs(accessToken, query = {}) {
  const client = createApiClient(accessToken);
  return handleApi(client.get('/activity-logs', { params: query }));
}

module.exports = {
  verifyToken,
  fetchMe,
  logout,
  getDashboardSummary,
  listLabels,
  listBelumScan,
  listSelesai,
  getLabelDetail,
  createLabel,
  scanResi,
  listActivityLogs
};
