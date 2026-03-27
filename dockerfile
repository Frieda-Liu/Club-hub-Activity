# 1. 使用官方 Node.js 镜像作为基础
FROM node:20-slim

# 2. 设置容器内的运行目录
WORKDIR /app

# 3. 先复制 package.json 和 package-lock.json
COPY package*.json ./

# 4. 安装依赖（只安装生产环境需要的，减小体积）
RUN npm install --production

# 5. 复制剩下的所有源代码
COPY . .

# 6. Cloud Run 默认监听 8080 端口，这里声明一下
EXPOSE 8080

# 7. 启动程序的命令
CMD ["node", "server.js"]