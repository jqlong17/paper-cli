use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use warp::Filter;

pub fn start_server(
    content: Arc<Mutex<String>>,
    base_path: PathBuf,
) -> Result<u16, Box<dyn std::error::Error>> {
    // 获取随机可用端口
    let port = portpicker::pick_unused_port().ok_or("无法找到可用端口")?;

    // 根路径：返回 HTML 内容
    let content_filter = warp::path::end()
        .and(warp::get())
        .map(move || {
            let html = content.lock().unwrap().clone();
            warp::reply::with_header(html, "content-type", "text/html; charset=utf-8")
        });

    // 静态文件服务：提供图片等本地资源
    let static_files = warp::fs::dir(base_path);

    // 组合路由：优先匹配根路径，否则尝试静态文件
    let routes = content_filter.or(static_files);

    // 在新线程中启动服务器
    thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            warp::serve(routes)
                .bind(([127, 0, 0, 1], port))
                .await;
        });
    });

    // 给服务器一点时间启动
    thread::sleep(std::time::Duration::from_millis(100));

    Ok(port)
}
