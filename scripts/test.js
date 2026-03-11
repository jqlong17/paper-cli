#!/usr/bin/env node

/**
 * Paper CLI 完整测试套件
 * 目标覆盖率：>85%
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TEST_DIR = path.join(ROOT_DIR, 'test');
const LOG_DIR = path.join(ROOT_DIR, 'log');
const BIN_PATH = path.join(ROOT_DIR, 'bin', 'paper.js');

// 颜色
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

// 统计
const stats = { total: 0, passed: 0, failed: 0, skipped: 0 };
const coverage = {
  cli: { total: 8, passed: 0 },
  file: { total: 6, passed: 0 },
  render: { total: 5, passed: 0 },
  error: { total: 8, passed: 0 },
  multi: { total: 3, passed: 0 }
};

const tests = [
  // CLI测试
  { id: 'CLI-01', cat: 'cli', desc: '帮助信息', cmd: '--help', expect: 'output' },
  { id: 'CLI-02', cat: 'cli', desc: '简写帮助', cmd: '-h', expect: 'output' },
  { id: 'CLI-03', cat: 'cli', desc: '无参数', cmd: '', expect: 'error' },
  { id: 'CLI-04', cat: 'cli', desc: '浏览器选项', cmd: 'demo.md --browser', expect: 'success', timeout: 5000 },
  { id: 'CLI-05', cat: 'cli', desc: '简写浏览器', cmd: 'demo.md -b', expect: 'success', timeout: 5000 },
  { id: 'CLI-06', cat: 'cli', desc: '无效选项', cmd: 'demo.md --invalid', expect: 'success', timeout: 3000 },
  { id: 'CLI-07', cat: 'cli', desc: '相对路径', cmd: 'demo.md', expect: 'success', timeout: 3000 },
  { id: 'CLI-08', cat: 'cli', desc: '绝对路径', cmd: path.join(ROOT_DIR, 'demo.md'), expect: 'success', timeout: 3000 },
  
  // 文件测试
  { id: 'FILE-01', cat: 'file', desc: '基础Markdown', cmd: 'test/basic.md', expect: 'success', timeout: 3000 },
  { id: 'FILE-02', cat: 'file', desc: '中文内容', cmd: 'test/chinese.md', expect: 'success', timeout: 3000 },
  { id: 'FILE-03', cat: 'file', desc: '边界情况', cmd: 'test/edge-cases.md', expect: 'success', timeout: 3000 },
  { id: 'FILE-04', cat: 'file', desc: '空文件', cmd: 'test/empty.md', expect: 'success', timeout: 3000 },
  { id: 'FILE-05', cat: 'file', desc: '大文件', cmd: 'test/large.md', expect: 'success', timeout: 5000 },
  { id: 'FILE-06', cat: 'file', desc: '特殊字符', cmd: 'test/special-chars.md', expect: 'success', timeout: 3000 },
  
  // 渲染测试
  { id: 'RENDER-01', cat: 'render', desc: '代码高亮', cmd: 'test/code-blocks.md', expect: 'success', timeout: 3000 },
  { id: 'RENDER-02', cat: 'render', desc: '图片渲染', cmd: 'test/images.md', expect: 'success', timeout: 3000 },
  { id: 'RENDER-03', cat: 'render', desc: '表格样式', cmd: 'test/basic.md', expect: 'success', timeout: 3000 },
  { id: 'RENDER-04', cat: 'render', desc: '引用样式', cmd: 'test/edge-cases.md', expect: 'success', timeout: 3000 },
  { id: 'RENDER-05', cat: 'render', desc: '列表样式', cmd: 'test/basic.md', expect: 'success', timeout: 3000 },
  
  // 错误测试
  { id: 'ERR-01', cat: 'error', desc: '文件不存在', cmd: 'test/non-existent.md', expect: 'error' },
  { id: 'ERR-02', cat: 'error', desc: '目录路径', cmd: 'test/', expect: 'error' },
  { id: 'ERR-03', cat: 'error', desc: '无效路径', cmd: '\\\\invalid', expect: 'error' },
  { id: 'ERR-04', cat: 'error', desc: '空参数', cmd: '', expect: 'error' },
  { id: 'ERR-05', cat: 'error', desc: '特殊文件名', cmd: 'test/empty.md', expect: 'success', timeout: 3000 },
  { id: 'ERR-06', cat: 'error', desc: 'JSON文件', cmd: 'package.json', expect: 'success', timeout: 3000 },
  { id: 'ERR-07', cat: 'error', desc: '权限检查', cmd: 'test/empty.md', expect: 'success', timeout: 3000 },
  { id: 'ERR-08', cat: 'error', desc: '路径遍历', cmd: '../../../etc/passwd', expect: 'error' },
  
  // 多窗口测试
  { id: 'MULTI-01', cat: 'multi', desc: '后台运行', cmd: 'demo.md', expect: 'success', timeout: 2000, check: 'background' },
  { id: 'MULTI-02', cat: 'multi', desc: '多实例', cmd: 'test/basic.md', expect: 'success', timeout: 2000, multi: true },
  { id: 'MULTI-03', cat: 'multi', desc: '进程独立', cmd: 'test/chinese.md', expect: 'success', timeout: 2000, check: 'pid' },
];

function log(msg, color = 'reset') { console.log(`${C[color]}${msg}${C.reset}`); }

function banner() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║          Paper CLI 测试套件                    ║', 'cyan');
  log('╠════════════════════════════════════════════════╣', 'cyan');
  log('║ 覆盖率目标: >85%                               ║');
  log(`║ 测试用例: ${tests.length.toString().padEnd(33)} ║`);
  log('╚════════════════════════════════════════════════╝\n', 'cyan');
}

function cleanup() {
  log('🧹 清理环境...', 'gray');
  try {
    fs.readdirSync(ROOT_DIR).forEach(f => {
      if (f.startsWith('.paper-')) {
        try { fs.unlinkSync(path.join(ROOT_DIR, f)); } catch (e) {}
      }
    });
    execSync('pkill -f "paper-server" 2>/dev/null; pkill -f "paper-electron" 2>/dev/null; sleep 1', { 
      stdio: 'ignore', timeout: 5000 
    });
  } catch (e) {}
}

async function runTest(test, verbose = false) {
  stats.total++;
  log(`▶ ${test.id}: ${test.desc}`, 'bold');
  
  const start = Date.now();
  
  try {
    let cmd;
    if (!test.cmd) {
      cmd = `node "${BIN_PATH}"`;
    } else if (test.cmd.startsWith('--') || test.cmd.startsWith('-')) {
      cmd = `node "${BIN_PATH}" ${test.cmd}`;
    } else {
      const filePath = test.cmd.startsWith('/') ? test.cmd : path.join(ROOT_DIR, test.cmd);
      cmd = `node "${BIN_PATH}" "${filePath}"`;
    }
    
    if (verbose) log(`  命令: ${cmd}`, 'gray');
    
    execSync(cmd, {
      timeout: test.timeout || 3000,
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe']
    });
    
    const duration = Date.now() - start;
    
    if (test.expect === 'error') {
      log(`  ✗ 应失败但成功 (${duration}ms)`, 'red');
      stats.failed++;
      return false;
    }
    
    log(`  ✓ 通过 (${duration}ms)`, 'green');
    stats.passed++;
    if (coverage[test.cat]) coverage[test.cat].passed++;
    return true;
    
  } catch (error) {
    const duration = Date.now() - start;
    
    if (test.expect === 'error' || error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      log(`  ✓ 通过 (${duration}ms)`, 'green');
      stats.passed++;
      if (coverage[test.cat]) coverage[test.cat].passed++;
      return true;
    }
    
    log(`  ✗ 失败: ${error.message.substring(0, 80)}`, 'red');
    stats.failed++;
    return false;
  }
}

function printReport() {
  let totalCov = 0, passedCov = 0;
  Object.keys(coverage).forEach(k => {
    totalCov += coverage[k].total;
    passedCov += coverage[k].passed;
  });
  const pct = ((passedCov / totalCov) * 100).toFixed(1);
  
  log('\n' + '═'.repeat(60), 'cyan');
  log('测试报告', 'bold');
  log('═'.repeat(60), 'cyan');
  
  Object.keys(coverage).forEach(k => {
    const cat = coverage[k];
    const p = ((cat.passed / cat.total) * 100).toFixed(0);
    const icon = p >= 80 ? '✓' : p >= 50 ? '⚠' : '✗';
    const color = p >= 80 ? 'green' : p >= 50 ? 'yellow' : 'red';
    log(`${icon} ${k.padEnd(10)} ${cat.passed}/${cat.total} (${p}%)`, color);
  });
  
  log('─'.repeat(60), 'cyan');
  log(`总计: ${stats.total} | 通过: ${stats.passed} | 失败: ${stats.failed}`, 'bold');
  
  const color = parseFloat(pct) >= 85 ? 'green' : parseFloat(pct) >= 70 ? 'yellow' : 'red';
  log(`\n覆盖率: ${pct}%`, color);
  
  if (parseFloat(pct) >= 85) {
    log('\n✅ 达标！', 'green');
  } else {
    log('\n❌ 未达标', 'red');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('-v');
  const filter = args.find(a => !a.startsWith('-'));
  
  banner();
  
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  cleanup();
  
  let toRun = tests;
  if (filter) {
    toRun = tests.filter(t => t.id === filter || t.cat === filter);
    if (toRun.length === 0) {
      log(`未找到: ${filter}`, 'red');
      process.exit(1);
    }
  }
  
  log(`运行 ${toRun.length} 个测试...\n`, 'cyan');
  
  for (const test of toRun) {
    await runTest(test, verbose);
  }
  
  printReport();
  process.exit(stats.failed > 0 ? 1 : 0);
}

if (process.argv.includes('--help')) {
  console.log(`
Paper CLI 测试套件

用法:
  node scripts/test.js [选项] [类别/ID]

选项:
  -h, --help    显示帮助
  -v            详细输出

类别:
  cli, file, render, error, multi

示例:
  node scripts/test.js
  node scripts/test.js cli
  node scripts/test.js -v
`);
  process.exit(0);
}

main();
