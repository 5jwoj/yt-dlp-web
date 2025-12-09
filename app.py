"""
yt-dlp Web Interface
基于 Flask 的 yt-dlp Web 图形界面
"""

import os
import json
import uuid
import threading
from flask import Flask, render_template, request, jsonify, send_from_directory
import yt_dlp

app = Flask(__name__)

# 配置
DOWNLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# 存储下载任务状态
download_tasks = {}


class DownloadLogger:
    """自定义日志记录器"""
    def __init__(self, task_id):
        self.task_id = task_id
    
    def debug(self, msg):
        if msg.startswith('[debug] '):
            pass
        else:
            self.info(msg)
    
    def info(self, msg):
        if self.task_id in download_tasks:
            download_tasks[self.task_id]['logs'].append(msg)
    
    def warning(self, msg):
        if self.task_id in download_tasks:
            download_tasks[self.task_id]['logs'].append(f'[警告] {msg}')
    
    def error(self, msg):
        if self.task_id in download_tasks:
            download_tasks[self.task_id]['logs'].append(f'[错误] {msg}')
            download_tasks[self.task_id]['error'] = msg


def progress_hook(task_id):
    """创建进度回调函数"""
    def hook(d):
        if task_id not in download_tasks:
            return
        
        task = download_tasks[task_id]
        
        if d['status'] == 'downloading':
            task['status'] = 'downloading'
            task['filename'] = d.get('filename', '')
            
            # 计算进度百分比
            if d.get('total_bytes'):
                task['progress'] = (d.get('downloaded_bytes', 0) / d['total_bytes']) * 100
            elif d.get('total_bytes_estimate'):
                task['progress'] = (d.get('downloaded_bytes', 0) / d['total_bytes_estimate']) * 100
            else:
                task['progress'] = 0
            
            task['speed'] = d.get('speed', 0)
            task['eta'] = d.get('eta', 0)
            task['downloaded'] = d.get('downloaded_bytes', 0)
            task['total'] = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            
        elif d['status'] == 'finished':
            task['status'] = 'processing'
            task['progress'] = 100
            task['filename'] = d.get('filename', '')
            
        elif d['status'] == 'error':
            task['status'] = 'error'
            task['error'] = d.get('error', '下载失败')
    
    return hook


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/info', methods=['POST'])
def get_video_info():
    """获取视频信息"""
    data = request.get_json()
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({'error': '请输入视频 URL'}), 400
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    # 添加代理支持
    proxy = os.environ.get('HTTP_PROXY') or os.environ.get('HTTPS_PROXY')
    if proxy:
        ydl_opts['proxy'] = proxy
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            info = ydl.sanitize_info(info)
            
            # 提取需要的信息
            formats = []
            for f in info.get('formats', []):
                format_info = {
                    'format_id': f.get('format_id', ''),
                    'ext': f.get('ext', ''),
                    'resolution': f.get('resolution', 'audio only'),
                    'filesize': f.get('filesize') or f.get('filesize_approx', 0),
                    'vcodec': f.get('vcodec', 'none'),
                    'acodec': f.get('acodec', 'none'),
                    'format_note': f.get('format_note', ''),
                    'fps': f.get('fps', 0),
                    'tbr': f.get('tbr', 0),
                }
                formats.append(format_info)
            
            result = {
                'title': info.get('title', '未知标题'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', '未知'),
                'view_count': info.get('view_count', 0),
                'description': info.get('description', '')[:500] if info.get('description') else '',
                'formats': formats,
                'webpage_url': info.get('webpage_url', url),
            }
            
            return jsonify(result)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['POST'])
def start_download():
    """开始下载"""
    data = request.get_json()
    url = data.get('url', '').strip()
    format_id = data.get('format_id', 'best')
    audio_only = data.get('audio_only', False)
    
    if not url:
        return jsonify({'error': '请输入视频 URL'}), 400
    
    # 创建任务 ID
    task_id = str(uuid.uuid4())
    
    # 初始化任务状态
    download_tasks[task_id] = {
        'status': 'starting',
        'progress': 0,
        'speed': 0,
        'eta': 0,
        'downloaded': 0,
        'total': 0,
        'filename': '',
        'error': None,
        'logs': [],
    }
    
    def download_thread():
        try:
            ydl_opts = {
                'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
                'logger': DownloadLogger(task_id),
                'progress_hooks': [progress_hook(task_id)],
                'quiet': False,
                'no_warnings': False,
            }
            
            # 添加代理支持
            proxy = os.environ.get('HTTP_PROXY') or os.environ.get('HTTPS_PROXY')
            if proxy:
                ydl_opts['proxy'] = proxy
            
            if audio_only:
                ydl_opts['format'] = 'bestaudio/best'
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            elif format_id and format_id != 'best':
                ydl_opts['format'] = format_id
            else:
                ydl_opts['format'] = 'bestvideo+bestaudio/best'
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            download_tasks[task_id]['status'] = 'completed'
            download_tasks[task_id]['progress'] = 100
            
        except Exception as e:
            download_tasks[task_id]['status'] = 'error'
            download_tasks[task_id]['error'] = str(e)
    
    # 在后台线程中执行下载
    thread = threading.Thread(target=download_thread)
    thread.daemon = True
    thread.start()
    
    return jsonify({'task_id': task_id})


@app.route('/api/progress/<task_id>')
def get_progress(task_id):
    """获取下载进度"""
    if task_id not in download_tasks:
        return jsonify({'error': '任务不存在'}), 404
    
    task = download_tasks[task_id]
    return jsonify({
        'status': task['status'],
        'progress': round(task['progress'], 2),
        'speed': task['speed'],
        'eta': task['eta'],
        'downloaded': task['downloaded'],
        'total': task['total'],
        'filename': os.path.basename(task['filename']) if task['filename'] else '',
        'error': task['error'],
        'logs': task['logs'][-10:],  # 只返回最近 10 条日志
    })


@app.route('/api/downloads')
def list_downloads():
    """列出已下载的文件"""
    files = []
    for filename in os.listdir(DOWNLOAD_FOLDER):
        filepath = os.path.join(DOWNLOAD_FOLDER, filename)
        if os.path.isfile(filepath):
            files.append({
                'name': filename,
                'size': os.path.getsize(filepath),
                'mtime': os.path.getmtime(filepath),
            })
    
    # 按修改时间倒序排列
    files.sort(key=lambda x: x['mtime'], reverse=True)
    return jsonify(files)


@app.route('/download/<path:filename>')
def download_file(filename):
    """下载文件"""
    return send_from_directory(DOWNLOAD_FOLDER, filename, as_attachment=True)


@app.route('/api/delete/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    """删除文件"""
    filepath = os.path.join(DOWNLOAD_FOLDER, filename)
    if os.path.exists(filepath) and os.path.isfile(filepath):
        os.remove(filepath)
        return jsonify({'success': True})
    return jsonify({'error': '文件不存在'}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
