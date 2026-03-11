#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

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
  exec('npm install', { cwd: __dirname }, (err) => {
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
const LOG_DIR = path.join(__dirname, 'log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 生成日志文件名 (timestamp_sessionId.log)
function generateLogFileName() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionId = Math.random().toString(36).substring(2, 8);
  return `paper_${timestamp}_${sessionId}.log`;
}

// 日志记录器
class Logger {
  constructor() {
    this.logFile = path.join(LOG_DIR, generateLogFileName());
    this.logs = [];
    this.startTime = new Date();
    
    // 记录启动信息
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
    this.logs.push(entry);
    
    // 实时写入文件
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
    
    return entry;
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

  logServerStart(port, mode) {
    return this.log('SERVER_START', { port, mode });
  }

  logServerStop(exitCode = 0) {
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    return this.log('SESSION_END', {
      timestamp: endTime.toISOString(),
      duration: `${duration}ms`,
      exitCode,
      totalLogs: this.logs.length
    });
  }

  getLogFilePath() {
    return this.logFile;
  }
}

// 创建全局日志实例
const logger = new Logger();

// ==================== 原始控制台输出拦截 ====================
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

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

console.warn = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : arg
  ).join(' ');
  logger.logOutput(message, 'warn');
  originalWarn.apply(console, args);
};

// 进程退出时记录日志
process.on('exit', (code) => {
  logger.logServerStop(code);
});

process.on('uncaughtException', (err) => {
  logger.logError(err);
  logger.logServerStop(1);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.log('UNHANDLED_REJECTION', { reason, promise });
});

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

// CSS 样式
const styles = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  html {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  html::-webkit-scrollbar {
    display: none;
  }
  
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
    0% {
      opacity: 0;
      filter: blur(2px);
    }
    50% {
      opacity: 0.5;
      filter: blur(1px);
    }
    100% {
      opacity: 1;
      filter: blur(0);
    }
  }
  
  .container {
    max-width: 720px;
    margin: 0 auto;
    padding: 120px 40px;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    margin: 1.8em 0 0.8em 0;
    line-height: 1.4;
    color: #2a2a2a;
  }
  
  h1 {
    font-size: 2.2em;
    margin-top: 0;
    padding-bottom: 0.3em;
  }
  
  h2 {
    font-size: 1.8em;
  }
  
  h3 {
    font-size: 1.5em;
  }
  
  h4 {
    font-size: 1.3em;
  }
  
  p {
    margin: 1em 0;
    text-align: justify;
  }
  
  a {
    color: #4A69BD;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  
  a:hover {
    color: #3a5699;
    text-decoration: underline;
  }
  
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
  
  pre code {
    background: none;
    padding: 0;
  }
  
  ul, ol {
    margin: 1em 0;
    padding-left: 1.8em;
  }
  
  li {
    margin: 0.3em 0;
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 1.5em 0;
  }
  
  hr {
    border: none;
    border-top: 1px solid #DDD;
    margin: 2em 0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
  }
  
  th, td {
    padding: 0.6em 0.8em;
    text-align: left;
    border-bottom: 1px solid #E5E5E5;
  }
  
  th {
    font-weight: 600;
    color: #2a2a2a;
    border-bottom: 2px solid #DDD;
  }
  
  strong {
    font-weight: 700;
    color: #2a2a2a;
  }
  
  .empty-state {
    text-align: center;
    color: #888;
    padding: 4em 0;
    font-style: italic;
  }
  
  .footer {
    margin-top: 4em;
    padding-top: 2em;
    border-top: 1px solid #E5E5E5;
    text-align: center;
    color: #999;
    font-size: 0.85em;
  }
</style>
`;

// 创建 HTTP 服务器
function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      try {
        // 每次请求时重新读取文件
        const content = fs.readFileSync(filePath, 'utf-8');
        const htmlContent = md.render(content);
        const fileName = path.basename(filePath);
        
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - Paper</title>
  ${styles}
</head>
<body>
  <div class="container">
    ${htmlContent || '<div class="empty-state">这是一张空白的纸，等待墨迹...</div>'}
    <div class="footer">
      <p>Rendered by Paper · ${fileName}</p>
      <p style="margin-top: 0.5em; font-size: 0.9em;">刷新页面以获取最新内容</p>
    </div>
  </div>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>读取文件出错</h1><p>${err.message}</p>`);
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
}

// 启动浏览器模式
async function startBrowserMode() {
  const server = createServer();
  const PORT = await getAvailablePort();
  
  server.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`;
    const fileName = path.basename(filePath);
    
    // 记录服务器启动
    logger.logServerStart(PORT, 'browser');
    
    console.log('\x1b[36m╔════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║              [paper] 数字宣纸                  ║\x1b[0m');
    console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
    console.log(`\x1b[36m║\x1b[0m 正在为您展开纸张...`);
    console.log(`\x1b[36m║\x1b[0m 文件: \x1b[33m${fileName}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m 地址: \x1b[32m${url}\x1b[0m`);
    console.log('\x1b[36m╠════════════════════════════════════════════════╣\x1b[0m');
    console.log('\x1b[36m║\x1b[0m 按 Ctrl+C 关闭服务');
    console.log('\x1b[36m╚════════════════════════════════════════════════╝\x1b[0m\n');
    
    logger.log('BROWSER_OPEN', { url, fileName });
    
    try {
      await open(url);
      console.log('\x1b[32m[paper] 已在浏览器中展开纸张 ✓\x1b[0m\n');
      logger.log('BROWSER_SUCCESS', { url });
    } catch (err) {
      console.log('\x1b[33m[paper] 请手动打开浏览器访问: ' + url + '\x1b[0m\n');
      logger.logError(err);
    }
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n\x1b[36m[paper] 正在收起纸张...\x1b[0m');
    server.close(() => {
      console.log('\x1b[32m[paper] 再会。\x1b[0m\n');
      process.exit(0);
    });
  });
}

// 启动 Electron 模式
async function startElectronMode() {
  const server = createServer();
  const PORT = await getAvailablePort();
  
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    const fileName = path.basename(filePath);
    
    // 记录服务器启动
    logger.logServerStart(PORT, 'electron');
    
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
    
    logger.log('ELECTRON_LAUNCH', { url, fileName });
    
    // 创建 Electron 主进程脚本
    const electronScript = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

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
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
`;
    
    // 写入临时 Electron 脚本
    const electronScriptPath = path.join(__dirname, '.paper-electron.js');
    fs.writeFileSync(electronScriptPath, electronScript);
    
    // 启动 Electron - 获取正确的可执行文件路径
    const electronModulePath = path.dirname(require.resolve('electron'));
    let electronPath;
    
    if (process.platform === 'darwin') {
      electronPath = path.join(electronModulePath, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
    } else if (process.platform === 'win32') {
      electronPath = path.join(electronModulePath, 'dist', 'electron.exe');
    } else {
      electronPath = path.join(electronModulePath, 'dist', 'electron');
    }
    
    logger.log('ELECTRON_PATH', { path: electronPath, platform: process.platform });
    
    // 后台运行 Electron，不阻塞终端
    const electronProcess = spawn(electronPath, [electronScriptPath], {
      stdio: 'ignore',
      detached: true
    });
    
    // 分离进程，让父进程可以退出而不影响子进程
    electronProcess.unref();
    
    electronProcess.on('error', (err) => {
      logger.logError(err);
      console.error('\x1b[31m[paper] Electron 启动失败:', err.message, '\x1b[0m');
      console.log('\x1b[33m[paper] 尝试使用浏览器模式...\x1b[0m');
      
      // 关闭当前服务器，然后启动浏览器模式
      server.close(async () => {
        try {
          fs.unlinkSync(electronScriptPath);
        } catch (e) {}
        logger.log('FALLBACK_TO_BROWSER', { reason: 'electron_error' });
        await startBrowserMode();
      });
    });
    
    // 监听退出，在后台清理
    electronProcess.on('exit', (code) => {
      logger.log('ELECTRON_EXIT', { exitCode: code, pid: electronProcess.pid });
      
      // 清理临时文件
      try {
        fs.unlinkSync(electronScriptPath);
      } catch (e) {}
      
      // 后台静默关闭服务器
      server.close(() => {
        logger.log('SERVER_CLOSED', { pid: electronProcess.pid });
      });
    });
    
    console.log('\x1b[32m[paper] 独立窗口已打开 ✓\x1b[0m');
    console.log(`\x1b[36m[paper] 进程 PID: ${electronProcess.pid}\x1b[0m`);
    console.log('\x1b[36m[paper] 终端已释放，可继续输入命令\x1b[0m\n');
    logger.log('ELECTRON_SUCCESS', { pid: electronProcess.pid, detached: true });
  });
}

// 主入口
(async () => {
  logger.log('MODE_SELECT', { useBrowser });
  
  if (useBrowser) {
    logger.log('MODE_BROWSER_SELECTED');
    await startBrowserMode();
  } else {
    // 检查 Electron 是否可用
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
})();
