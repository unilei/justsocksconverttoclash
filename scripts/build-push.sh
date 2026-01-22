#!/bin/bash

set -e

# Docker Hub 配置
DOCKER_USER="${DOCKER_USER:-your-dockerhub-username}"
IMAGE_NAME="convertsub"
VERSION="${VERSION:-latest}"

FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${VERSION}"

echo "🚀 构建多平台镜像: ${FULL_IMAGE}"

# 确保 buildx 可用
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch

# 构建并推送多平台镜像 (amd64 + arm64)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag "${FULL_IMAGE}" \
  --tag "${DOCKER_USER}/${IMAGE_NAME}:latest" \
  --push \
  .

echo "✅ 镜像已推送: ${FULL_IMAGE}"
echo ""
echo "在 VPS 上部署:"
echo "  curl -fsSL https://raw.githubusercontent.com/${DOCKER_USER}/${IMAGE_NAME}/main/scripts/deploy.sh | bash"
echo ""
echo "或手动部署:"
echo "  docker pull ${FULL_IMAGE}"
