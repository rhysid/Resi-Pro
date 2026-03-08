const axios = require('axios');
const env = require('../config/env');

function createApiClient(accessToken = '') {
  return axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 15000,
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}
  });
}

async function handleApi(promise) {
  try {
    const res = await promise;
    return res.data;
  } catch (error) {
    if (error.response?.data) {
      const wrappedError = new Error(error.response.data.message || 'Request failed');
      wrappedError.statusCode = error.response.status;
      wrappedError.details = error.response.data.details || null;
      throw wrappedError;
    }
    throw error;
  }
}

module.exports = { createApiClient, handleApi };
