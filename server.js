/*
 * server.js：课件网页 + AI 生成接口（无第三方依赖，需要 Node.js 18 及以上）
 *
 *   NVIDIA_API_KEY=你的密钥 node server.js
 *
 * 环境变量：
 *   NVIDIA_API_KEY   必填（不填时页面照常可用，只是没有 AI 生成）
 *   NVIDIA_MODEL     模型名称，默认 meta/llama-3.3-70b-instruct
 *   NVIDIA_BASE_URL  接口地址，默认 https://integrate.api.nvidia.com/v1
 *   PORT / HOST      监听端口和地址，默认 8080 / 0.0.0.0
 *   RATE_LIMIT       每个 IP 每分钟最多生成几次，默认 6
 *   TRUST_PROXY      放在 Nginx 后面时设为 1，按 X-Real-IP 识别访客
 *
 * 密钥只保存在服务器环境变量里，浏览器只会访问本服务的 /api/generate。
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const API_KEY = process.env.NVIDIA_API_KEY || "";
const MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
const BASE_URL = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 6;
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const ROOT = __dirname;

// 只对外提供这些静态文件
const STATIC_FILES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/js/morph.js": "js/morph.js",
  "/js/deck.js": "js/deck.js",
  "/js/export-pptx.js": "js/export-pptx.js",
  "/samples/binary/": "samples/binary/index.html",
  "/samples/binary/index.html": "samples/binary/index.html",
  "/samples/binary/binary.js": "samples/binary/binary.js",
  "/vendor/gsap/gsap.min.js": "vendor/gsap/gsap.min.js",
  "/vendor/gsap/TextPlugin.min.js": "vendor/gsap/TextPlugin.min.js",
  "/vendor/gsap/DrawSVGPlugin.min.js": "vendor/gsap/DrawSVGPlugin.min.js",
};
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const SYSTEM_PROMPT = `你是一位经验丰富的中国中小学教师，负责为一节课编写课件文字。
只输出一个 JSON 对象，不要输出任何其他文字或 Markdown 代码块。结构如下（每个数组正好 3 项，注意字数上限）：
{
  "goals": ["教学目标，不超过 30 字", "…", "…"],
  "intro": {
    "question": "导入环节抛给学生的情境问题，不超过 40 字",
    "tip": "给老师的一句导入提示，不超过 26 字",
    "steps": [{"title": "不超过 8 字", "desc": "不超过 26 字"}]
  },
  "learn": { "steps": [{"title": "新知讲解的步骤名，不超过 8 字", "desc": "具体讲什么，不超过 26 字"}] },
  "practice": { "levels": [{"title": "如：基础题，不超过 8 字", "desc": "练什么及用时，不超过 26 字"}] },
  "summary": { "pitfalls": "本课易错点，用「 · 」分隔，不超过 40 字" },
  "homework": { "tiers": [{"title": "作业名称，不超过 8 字", "desc": "作业内容，不超过 26 字", "note": "对象与用时，不超过 14 字"}] },
  "notes": ["导入、新知讲解、课堂练习、课堂总结、课后作业五个环节的讲解提示，各不超过 80 字，共 5 条"]
}
practice 的三级依次为基础、提高、拓展；homework 的三档依次为必做、选做、挑战。
内容要紧扣课题，符合所给年级学生的认知水平，具体、可直接用于课堂。`;

// ---------- 简单的按 IP 限流，避免密钥额度被刷 ----------

const hits = new Map();

function allow(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < 60 * 1000);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

setInterval(() => {
  const now = Date.now();
  hits.forEach((times, ip) => {
    if (times.every((time) => now - time >= 60 * 1000)) hits.delete(ip);
  });
}, 60 * 1000).unref();

// ---------- 工具函数 ----------

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readBody(req, limit = 10 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function field(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

// 模型偶尔会在 JSON 外面包一层代码块或多余文字，这里取出第一个完整的 JSON 对象
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("模型没有返回 JSON");
  return JSON.parse(text.slice(start, end + 1));
}

async function generate({ subject, grade, goals }) {
  const user = [
    `课题：${subject}`,
    `年级：${grade}`,
    goals ? `老师给出的教学目标：${goals}` : "老师没有填写教学目标，请你拟定 3 条。",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90 * 1000);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`AI 接口返回 ${response.status}：${detail}`);
    }
    const data = await response.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof text !== "string") throw new Error("AI 接口返回的格式不对");
    return extractJson(text);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 路由 ----------

async function handleGenerate(req, res) {
  if (!API_KEY) return sendJson(res, 503, { error: "服务器没有配置 NVIDIA_API_KEY" });
  // 只有在可信的反向代理后面才读取 X-Real-IP，否则访客可以伪造它绕过限流
  const ip = (TRUST_PROXY && req.headers["x-real-ip"]) || req.socket.remoteAddress || "unknown";
  if (!allow(ip)) return sendJson(res, 429, { error: "生成太频繁了，请一分钟后再试" });

  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: "请求内容不正确" });
  }
  const subject = field(input.subject, 40);
  if (!subject) return sendJson(res, 400, { error: "请填写课程主题" });

  try {
    const content = await generate({ subject, grade: field(input.grade, 10), goals: field(input.goals, 300) });
    sendJson(res, 200, { content });
  } catch (error) {
    console.error(`[generate] ${error.message}`);
    sendJson(res, 502, { error: error.name === "AbortError" ? "AI 生成超时，请重试" : "AI 生成失败，请稍后重试" });
  }
}

function handleStatic(req, res, pathname) {
  const file = STATIC_FILES[pathname];
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  fs.readFile(path.join(ROOT, file), (error, data) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Server error");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)], "Cache-Control": "no-cache" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ai: Boolean(API_KEY), model: API_KEY ? MODEL : null });
  }
  if (pathname === "/api/generate") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    return handleGenerate(req, res).catch((error) => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: "服务器错误" });
    });
  }
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed" });
  if (pathname === "/samples/binary") {
    res.writeHead(301, { Location: "/samples/binary/" });
    return res.end();
  }
  return handleStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`课件服务已启动：http://${HOST}:${PORT}  AI 生成：${API_KEY ? `已开启（${MODEL}）` : "未配置密钥"}`);
});
