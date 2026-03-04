const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const port = Number(process.env.PORT || 3000);

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function serveStatic(req, res) {
  const pathname = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(process.cwd(), pathname);
  const ext = path.extname(filePath).toLowerCase();

  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
  };

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildPayload(userPrompt) {
  return {
    workflow_id: process.env.RUNNINGHUB_WORKFLOW_ID,
    input: {
      prompt: userPrompt
    },
    parameters: {
      stream: false
    }
  };
}

function callRunningHub(prompt) {
  return new Promise((resolve, reject) => {
    const apiHost = process.env.RUNNINGHUB_API_BASE;
    const apiKey = process.env.RUNNINGHUB_API_KEY;

    if (!apiHost || !apiKey || !process.env.RUNNINGHUB_WORKFLOW_ID) {
      reject(new Error('请先在 .env 中配置 RUNNINGHUB_API_BASE / RUNNINGHUB_API_KEY / RUNNINGHUB_WORKFLOW_ID'));
      return;
    }

    const payload = JSON.stringify(buildPayload(prompt));

    // 根据 RunningHub 文档调整此路径
    const upstreamPath = '/v1/workflows/run';

    const options = {
      hostname: apiHost,
      path: upstreamPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 15000
    };

    const upstreamReq = http.request(options, upstreamRes => {
      let raw = '';
      upstreamRes.on('data', chunk => {
        raw += chunk;
      });
      upstreamRes.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          resolve({ status: upstreamRes.statusCode || 500, data: parsed });
        } catch {
          resolve({ status: upstreamRes.statusCode || 500, data: { raw } });
        }
      });
    });

    upstreamReq.on('error', reject);
    upstreamReq.on('timeout', () => {
      upstreamReq.destroy(new Error('Upstream timeout'));
    });

    upstreamReq.write(payload);
    upstreamReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/run-workflow') {
    try {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const prompt = String(body.prompt || '').trim();

      if (!prompt) {
        sendJson(res, 400, { error: 'prompt 不能为空' });
        return;
      }

      const upstream = await callRunningHub(prompt);
      sendJson(res, upstream.status, upstream.data);
    } catch (err) {
      sendJson(res, 500, { error: err.message || '请求失败' });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
