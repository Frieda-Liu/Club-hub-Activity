// src/config/api.js

const BASE_URL = "http://localhost:3000/api";

/**
 * 拼接完整的 API 路径
 * @param {string} path - 例如 "/auth/login"
 * @returns {string} - 完整的 URL
 */
export const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
};
