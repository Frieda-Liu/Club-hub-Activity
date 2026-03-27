// 修改前：const BASE_URL = "http://localhost:3000/api";

// 修改后：优先读取环境变量，如果没有（比如本地没配）则回退到 localhost
const ENV_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// 保持 /api 后缀（如果你的云端后端也带 /api 路由的话）
const BASE_URL = `${ENV_URL}/api`;

/**
 * 拼接完整的 API 路径
 */
export const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
};
