#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::Path;

/// 将 Markdown 转换为 HTML
#[tauri::command]
fn render_markdown(content: String) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(&content, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

/// 读取文件内容
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

/// 检查文件是否存在
#[tauri::command]
fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// 获取文件信息
#[tauri::command]
fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let metadata = fs::metadata(&path).map_err(|e| format!("获取文件信息失败: {}", e))?;

    let file_name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(serde_json::json!({
        "name": file_name,
        "size": metadata.len(),
        "modified": metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs()),
    }))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            render_markdown,
            read_file,
            file_exists,
            get_file_info
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
