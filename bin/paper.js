#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, fork } = require('child_process');

// 检查依赖
let md, open;
try {
  md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
  });
  open = require('open');
} catch (e) {
  console.log('\x1b[33m[paper] 正在安装依赖...\x1b[0m');
  const { exec } = require('child_process');
  exec('npm install', { cwd: path.join(__dirname, '..') }, (err) => {
    if (err) {
      console.error('\x1b[31m[paper] 依赖安装失败，请手动运行 npm install\x1b[0m');
      process.exit(1);
    }
    console.log('\x1b[32m[paper] 依赖安装完成，请重新运行命令\x1b[0m');
    process.exit(0);
  });
  return;
}

// ==================== 日志系统 ====================
const ROOT_DIR = path.join(__dirname, '..');
const LOG_DIR = path.join(ROOT_DIR, 'log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 生成日志文件名
function generateLogFileName() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionId = Math.random().toString(36).substring(2, 8);
  return `paper_${timestamp}_${sessionId}.log`;
}

// 简化的日志记录器
class Logger {
  constructor() {
    this.logFile = path.join(LOG_DIR, generateLogFileName());
    this.startTime = new Date();
    
    this.log('SESSION_START', {
      timestamp: this.startTime.toISOString(),
      command: process.argv.join(' '),
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform
    });
  }

  log(type, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      data
    };
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
  }

  logInput(filePath, options) {
    return this.log('INPUT', {
      filePath,
      fileExists: fs.existsSync(filePath),
      options,
      args: process.argv.slice(2)
    });
  }

  logOutput(message, level = 'info') {
    return this.log('OUTPUT', { message, level });
  }

  logError(error) {
    return this.log('ERROR', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }

  getLogFilePath() {
    return this.logFile;
  }
}

const logger = new Logger();

// 拦截控制台输出
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
  ).join(' ');
  logger.logOutput(message, 'info');
  originalLog.apply(console, args);
};

console.error = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
  ).join(' ');
  logger.logOutput(message, 'error');
  originalError.apply(console, args);
};

// 获取命令行参数
const args = process.argv.slice(2);

// 检查帮助
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[36m[paper] 数字宣纸 - Markdown 预览工具\x1b[0m

用法:
  paper <filename.md>           使用 Electron 窗口预览（默认）
  paper <filename.md> --browser 使用系统浏览器预览
  paper <filename.md> -b        使用系统浏览器预览（简写）

选项:
  -h, --help                    显示帮助信息
  -b, --browser                 使用浏览器而非 Electron

示例:
  paper README.md
  paper doc/guide.md --browser
  
提示:
  可同时打开多个文件，每个文件会启动独立窗口
  关闭窗口后，对应的后台服务会自动停止
`);
  process.exit(0);
}

// 检查是否使用浏览器模式
const useBrowser = args.includes('--browser') || args.includes('-b');
const fileArg = args.find(arg => !arg.startsWith('-'));

if (!fileArg) {
  console.log('\x1b[33m[paper] 用法: paper <filename.md> [选项]\x1b[0m');
  console.log('\x1b[33m[paper] 使用 --help 查看更多信息\x1b[0m');
  process.exit(1);
}

const filePath = path.resolve(fileArg);

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  logger.logInput(filePath, { useBrowser, error: 'FILE_NOT_FOUND' });
  console.error(`\x1b[31m[paper] 文件不存在: ${fileArg}\x1b[0m`);
  process.exit(1);
}

// 记录输入信息
logger.logInput(filePath, { 
  useBrowser, 
  fileSize: fs.statSync(filePath).size,
  fileName: path.basename(filePath)
});

// CSS 样式
const styles = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  html { scrollbar-width: none; -ms-overflow-style: none; }
  html::-webkit-scrollbar { display: none; }
  
  body {
    font-family: "Noto Serif SC", "Source Han Serif SC", "Georgia", serif;
    background-color: #F9F8F2;
    color: #333333;
    line-height: 1.8;
    letter-spacing: 0.03em;
    opacity: 0;
    animation: inkSpread 1.2s ease-out forwards;
  }
  
  @keyframes inkSpread {
    0% { opacity: 0; filter: blur(2px); }
    50% { opacity: 0.5; filter: blur(1px); }
    100% { opacity: 1; filter: blur(0); }
  }
  
  .container { max-width: 720px; margin: 0 auto; padding: 120px 40px; }
  
  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    margin: 1.8em 0 0.8em 0;
    line-height: 1.4;
    color: #2a2a2a;
  }
  
  h1 { font-size: 2.2em; margin-top: 0; padding-bottom: 0.3em; }
  h2 { font-size: 1.8em; }
  h3 { font-size: 1.5em; }
  h4 { font-size: 1.3em; }
  
  p { margin: 1em 0; text-align: justify; }
  
  a {
    color: #4A69BD;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  a:hover { color: #3a5699; text-decoration: underline; }
  
  blockquote {
    margin: 1.5em 0;
    padding-left: 1.5em;
    border-left: 1px solid #DDD;
    color: #555;
    font-style: italic;
  }
  
  code {
    font-family: "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace;
    background-color: rgba(0, 0, 0, 0.03);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }
  
  pre {
    background-color: rgba(0, 0, 0, 0.03);
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1.2em 0;
  }
  pre code { background: none; padding: 0; }
  
  ul, ol { margin: 1em 0; padding-left: 1.8em; }
  li { margin: 0.3em 0; }
  
  img { max-width: 100%; height: auto; border-radius: 4px; margin: 1.5em 0; }
  hr { border: none; border-top: 1px solid #DDD; margin: 2em 0; }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
  }
  th, td { padding: 0.6em 0.8em; text-align: left; border-bottom: 1px solid #E5E5E5; }
  th { font-weight: 600; color: #2a2a2a; border-bottom: 2px solid #DDD; }
  
  strong { font-weight: 700; color: #2a2a2a; }
  
  .empty-state { text-align: center; color: #888; padding: 4em 0; font-style: italic; }
  .footer { margin-top: 4em; padding-top: 2em; border-top: 1px solid #E5E5E5; text-align: center; color: #999; font-size: 0.85em; }
</style>
`;

// 生成随机端口
function getRandomPort() {
  return Math.floor(Math.random() * 6000) + 3000;
}

// 创建服务器脚本内容
function createServerScript(port, filePath) {
  return 'const http = require("http");\n' +
    'const fs = require("fs");\n' +
    'const path = require("path");\n' +
    '\n' +
    'const PORT = ' + port + ';\n' +
    'const FILE_PATH = ' + JSON.stringify(filePath) + ';\n' +
    '\n' +
    'const md = require("markdown-it")({\n' +
    '  html: true,\n' +
    '  linkify: true,\n' +
    '  typographer: true,\n' +
    '  breaks: true\n' +
    '});\n' +
    '\n' +
    'const styles = ' + JSON.stringify(styles) + ';\n' +
    '\n' +
    'const server = http.createServer((req, res) => {\n' +
    '  if (req.url === "/" || req.url === "/index.html") {\n' +
    '    try {\n' +
    '      const content = fs.readFileSync(FILE_PATH, "utf-8");\n' +
    '      const htmlContent = md.render(content);\n' +
    '      const fileName = path.basename(FILE_PATH);\n' +
    '      \n' +
    '      const html = "<!DOCTYPE html>" +\n' +
    '        "<html lang=\\"zh-CN\\">" +\n' +
    '        "<head>" +\n' +
    '        "<meta charset=\\"UTF-8\\">" +\n' +
    '        "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">" +\n' +
    '        "<title>" + fileName + " - Paper</title>" +\n' +
    '        styles +\n' +
    '        "</head>" +\n' +
    '        "<body>" +\n' +
    '        "<div class=\\"container\\">" +\n' +
    '        (htmlContent || "<div class=\\"empty-state\\">这是一张空白的纸，等待墨迹...</div>") +\n' +
    '        "<div class=\\"footer\\">" +\n' +
    '        "<p>Rendered by Paper · " + fileName + "</p>" +\n' +
    '        "<p style=\\"margin-top: 0.5em; font-size: 0.9em;\\">刷新页面以获取最新内容</p>" +\n' +
    '        "</div>" +\n' +
    '        "</div>" +\n' +
    '        "</body>" +\n' +
    '        "</html>";\n' +
    '      \n' +
    '      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });\n' +
    '      res.end(html);\n' +
    '    } catch (err) {\n' +
    '      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });\n' +
    '      res.end("<h1>读取文件出错</h1><p>" + err.message + "</p>");\n' +
    '    }\n' +
    '  } else {\n' +
    '    res.writeHead(404);\n' +
    '    res.end("Not Found");\n' +
    '  }\n' +
    '});\n' +
    '\n' +
    'server.listen(PORT, () => {\n' +
    '  console.log("Server running on port " + PORT);\n' +
    '});\n' +
    '\n' +
    'setInterval(() => {}, 1000);\n';
}

// 创建 Electron 主进程脚本
function createElectronScript(url) {
  return `
const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('${url}');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
    process.exit(0);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
  process.exit(0);
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
`;
}

// 端口配置
const MIN_PORT = 3000;
const MAX_PORT = 9000;

// 获取可用端口
function getRandomPort() {
  return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
}

// 检查端口是否可用
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.once('error', () => {
      resolve(false);
    });
    testServer.once('listening', () => {
      testServer.close(() => resolve(true));
    });
    testServer.listen(port);
  });
}

// 获取可用端口
async function getAvailablePort() {
  let port = getRandomPort();
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    if (await checkPortAvailable(port)) {
      return port;
    }
    port = getRandomPort();
    attempts++;
  }
  
  throw new Error('无法找到可用端口');
}

// 启动浏览器模式
async function startBrowserMode() {
  const PORT = await getAvailablePort();
  const serverScript = createServerScript(PORT, filePath);
  const serverScriptPath = path.join(ROOT_DIR, `.paper-server-${PORT}.js`);
  
  fs.writeFileSync(serverScriptPath, serverScript);
  
  // 后台启动服务器
  const serverProcess = spawn('node', [serverScriptPath], {
    detached: true,
    stdio: 'ignore'
  });
  
  serverProcess.unref();
  
  const url = `http://localhost:${PORT}`;
  const fileName = path.basename(filePath);
  
  logger.log('SERVER_START', { port: PORT, mode: 'browser', pid: serverProcess.pid });
  
  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\x1b[36m╔════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║              [paper] 数字宣纸                  ║\x1b[0m');
  console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[36m║\x1b[0m 正在为您展开纸张...`);
  console.log(`\x1b[36m║\x1b[0m 文件: \x1b[33m${fileName}\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m 地址: \x1b[32m${url}\x1b[0m`);
  console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
  console.log('\x1b[36m║\x1b[0m 关闭浏览器标签页即可');
  console.log('\x1b[36m║\x1b[0m 可继续打开其他文件');
  console.log('\x1b[36m╚════════════════════════════════════════════════╝\x1b[0m\n');
  
  logger.log('BROWSER_OPEN', { url, fileName });
  
  try {
    await open(url);
    console.log('\x1b[32m[paper] 已在浏览器中展开纸张 ✓\x1b[0m');
    console.log(`\x1b[36m[paper] 服务 PID: ${serverProcess.pid}\x1b[0m`);
    console.log('\x1b[36m[paper] 按回车键继续...\x1b[0m\n');
    logger.log('BROWSER_SUCCESS', { url });
  } catch (err) {
    console.log('\x1b[33m[paper] 请手动打开浏览器访问: ' + url + '\x1b[0m\n');
    logger.logError(err);
  }
  
  // 清理脚本文件
  setTimeout(() => {
    try {
      fs.unlinkSync(serverScriptPath);
    } catch (e) {}
  }, 1000);
}

// 启动 Electron 模式
async function startElectronMode() {
  const PORT = await getAvailablePort();
  const url = `http://localhost:${PORT}`;
  const fileName = path.basename(filePath);
  
  // 创建服务器脚本
  const serverScript = createServerScript(PORT, filePath);
  const serverScriptPath = path.join(ROOT_DIR, `.paper-server-${PORT}.js`);
  fs.writeFileSync(serverScriptPath, serverScript);
  
  // 后台启动服务器
  const serverProcess = spawn('node', [serverScriptPath], {
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();
  
  // 创建 Electron 脚本
  const electronScript = createElectronScript(url);
  const electronScriptPath = path.join(ROOT_DIR, `.paper-electron-${PORT}.js`);
  fs.writeFileSync(electronScriptPath, electronScript);
  
  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 启动 Electron
  const electronModulePath = path.dirname(require.resolve('electron'));
  let electronPath;
  
  if (process.platform === 'darwin') {
    electronPath = path.join(electronModulePath, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
  } else if (process.platform === 'win32') {
    electronPath = path.join(electronModulePath, 'dist', 'electron.exe');
  } else {
    electronPath = path.join(electronModulePath, 'dist', 'electron');
  }
  
  const electronProcess = spawn(electronPath, [electronScriptPath], {
    detached: true,
    stdio: 'ignore'
  });
  electronProcess.unref();
  
  logger.log('ELECTRON_LAUNCH', { url, fileName, serverPid: serverProcess.pid, electronPid: electronProcess.pid });
  
  console.log('\x1b[36m╔════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║              [paper] 数字宣纸                  ║\x1b[0m');
  console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[36m║\x1b[0m 正在为您展开纸张...`);
  console.log(`\x1b[36m║\x1b[0m 文件: \x1b[33m${fileName}\x1b[0m`);
  console.log(`\x1b[36m║\x1b[0m 模式: \x1b[35m独立窗口\x1b[0m`);
  console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
  console.log('\x1b[36m║\x1b[0m 关闭窗口即可退出');
  console.log('\x1b[36m║\x1b[0m 可继续打开其他文件');
  console.log('\x1b[36m╚════════════════════════════════════════════════╝\x1b[0m\n');
  
  console.log('\x1b[32m[paper] 独立窗口已打开 ✓\x1b[0m');
  console.log(`\x1b[36m[paper] Electron PID: ${electronProcess.pid}\x1b[0m`);
  console.log(`\x1b[36m[paper] Server PID: ${serverProcess.pid}\x1b[0m`);
  console.log('\x1b[36m[paper] 终端已释放\x1b[0m\n');
  
  logger.log('ELECTRON_SUCCESS', { 
    electronPid: electronProcess.pid, 
    serverPid: serverProcess.pid,
    detached: true 
  });
  
  // 清理脚本文件
  setTimeout(() => {
    try {
      fs.unlinkSync(serverScriptPath);
      fs.unlinkSync(electronScriptPath);
    } catch (e) {}
  }, 1000);
}

// 主入口
(async () => {
  logger.log('MODE_SELECT', { useBrowser });
  
  if (useBrowser) {
    logger.log('MODE_BROWSER_SELECTED');
    await startBrowserMode();
  } else {
    try {
      require.resolve('electron');
      logger.log('ELECTRON_FOUND');
      await startElectronMode();
    } catch (e) {
      logger.log('ELECTRON_NOT_FOUND', { fallback: 'browser' });
      console.log('\x1b[33m[paper] Electron 未安装，使用浏览器模式\x1b[0m');
      await startBrowserMode();
    }
  }
  
  // 记录会话结束
  logger.log('SESSION_END', { 
    timestamp: new Date().toISOString(),
    exitCode: 0
  });
})();
