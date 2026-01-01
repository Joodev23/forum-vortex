import FileType from 'file-type/browser.js';

// Upload file to Catbox.moe
async function catboxUpload(buffer) {
    try {
        // Determine file type
        const fileType = await FileType.fromBuffer(buffer);
        const ext = fileType?.ext || 'bin';
        
        // Create FormData
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('userhash', '');
        form.append('fileToUpload', new Blob([buffer]), `file.${ext}`);
        
        // Upload to Catbox
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form,
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        
        if (!text.startsWith('https://')) {
            console.error('Catbox response:', text);
            throw new Error('Upload gagal: ' + text);
        }
        
        return text;
        
    } catch (error) {
        console.error('Catbox upload error:', error);
        throw new Error(`Gagal mengunggah file: ${error.message}`);
    }
}

// Upload multiple files
async function catboxUploadMultiple(files) {
    const uploads = [];
    
    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const url = await catboxUpload(buffer);
            uploads.push({
                originalName: file.name,
                url,
                type: file.type,
                size: file.size
            });
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw error;
        }
    }
    
    return uploads;
}

// Validate file before upload
function validateFile(file, options = {}) {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg']
    } = options;
    
    // Check file size
    if (file.size > maxSize) {
        throw new Error(`File terlalu besar. Maksimal ${maxSize / 1024 / 1024}MB`);
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipe file tidak didukung');
    }
    
    return true;
}

// Get file type from URL
async function getFileTypeFromUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return contentType || 'application/octet-stream';
    } catch (error) {
        console.error('Error getting file type:', error);
        return 'application/octet-stream';
    }
}

// Create thumbnail URL (for video files)
function createThumbnailUrl(mediaUrl) {
    if (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm')) {
        // For videos, we can use the same URL but with .jpg extension
        // This is a placeholder - in production, you'd generate actual thumbnails
        return mediaUrl.replace(/\.[^/.]+$/, '.jpg');
    }
    return mediaUrl;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export functions
export {
    catboxUpload,
    catboxUploadMultiple,
    validateFile,
    getFileTypeFromUrl,
    createThumbnailUrl,
    formatFileSize
};