/**
 * yt-dlp Web 前端交互逻辑
 */

// 状态管理
const state = {
    currentVideoInfo: null,
    currentTaskId: null,
    progressInterval: null,
};

// DOM 元素
const elements = {
    urlInput: document.getElementById('url-input'),
    fetchBtn: document.getElementById('fetch-btn'),
    audioOnly: document.getElementById('audio-only'),
    errorMessage: document.getElementById('error-message'),
    videoInfo: document.getElementById('video-info'),
    videoThumbnail: document.getElementById('video-thumbnail'),
    videoDuration: document.getElementById('video-duration'),
    videoTitle: document.getElementById('video-title'),
    videoUploader: document.getElementById('video-uploader'),
    videoViews: document.getElementById('video-views'),
    videoDescription: document.getElementById('video-description'),
    formatSelect: document.getElementById('format-select'),
    downloadBtn: document.getElementById('download-btn'),
    downloadProgress: document.getElementById('download-progress'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    progressSpeed: document.getElementById('progress-speed'),
    progressEta: document.getElementById('progress-eta'),
    progressSize: document.getElementById('progress-size'),
    progressStatus: document.getElementById('progress-status'),
    downloadsList: document.getElementById('downloads-list'),
    refreshDownloads: document.getElementById('refresh-downloads'),
};

// 工具函数
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatEta(seconds) {
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${Math.ceil(seconds)}秒`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时${Math.ceil((seconds % 3600) / 60)}分钟`;
}

function formatViews(count) {
    if (!count) return '未知';
    if (count >= 100000000) return (count / 100000000).toFixed(1) + '亿';
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = false;
    setTimeout(() => {
        elements.errorMessage.hidden = true;
    }, 5000);
}

function setLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-loading');
    if (text) text.hidden = loading;
    if (spinner) spinner.hidden = !loading;
    button.disabled = loading;
}

// 获取视频信息
async function fetchVideoInfo() {
    const url = elements.urlInput.value.trim();
    if (!url) {
        showError('请输入视频 URL');
        return;
    }

    setLoading(elements.fetchBtn, true);
    elements.videoInfo.hidden = true;
    elements.errorMessage.hidden = true;

    try {
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取视频信息失败');
        }

        state.currentVideoInfo = data;
        displayVideoInfo(data);
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(elements.fetchBtn, false);
    }
}

// 显示视频信息
function displayVideoInfo(info) {
    elements.videoThumbnail.src = info.thumbnail || '';
    elements.videoDuration.textContent = formatDuration(info.duration);
    elements.videoTitle.textContent = info.title;
    elements.videoUploader.textContent = info.uploader;
    elements.videoViews.textContent = formatViews(info.view_count) + ' 次观看';
    elements.videoDescription.textContent = info.description || '暂无简介';

    // 填充格式选择器
    elements.formatSelect.innerHTML = '<option value="best">最佳质量 (自动)</option>';

    // 过滤并排序格式
    const videoFormats = info.formats
        .filter(f => f.vcodec !== 'none' && f.resolution !== 'audio only')
        .sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

    const audioFormats = info.formats
        .filter(f => f.vcodec === 'none' || f.resolution === 'audio only')
        .sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

    // 添加视频格式
    if (videoFormats.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '视频';
        videoFormats.slice(0, 10).forEach(f => {
            const option = document.createElement('option');
            option.value = f.format_id;
            const size = f.filesize ? ` - ${formatBytes(f.filesize)}` : '';
            option.textContent = `${f.resolution || f.format_note} (${f.ext})${size}`;
            optgroup.appendChild(option);
        });
        elements.formatSelect.appendChild(optgroup);
    }

    // 添加音频格式
    if (audioFormats.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '音频';
        audioFormats.slice(0, 5).forEach(f => {
            const option = document.createElement('option');
            option.value = f.format_id;
            const size = f.filesize ? ` - ${formatBytes(f.filesize)}` : '';
            const quality = f.tbr ? `${Math.round(f.tbr)}kbps` : f.format_note;
            option.textContent = `${quality} (${f.ext})${size}`;
            optgroup.appendChild(option);
        });
        elements.formatSelect.appendChild(optgroup);
    }

    elements.videoInfo.hidden = false;
}

// 开始下载
async function startDownload() {
    const url = elements.urlInput.value.trim();
    if (!url) {
        showError('请输入视频 URL');
        return;
    }

    elements.downloadBtn.disabled = true;
    elements.downloadProgress.hidden = false;
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '0%';
    elements.progressStatus.textContent = '正在准备下载...';

    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                format_id: elements.formatSelect.value,
                audio_only: elements.audioOnly.checked,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '下载失败');
        }

        state.currentTaskId = data.task_id;
        startProgressPolling();
    } catch (error) {
        showError(error.message);
        elements.downloadBtn.disabled = false;
        elements.downloadProgress.hidden = true;
    }
}

// 轮询下载进度
function startProgressPolling() {
    if (state.progressInterval) {
        clearInterval(state.progressInterval);
    }

    state.progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/progress/${state.currentTaskId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '获取进度失败');
            }

            updateProgress(data);

            if (data.status === 'completed' || data.status === 'error') {
                clearInterval(state.progressInterval);
                state.progressInterval = null;
                elements.downloadBtn.disabled = false;
                refreshDownloads();
            }
        } catch (error) {
            console.error('Progress polling error:', error);
        }
    }, 500);
}

// 更新进度显示
function updateProgress(data) {
    elements.progressFill.style.width = `${data.progress}%`;
    elements.progressText.textContent = `${data.progress.toFixed(1)}%`;

    if (data.speed) {
        elements.progressSpeed.textContent = `速度: ${formatBytes(data.speed)}/s`;
    }
    if (data.eta) {
        elements.progressEta.textContent = `剩余: ${formatEta(data.eta)}`;
    }
    if (data.total) {
        elements.progressSize.textContent = `大小: ${formatBytes(data.downloaded)} / ${formatBytes(data.total)}`;
    }

    // 显示状态
    let statusText = '';
    switch (data.status) {
        case 'starting':
            statusText = '正在启动...';
            break;
        case 'downloading':
            statusText = `正在下载: ${data.filename || ''}`;
            break;
        case 'processing':
            statusText = '正在处理...';
            break;
        case 'completed':
            statusText = '✅ 下载完成!';
            elements.progressFill.style.background = 'var(--color-success)';
            break;
        case 'error':
            statusText = `❌ 错误: ${data.error}`;
            elements.progressFill.style.background = 'var(--color-error)';
            break;
    }

    if (data.logs && data.logs.length > 0) {
        statusText += '\n' + data.logs.slice(-3).join('\n');
    }

    elements.progressStatus.textContent = statusText;
}

// 刷新下载列表
async function refreshDownloads() {
    try {
        const response = await fetch('/api/downloads');
        const files = await response.json();

        if (files.length === 0) {
            elements.downloadsList.innerHTML = '<p class="empty-message">暂无下载文件</p>';
            return;
        }

        elements.downloadsList.innerHTML = files.map(file => `
            <div class="download-item" data-filename="${escapeHtml(file.name)}">
                <div class="download-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="download-item-info">
                    <div class="download-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                    <div class="download-item-size">${formatBytes(file.size)}</div>
                </div>
                <div class="download-item-actions">
                    <a href="/download/${encodeURIComponent(file.name)}" class="btn btn-ghost btn-small" title="下载">
                        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" stroke-width="2"/>
                            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </a>
                    <button class="btn btn-ghost btn-small delete-btn" title="删除" onclick="deleteFile('${escapeHtml(file.name)}')">
                        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2"/>
                            <path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6" stroke="currentColor" stroke-width="2"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Refresh downloads error:', error);
    }
}

// 删除文件
async function deleteFile(filename) {
    if (!confirm(`确定要删除 "${filename}" 吗?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            refreshDownloads();
        } else {
            const data = await response.json();
            showError(data.error || '删除失败');
        }
    } catch (error) {
        showError('删除失败: ' + error.message);
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 事件绑定
elements.fetchBtn.addEventListener('click', fetchVideoInfo);
elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchVideoInfo();
});
elements.downloadBtn.addEventListener('click', startDownload);
elements.refreshDownloads.addEventListener('click', refreshDownloads);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    refreshDownloads();
});
