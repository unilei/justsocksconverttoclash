# Clash 订阅转换工具

<p align="center">
  <img src="public/logo.svg" width="120" height="120" alt="Logo">
</p>

<p align="center">
  将 JustMySocks 等订阅转换为 Clash Verge 格式的在线工具
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker" alt="Docker">
</p>

---

## ✨ 功能特性

- 🔄 **一键转换** - 支持 URL 或 Base64 内容直接转换
- 🌍 **自动识别国家** - 通过 IP 地理位置 API 自动识别节点所在国家
- 🏷️ **国家分组** - 自动按国家分组，方便选择
- 💾 **订阅管理** - 保存订阅，生成永久链接
- 🔄 **自动刷新** - Clash Verge 刷新订阅时自动从源更新
- 🐳 **Docker 部署** - 支持多平台镜像，一键部署到 VPS

## 📋 支持的协议

| 协议 | 状态 |
|------|------|
| Shadowsocks (SS) | ✅ |
| VMess | ✅ |
| Trojan | ✅ |

## 🚀 快速开始

### 方式一：Vercel 部署（推荐）

1. Fork 本项目到你的 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量：
   - `MONGODB_URI`: MongoDB Atlas 连接字符串
   - `JWT_SECRET`: JWT 密钥（请使用强密钥）
4. 部署完成

**MongoDB Atlas 设置：**
1. 注册 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 创建免费集群 (M0)
3. 在 Network Access 中添加 `0.0.0.0/0` 允许所有 IP
4. 复制连接字符串到 Vercel 环境变量

### 方式二：Docker 部署

```bash
# 创建 .env 文件
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=your-secret-key-here
EOF

# 使用 docker-compose 部署
docker-compose up -d
```

或使用预构建镜像：

```bash
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI="your-mongodb-atlas-uri" \
  -e JWT_SECRET="your-secret-key" \
  your-dockerhub-username/convertsub:latest
```

### 方式三：本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/convertsub.git
cd convertsub

# 安装依赖
npm install

# 启动开发环境（需要 Docker）
npm run docker:dev

# 或分别启动前端和后端
npm run dev          # 前端 http://localhost:5173
npm run dev:server   # 后端 http://localhost:3000
```

## 📖 使用说明

### 基本使用

1. 打开网页 `http://your-server:3000`
2. 粘贴订阅 URL 或 Base64 内容
3. 点击「转换」按钮
4. 复制配置或下载 YAML 文件
5. 在 Clash Verge 中导入

### 生成订阅链接

1. 转换完成后，输入订阅名称
2. 点击「保存订阅」
3. 复制生成的订阅链接
4. 在 Clash Verge 中添加该链接

### 订阅链接格式

```
http://your-server:3000/api/sub/{subscription-id}
```

Clash Verge 刷新订阅时会自动从原始源获取最新节点。

## 🛠️ 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run dev:server` | 启动后端开发服务器 |
| `npm run docker:dev` | Docker 开发环境（热更新） |
| `npm run docker:prod` | Docker 生产环境 |
| `npm run docker:build` | 构建多平台镜像并推送 |
| `npm run build` | 构建前端 |
| `npm run build:server` | 构建后端 |
| `npm run lint` | 代码检查 |

## 🏗️ 项目结构

```
convertsub/
├── public/              # 静态资源
├── shared/              # 前后端共享代码
│   ├── types.ts         # 类型定义
│   ├── parser.ts        # 订阅解析
│   ├── geoip.ts         # IP 地理位置
│   └── clash.ts         # Clash 配置生成
├── server/              # 后端服务
│   ├── index.ts         # Express 入口
│   └── db.ts            # MongoDB 连接
├── src/                 # 前端代码
│   ├── App.tsx          # 主组件
│   └── lib/             # 工具函数
├── scripts/             # 部署脚本
│   ├── build-push.sh    # 构建推送
│   └── deploy.sh        # VPS 部署
├── Dockerfile           # 生产镜像
├── Dockerfile.dev       # 开发镜像
├── docker-compose.yml   # 生产配置
└── docker-compose.dev.yml # 开发配置
```

## 🔧 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `MONGODB_URI` | ✅ | MongoDB Atlas 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥（生产环境请使用强密钥） |
| `PORT` | ❌ | 服务端口（默认 3000，仅 Docker） |

## 📝 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subscriptions` | 获取所有订阅 |
| POST | `/api/subscriptions` | 保存订阅 |
| GET | `/api/subscriptions/:id` | 获取单个订阅 |
| DELETE | `/api/subscriptions/:id` | 删除订阅 |
| GET | `/api/sub/:id` | 获取 Clash 配置（YAML） |

## 📄 License

MIT License

---

<p align="center">
  <sub>仅供学习交流使用，请遵守当地法律法规</sub>
</p>
