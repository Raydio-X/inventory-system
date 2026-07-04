# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 构建参数：API 基础路径（Docker 中通过 Nginx 代理，使用相对路径）
ARG VITE_API_BASE_URL=/api

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 运行阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 使用非 root 用户
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
