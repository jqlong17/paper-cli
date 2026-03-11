# 代码块测试

## JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

// 调用函数
greet('Paper');
```

## Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 打印前10个斐波那契数
for i in range(10):
    print(fibonacci(i))
```

## HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Example</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
</body>
</html>
```

## CSS

```css
body {
    font-family: 'Noto Serif SC', serif;
    background-color: #F9F8F2;
    color: #333333;
    line-height: 1.8;
}

.container {
    max-width: 720px;
    margin: 0 auto;
    padding: 120px 40px;
}
```

## Bash

```bash
#!/bin/bash

# 安装依赖
npm install

# 运行测试
npm test

# 启动服务
npm start
```

## SQL

```sql
SELECT 
    id, 
    name, 
    email,
    created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 100;
```

## JSON

```json
{
  "name": "paper-cli",
  "version": "1.0.0",
  "description": "极简 Markdown 预览 CLI 工具",
  "author": "jqlong17",
  "license": "MIT",
  "dependencies": {
    "electron": "^33.0.0",
    "markdown-it": "^14.1.0"
  }
}
```

## 行内代码测试

使用 `npm install` 安装依赖，然后使用 `paper file.md` 打开文件。

## 代码块中的特殊字符

```
特殊字符：< > " ' & { } [ ] ( ) * _ ` ~ #
转义字符：\* \_ \` \[ \] \( \) \# \+ \- \. \!
```

## 长代码块

```javascript
// 第1行
// 第2行  
// 第3行
// 第4行
// 第5行
// 第6行
// 第7行
// 第8行
// 第9行
// 第10行
// 第11行
// 第12行
// 第13行
// 第14行
// 第15行
// 第16行
// 第17行
// 第18行
// 第19行
// 第20行
```
