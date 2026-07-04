FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口（仅容器内部）
EXPOSE 3001

# 使用非 root 用户运行
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
RUN chown -R appuser:appgroup /app/uploads
USER appuser

CMD ["node", "app.js"]
