#!/bin/bash

set -e

# ==========================================
# Clash 订阅转换工具 - VPS 一键部署脚本
# ==========================================

# 配置
DOCKER_USER="${DOCKER_USER:-your-dockerhub-username}"
IMAGE_NAME="convertsub"
VERSION="${VERSION:-latest}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/convertsub}"

FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "  Clash 订阅转换工具 - 部署脚本"
echo "=========================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker 安装完成"
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，正在安装..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose 安装完成"
fi

# 创建部署目录
echo "📁 创建部署目录: ${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

# 创建 docker-compose.yml
echo "📝 创建 docker-compose.yml"
cat > docker-compose.yml << EOF
version: '3.8'

services:
  app:
    image: ${FULL_IMAGE}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/convertsub
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
EOF

# 拉取最新镜像
echo "📥 拉取镜像: ${FULL_IMAGE}"
docker pull "${FULL_IMAGE}"

# 停止旧容器（如果存在）
echo "🔄 重启服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "=========================================="
    echo ""
    echo "服务地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP'):3000"
    echo ""
    echo "常用命令:"
    echo "  cd ${DEPLOY_DIR}"
    echo "  docker-compose logs -f    # 查看日志"
    echo "  docker-compose restart    # 重启服务"
    echo "  docker-compose down       # 停止服务"
    echo ""
else
    echo "❌ 部署失败，请检查日志:"
    docker-compose logs
    exit 1
fi
