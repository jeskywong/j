# RunningHub API 快速接入模板

这是一个“开箱即跑”的最小模板，帮你快速做出一个网页应用，把 **RunningHub 工作流** 通过 API 接入。

## 你会得到什么

- 一个前端页面：输入 prompt，点击按钮即可调用后端。
- 一个后端代理：保护你的 API Key，不把密钥暴露在浏览器。
- 一套可直接改造的代码结构，适合做 MVP。

## 目录结构

- `index.html`：页面结构
- `styles.css`：页面样式
- `app.js`：前端逻辑
- `server.js`：后端代理（Node.js 原生 HTTP，无第三方依赖）
- `.env.example`：环境变量示例

## 1）配置环境变量

复制模板并填写：

```bash
cp .env.example .env
```

你需要修改：

- `RUNNINGHUB_API_KEY`：你的 RunningHub 密钥
- `RUNNINGHUB_WORKFLOW_ID`：你的工作流 ID
- `RUNNINGHUB_API_BASE`：RunningHub API 基础地址（按官方文档填写）

> 注意：不同账号/区域/API 版本，接口路径和 payload 字段可能不同。本文模板通过常见 JSON 结构演示，你只需要改 `server.js` 里的 `buildPayload` 和上游路径即可。

## 2）启动服务

```bash
node server.js
```

默认端口 `3000`，打开：

- <http://localhost:3000>

## 3）前端调用流程

1. 用户在页面输入 prompt。
2. 前端调用本地 `/api/run-workflow`。
3. 后端读取 `.env`，带上 API Key 请求 RunningHub。
4. 后端把结果原样返回给前端显示。

## 4）你最常改的地方

### A. 请求路径

在 `server.js` 里修改：

- `upstreamPath`

### B. 请求体字段

在 `buildPayload` 里把 `workflow_id`、`input`、`parameters` 改成你工作流实际需要的结构。

### C. 响应解析

前端目前直接显示完整 JSON。你可以在 `app.js` 里提取关键字段（例如 `images[0].url` 或 `output_text`）做更友好的 UI。

## 5）上线建议（简版）

- 前端：Vercel / Netlify
- 后端：Render / Railway / 云函数
- 关键点：
  - API Key 只放服务端环境变量
  - 增加限流与日志
  - 对失败重试与超时做兜底

## 6）下一步迭代

- 增加“任务状态轮询”（若工作流异步返回 task_id）
- 保存历史记录（本地存储或数据库）
- 增加登录系统和用量统计

---

如果你愿意，我可以在这套模板上继续帮你改成：

1. 图像生成工作流版本（自动渲染图片）
2. 聊天助手版本（流式输出）
3. 多工作流路由版本（一个页面切换多个 workflow）
