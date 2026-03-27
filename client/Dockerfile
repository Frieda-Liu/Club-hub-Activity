# 阶段 1: 构建 (Build Stage)
FROM node:20 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 关键：构建时注入后端 URL
RUN npm run build

# 阶段 2: 运行 (Production Stage)
FROM nginx:stable-alpine
# 复制打包后的文件
COPY --from=build-stage /app/dist /usr/share/nginx/html
# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]