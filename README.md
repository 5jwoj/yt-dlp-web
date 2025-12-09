# yt-dlp Web

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的 Web 视频下载器，支持 YouTube、Bilibili 等 1000+ 网站。

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-2.3+-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能特性

- 🎬 **多平台支持** - 支持 YouTube、Bilibili、Twitter 等 1000+ 网站
- 🎨 **现代化界面** - 暗色主题，玻璃拟态设计
- 📊 **实时进度** - 下载进度、速度、剩余时间实时显示
- 🎵 **音频提取** - 支持仅下载音频（MP3 格式）
- 📁 **文件管理** - 在线管理已下载的文件
- 🐳 **Docker 支持** - 一键部署，开箱即用

## 📸 截图

（添加应用截图）

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

#### 使用 Docker Compose

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/yt-dlp-web.git
cd yt-dlp-web

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 使用 Docker 命令

```bash
# 构建镜像
docker build -t yt-dlp-web .

# 运行容器
docker run -d \
  --name yt-dlp-web \
  -p 5000:5000 \
  -v $(pwd)/downloads:/app/downloads \
  yt-dlp-web
```

访问 http://localhost:5000 即可使用。

### 方式二：本地运行

#### 环境要求

- Python 3.9+
- ffmpeg（用于音频提取）

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/yt-dlp-web.git
cd yt-dlp-web

# 创建虚拟环境（可选）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动应用
python app.py
```

访问 http://localhost:5000 即可使用。

## ⚙️ 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `5000` | 服务端口 |
| `DEBUG` | `false` | 调试模式 |
| `HTTP_PROXY` | - | HTTP 代理地址 |
| `HTTPS_PROXY` | - | HTTPS 代理地址 |

### 代理配置

如果您在中国大陆，访问 YouTube 等网站需要配置代理：

#### Docker Compose

编辑 `docker-compose.yml`：

```yaml
environment:
  - HTTP_PROXY=http://your-proxy:port
  - HTTPS_PROXY=http://your-proxy:port
```

#### 本地运行

```bash
# Linux/Mac
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
python app.py

# Windows PowerShell
$env:HTTP_PROXY="http://your-proxy:port"
$env:HTTPS_PROXY="http://your-proxy:port"
python app.py
```

### YouTube Cookies 配置

> ⚠️ **重要**：由于 YouTube 的反爬虫机制，下载 YouTube 视频需要配置 cookies。

#### 方法一：使用 cookies.txt 文件（推荐）

1. 安装浏览器扩展 [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)（Chrome）或 [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)（Firefox）
2. 登录 YouTube
3. 在 YouTube 页面使用扩展导出 cookies
4. 将导出的文件保存为 `cookies.txt`，放到项目根目录

**Docker 部署时：**

```bash
# 将 cookies.txt 挂载到容器
docker run -d \
  --name yt-dlp-web \
  -p 5000:5000 \
  -v $(pwd)/downloads:/app/downloads \
  -v $(pwd)/cookies.txt:/app/cookies.txt \
  yt-dlp-web
```

或编辑 `docker-compose.yml`：

```yaml
volumes:
  - ./downloads:/app/downloads
  - ./cookies.txt:/app/cookies.txt
```

#### 方法二：自动从浏览器获取

设置环境变量 `COOKIES_FROM_BROWSER` 为浏览器名称：

```bash
# 支持: chrome, firefox, edge, safari, opera, brave, vivaldi, chromium

# Linux/Mac
export COOKIES_FROM_BROWSER=chrome
python app.py

# Windows PowerShell
$env:COOKIES_FROM_BROWSER="edge"
python app.py
```

> ⚠️ 注意：此方法需要关闭浏览器，且可能需要额外安装 `secretstorage`（Linux）或 `keyring`（Mac）。

## 📁 项目结构

```
yt-dlp-web/
├── app.py              # Flask 主应用
├── static/
│   ├── style.css       # CSS 样式
│   └── script.js       # 前端逻辑
├── templates/
│   └── index.html      # HTML 模板
├── downloads/          # 下载文件目录
├── Dockerfile          # Docker 镜像配置
├── docker-compose.yml  # Docker Compose 配置
├── requirements.txt    # Python 依赖
└── README.md           # 项目说明
```

## 🔧 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 主页面 |
| `/api/info` | POST | 获取视频信息 |
| `/api/download` | POST | 开始下载 |
| `/api/progress/<task_id>` | GET | 获取下载进度 |
| `/api/downloads` | GET | 列出已下载文件 |
| `/download/<filename>` | GET | 下载文件 |
| `/api/delete/<filename>` | DELETE | 删除文件 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Flask](https://flask.palletsprojects.com/) - Python Web 框架
