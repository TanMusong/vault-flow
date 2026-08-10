# Vault Flow

简体中文 | [English](README.md)

基于可插拔 Provider 架构的定时驱动社交媒体内容自动化平台。

<p align="center"><img src="screenshot/screenshot_index.png" width="100%"></p>
<p align="center"><img src="screenshot/screenshot_detail.png" width="100%"></p>
<p align="center"><img src="screenshot/screenshot_providers.png" width="100%"></p>

---

## 这是什么

Vault Flow 是一个自托管的自动化平台。它按配置的间隔周期性执行 Provider 定义的任务——从社交媒体平台下载收藏或书签内容，并在本地整理归档。

核心程序负责任务调度、执行编排、进度追踪、下载管理和 Web UI。所有平台相关的逻辑都在独立的 Provider 包中，保持核心程序的简洁和可扩展性。

---

## 工作流程

1. 在数据源页面安装 Provider（如抖音、X、Instagram）
2. 创建任务——选择 Provider、填写凭证、设置执行间隔
3. 调度器按配置的间隔自动执行任务
4. Provider 采集内容、下载文件并上报进度
5. 下载的文件由 Provider 在本地整理

---

## 功能特性

- **Provider 架构**——每个平台独立的包，通过 Web UI 安装/更新/删除
- **任务调度**——基于间隔的定时执行，支持手动触发
- **实时进度**——SSE 推送任务状态、下载进度和日志
- **文件预览**——图片/视频内联预览，支持键盘导航
- **下载管理**——状态追踪、重试、文件大小记录
- **日志查看**——按级别筛选（info/warn/error），实时更新
- **多语言**——简体中文、繁体中文、英文
- **Docker 就绪**——单镜像部署，支持卷挂载

---

## 快速开始

### 本地运行

```bash
npm install
npm run dev        # 同时启动 server (:3000) 和 web UI (:5000)
```

打开 `http://localhost:5000`。

### 本地编译运行

```bash
npm install
npm run build
npm run start:server
```

打开 `http://localhost:5000`。

### Docker 部署

```bash
docker compose build
docker compose up -d
```

打开 `http://localhost:5000`。

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SERVER_HOST` | API 服务绑定地址 | 127.0.0.1 |
| `SERVER_PORT` | API 服务端口 | 3000 |
| `WEB_HOST` | Web UI 绑定地址 | 0.0.0.0 |
| `WEB_PORT` | Web UI 端口（`SERVE_STATIC=true` 时同时作为服务端口） | 5000 |
| `SERVE_STATIC` | 由服务端托管前端页面（生产/Docker 模式） | false |
| `CHROME_PATH` | Chrome/Chromium 可执行文件路径 | 必填 |
| `DOWNLOAD_DIR` | 下载文件存储目录 | `~/vault-flow/downloads` |
| `DATA_DIR` | 数据目录（数据库、Provider 存储文件） | `~/vault-flow/database` |
| `PROVIDER_DIR` | Provider 安装目录 | `~/vault-flow/provider` |
| `MAX_RUNNING_TASKS` | 最大并发任务数 | 2 |

---

## 架构

```
vault-flow/
├── server/        NestJS 后端
│   ├── api/       REST 接口
│   ├── browser/   Provider 注册与任务执行
│   ├── scheduler/ 基于 Cron 的任务调度
│   └── database/  SQLite（WAL 模式）
├── web/           Vue 3 + Vite 前端
├── providers/     内置 Provider 配置
└── docker-compose.yml
```

服务端管理任务、调度和 Provider 生命周期。Provider 在启动时从 `PROVIDER_DIR` 动态加载。Web UI 通过 REST API 和 Server-Sent Events 通信。

---

## Provider 架构

Provider 是独立的 npm 包，实现 `@vault-flow/provider-api` 的 `VaultProvider` 接口。

每个 Provider 包包含：

- `manifest.json`——名称、图标、版本地址、配置 Schema
- `dist/index.js`——编译后的 Provider 实现

内置 Provider（抖音、X、Instagram）可通过 Web UI 一键安装。也可手动开发和安装自定义 Provider。

完整的 API 参考请查看 [`vault-flow-provider-api`](https://github.com/TanMusong/vault-flow-provider-api)。

---

## 安全说明

- 所有数据存储在本地——不会上传到外部服务器
- 凭证和配置以明文形式存储在本地 SQLite 数据库和 Provider 存储文件中
- 核心程序不检查或解释 Provider 存储的凭证内容
- **Provider 是第三方代码，使用前请审查并确认其安全性**

---

## 环境要求

- Node.js 22+
- Chrome 或 Chromium（通过 `CHROME_PATH` 指定）
- Docker（可选）

---

## 许可证

MIT

---

## 赞助

如果觉得本项目有帮助，欢迎请我喝杯咖啡：

<a href="https://www.afdian.com/a/tanmusong" target="_blank"><img src="https://pic1.afdiancdn.com/static/img/welcome/button-sponsorme.png" height="40"></a>

<a href="https://ko-fi.com/tanmusong" target="_blank"><img src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_blue.png" height="40"></a>
