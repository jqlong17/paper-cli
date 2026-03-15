use clap::{CommandFactory, Parser, ValueHint};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

mod renderer;
mod server;

use renderer::render_markdown;
use server::start_server;

#[derive(Parser, Debug)]
#[command(
    name = "paper",
    about = "极速 Markdown 预览 CLI 工具 - Rust + WebView",
    version = "1.0.0"
)]
struct Cli {
    /// Markdown 文件路径
    #[arg(value_name = "FILE", value_hint = ValueHint::FilePath)]
    file: Option<PathBuf>,

    /// 显示日志输出
    #[arg(short, long)]
    log: bool,

    /// 内部使用：启动窗口模式
    #[arg(long, hide = true)]
    window: bool,

    /// 生成 shell 补全脚本
    #[arg(long, hide = true, value_enum)]
    generate_completion: Option<clap_complete::Shell>,
}

fn main() {
    let cli = Cli::parse();

    if let Some(shell) = cli.generate_completion {
        generate_completion(shell);
        return;
    }

    let verbose = cli.log;

    // 如果没有提供文件，显示帮助
    let file_path = match cli.file {
        Some(path) => path,
        None => {
            eprintln!("[paper] 错误: 请提供 Markdown 文件路径");
            eprintln!("[paper] 用法: paper <file.md>");
            std::process::exit(1);
        }
    };

    // 检查文件是否存在
    if !file_path.exists() {
        eprintln!("[paper] 错误: 文件不存在: {:?}", file_path);
        std::process::exit(1);
    }

    // 如果是窗口模式，启动 WebView
    if cli.window {
        window_mode(&file_path, verbose);
        return;
    }

    // 普通模式：启动后台进程
    let file_str = file_path.to_str().unwrap();
    
    // 获取当前可执行文件路径
    let current_exe = std::env::current_exe().expect("获取可执行文件路径失败");
    
    // 构建命令
    let mut cmd = Command::new(current_exe);
    cmd.arg("--window");
    if verbose {
        cmd.arg("--log");
    }
    cmd.arg(file_str)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    
    // 启动后台进程
    let mut child = cmd.spawn().expect("启动后台进程失败");

    // 等待一小段时间确保进程启动成功
    std::thread::sleep(std::time::Duration::from_millis(200));
    
    // 检查进程是否还在运行
    match child.try_wait() {
        Ok(Some(status)) => {
            eprintln!("[paper] 窗口启动失败，退出码: {:?}", status);
            std::process::exit(1);
        }
        _ => {
            // 进程正常运行
            if verbose {
                let file_name = file_path.file_name().unwrap().to_str().unwrap();
                println!("{}[paper] 数字宣纸{}", "\x1b[36m", "\x1b[0m");
                println!("{}[paper] 正在打开: {}{}", "\x1b[36m", file_name, "\x1b[0m");
                println!("{}[paper] PID: {}{}", "\x1b[36m", child.id(), "\x1b[0m");
                println!("{}[paper] 终端已释放，可继续打开其他文件{}", "\x1b[32m", "\x1b[0m");
            }
        }
    }
}

fn generate_completion(shell: clap_complete::Shell) {
    if matches!(shell, clap_complete::Shell::Zsh) {
        let script = r#"#compdef paper

_paper() {
  local state

  _arguments -s -S \
    '--help[显示帮助信息]' \
    '--version[显示版本信息]' \
    '(-l --log)'{-l,--log}'[显示日志输出]' \
    '*:markdown file:->mdfiles'

  case $state in
    mdfiles)
      local -a md_files
      md_files=( *(.N) *(/N) )
      compadd -M 'm:{a-zA-Z}={A-Za-z}' -f -- *.md(N) *.markdown(N) *.MD(N) *.MARKDOWN(N)
      ;;
  esac
}

_paper "$@"
"#;
        print!("{}", script);
        return;
    }

    let mut cmd = Cli::command();
    clap_complete::generate(shell, &mut cmd, "paper", &mut std::io::stdout());
}

fn window_mode(file_path: &PathBuf, verbose: bool) {
    use tao::{
        event::{Event, WindowEvent},
        event_loop::{ControlFlow, EventLoop},
        window::WindowBuilder,
    };
    use wry::WebViewBuilder;

    // 初始渲染
    let html = match render_markdown(file_path) {
        Ok(h) => h,
        Err(e) => {
            if verbose {
                eprintln!("渲染失败: {}", e);
            }
            std::process::exit(1);
        }
    };

    let content = Arc::new(Mutex::new(html));

    // 获取文件所在目录作为静态资源根目录
    let base_path = file_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));

    // 启动 HTTP 服务器
    let port = match start_server(content.clone(), base_path) {
        Ok(p) => p,
        Err(e) => {
            if verbose {
                eprintln!("启动服务器失败: {}", e);
            }
            std::process::exit(1);
        }
    };

    let url = format!("http://localhost:{}", port);
    let file_name = file_path.file_name().unwrap().to_str().unwrap();

    if verbose {
        println!("{}[paper] 数字宣纸{}", "\x1b[36m", "\x1b[0m");
        println!("{}[paper] 服务器地址: {}{}", "\x1b[36m", url, "\x1b[0m");
    }

    // 创建窗口和 WebView
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title(&format!("Paper - {}", file_name))
        .with_inner_size(tao::dpi::LogicalSize::new(960.0, 800.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(640.0, 480.0))
        .build(&event_loop)
        .expect("创建窗口失败");

    let _webview = WebViewBuilder::new()
        .with_url(&url)
        .build(&window)
        .expect("创建 WebView 失败");

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}
