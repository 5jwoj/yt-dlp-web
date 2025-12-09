# yt-dlp Web Interface
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装 ffmpeg（用于音频提取和视频处理）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建下载目录
RUN mkdir -p /app/downloads

# 设置环境变量
ENV PORT=5000
ENV DEBUG=false

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["python", "app.py"]
