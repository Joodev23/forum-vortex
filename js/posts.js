import { catboxUpload, validateFile } from './catbox.js';
import { savePostToGitHub, getPosts } from './github.js';
import { currentUser } from './auth.js';

// Load posts
async function loadPosts(sortBy = 'popular') {
    try {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;
        
        // Show loader
        postsContainer.innerHTML = `
            <div class="post-loader">
                <div class="spinner"></div>
                <p>Memuat postingan...</p>
            </div>
        `;
        
        // Get posts from GitHub
        const posts = await getPosts(sortBy);
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z"/>
                    </svg>
                    <h3>Belum ada postingan</h3>
                    <p>Jadilah yang pertama membagikan sesuatu!</p>
                    <button class="btn-primary" id="createFirstPost">Buat Postingan</button>
                </div>
            `;
            return;
        }
        
        // Clear container
        postsContainer.innerHTML = '';
        
        // Add posts to container
        posts.forEach((post, index) => {
            const postElement = createPostElement(post);
            postElement.style.animationDelay = `${index * 0.1}s`;
            postsContainer.appendChild(postElement);
        });
        
    } catch (error) {
        console.error('Error loading posts:', error);
        const postsContainer = document.getElementById('postsContainer');
        if (postsContainer) {
            postsContainer.innerHTML = `
                <div class="error-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12" y2="16"/>
                    </svg>
                    <h3>Gagal memuat postingan</h3>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="location.reload()">Coba Lagi</button>
                </div>
            `;
        }
    }
}

// Create post element
function createPostElement(post) {
    const element = document.createElement('div');
    element.className = 'post-card slide-up';
    
    // Format time
    const timeAgo = formatTimeAgo(post.timestamp);
    
    // Build post HTML
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        const media = post.media[0];
        if (media.type.startsWith('image/')) {
            mediaHTML = `
                <div class="post-media">
                    <img src="${media.url}" alt="Post image" loading="lazy">
                </div>
            `;
        } else if (media.type.startsWith('video/')) {
            mediaHTML = `
                <div class="post-media">
                    <video src="${media.url}" controls></video>
                </div>
            `;
        }
    }
    
    element.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <img src="${post.author?.profilePic || 'https://via.placeholder.com/44'}" 
                     alt="${post.author?.name}" class="author-avatar">
                <div class="author-info">
                    <div class="author-name">
                        <span>${post.author?.name || 'Unknown'}</span>
                        ${post.author?.verified ? `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        ` : ''}
                    </div>
                    <div class="post-time">${timeAgo}</div>
                </div>
            </div>
            <button class="post-more">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="19" cy="12" r="1"/>
                    <circle cx="5" cy="12" r="1"/>
                </svg>
            </button>
        </div>
        <div class="post-content">
            <p class="post-text">${escapeHtml(post.caption || '')}</p>
            ${mediaHTML}
        </div>
        <div class="post-stats">
            <div class="post-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span>${post.likes || 0} likes</span>
            </div>
            <div class="post-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>${post.comments || 0} komentar</span>
            </div>
        </div>
        <div class="post-actions-row">
            <button class="post-action like-btn ${post.liked ? 'liked' : ''}" data-post-id="${post.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                     stroke="${post.liked ? '#ef4444' : 'currentColor'}" 
                     stroke-width="1.5">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span>${post.liked ? 'Liked' : 'Like'}</span>
            </button>
            <button class="post-action comment-btn" data-post-id="${post.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Komentar</span>
            </button>
            <button class="post-action share-btn" data-post-id="${post.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span>Bagikan</span>
            </button>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = element.querySelector('.like-btn');
    const commentBtn = element.querySelector('.comment-btn');
    const shareBtn = element.querySelector('.share-btn');
    const moreBtn = element.querySelector('.post-more');
    
    likeBtn?.addEventListener('click', () => handleLike(post.id));
    commentBtn?.addEventListener('click', () => handleComment(post.id));
    shareBtn?.addEventListener('click', () => handleShare(post));
    moreBtn?.addEventListener('click', (e) => showPostOptions(e, post));
    
    return element;
}

// Create new post
async function createPost(data) {
    try {
        const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (!user.username) {
            throw new Error('User not authenticated');
        }
        
        let mediaUrl = null;
        
        // Upload media if exists
        if (data.mediaFile) {
            // Validate file
            validateFile(data.mediaFile, {
                maxSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
            });
            
            // Upload to Catbox
            const arrayBuffer = await data.mediaFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            mediaUrl = await catboxUpload(buffer);
        }
        
        // Create post object
        const post = {
            id: generateId(),
            author: {
                id: user.id,
                username: user.username,
                name: user.name,
                profilePic: user.profilePic,
                verified: user.verified || false
            },
            caption: data.caption,
            type: data.type,
            media: mediaUrl ? [{
                url: mediaUrl,
                type: data.mediaFile.type,
                size: data.mediaFile.size
            }] : [],
            likes: 0,
            liked: false,
            comments: 0,
            timestamp: Date.now(),
            settings: {
                allowComments: data.allowComments !== false,
                allowLikes: data.allowLikes !== false
            }
        };
        
        // Save to GitHub
        await savePostToGitHub(post);
        
        // Also save to localStorage for quick access
        const posts = JSON.parse(localStorage.getItem('vortexx_posts') || '[]');
        posts.unshift(post);
        localStorage.setItem('vortexx_posts', JSON.stringify(posts));
        
        return post;
        
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
}

// Handle like
async function handleLike(postId) {
    try {
        const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (!user.username) {
            throw new Error('Please login to like posts');
        }
        
        // Get post from localStorage
        const posts = JSON.parse(localStorage.getItem('vortexx_posts') || '[]');
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex === -1) {
            throw new Error('Post not found');
        }
        
        const post = posts[postIndex];
        
        // Toggle like
        if (post.liked) {
            post.likes = Math.max(0, (post.likes || 0) - 1);
            post.liked = false;
        } else {
            post.likes = (post.likes || 0) + 1;
            post.liked = true;
        }
        
        // Update localStorage
        posts[postIndex] = post;
        localStorage.setItem('vortexx_posts', JSON.stringify(posts));
        
        // Update UI
        const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
        if (likeBtn) {
            likeBtn.classList.toggle('liked', post.liked);
            likeBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                     stroke="${post.liked ? '#ef4444' : 'currentColor'}" 
                     stroke-width="1.5">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span>${post.liked ? 'Liked' : 'Like'}</span>
            `;
            
            // Update like count
            const likeCount = likeBtn.closest('.post-card')?.querySelector('.post-stat:first-child span');
            if (likeCount) {
                likeCount.textContent = `${post.likes} like${post.likes !== 1 ? 's' : ''}`;
            }
        }
        
        // In a real app, you would update the server here
        
    } catch (error) {
        console.error('Error liking post:', error);
        alert(error.message);
    }
}

// Handle comment
function handleComment(postId) {
    // Redirect to comment page or open comment modal
    window.location.href = `comment.html?postId=${postId}`;
}

// Handle share
async function handleShare(post) {
    try {
        const shareData = {
            title: `${post.author.name} di Vortexx`,
            text: post.caption,
            url: window.location.origin + `/post.html?id=${post.id}`
        };
        
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareData.url);
            alert('Link telah disalin ke clipboard!');
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
}

// Show post options
function showPostOptions(e, post) {
    const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
    const isAuthor = user.username === post.author?.username;
    
    const options = document.createElement('div');
    options.className = 'dropdown-menu show';
    options.style.position = 'absolute';
    options.style.top = `${e.clientY}px`;
    options.style.left = `${e.clientX}px`;
    
    if (isAuthor) {
        options.innerHTML = `
            <button class="dropdown-item edit-post" data-post-id="${post.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Edit</span>
            </button>
            <button class="dropdown-item delete-post" data-post-id="${post.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                <span>Hapus</span>
            </button>
            <div class="dropdown-divider"></div>
        `;
    }
    
    options.innerHTML += `
        <button class="dropdown-item save-post" data-post-id="${post.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Simpan</span>
        </button>
        <button class="dropdown-item report-post" data-post-id="${post.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12" y2="16"/>
            </svg>
            <span>Laporkan</span>
        </button>
    `;
    
    document.body.appendChild(options);
    
    // Add event listeners
    options.querySelector('.edit-post')?.addEventListener('click', () => {
        editPost(post.id);
        options.remove();
    });
    
    options.querySelector('.delete-post')?.addEventListener('click', () => {
        deletePost(post.id);
        options.remove();
    });
    
    options.querySelector('.save-post')?.addEventListener('click', () => {
        savePost(post.id);
        options.remove();
    });
    
    options.querySelector('.report-post')?.addEventListener('click', () => {
        reportPost(post.id);
        options.remove();
    });
    
    // Close on outside click
    setTimeout(() => {
        const closeOptions = (e) => {
            if (!options.contains(e.target)) {
                options.remove();
                document.removeEventListener('click', closeOptions);
            }
        };
        document.addEventListener('click', closeOptions);
    });
}

// Edit post
function editPost(postId) {
    // Implement edit post functionality
    alert('Edit post functionality coming soon!');
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        // Remove from localStorage
        const posts = JSON.parse(localStorage.getItem('vortexx_posts') || '[]');
        const updatedPosts = posts.filter(p => p.id !== postId);
        localStorage.setItem('vortexx_posts', JSON.stringify(updatedPosts));
        
        // Remove from UI
        const postElement = document.querySelector(`.post-card [data-post-id="${postId}"]`)?.closest('.post-card');
        if (postElement) {
            postElement.style.opacity = '0';
            postElement.style.transform = 'translateY(-20px)';
            setTimeout(() => postElement.remove(), 300);
        }
        
        // In a real app, you would delete from server here
        
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
}

// Save post
function savePost(postId) {
    const savedPosts = JSON.parse(localStorage.getItem('vortexx_saved_posts') || '[]');
    if (!savedPosts.includes(postId)) {
        savedPosts.push(postId);
        localStorage.setItem('vortexx_saved_posts', JSON.stringify(savedPosts));
        alert('Post saved!');
    } else {
        alert('Post already saved');
    }
}

// Report post
function reportPost(postId) {
    const reason = prompt('Please enter the reason for reporting this post:');
    if (reason) {
        // In a real app, send report to server
        console.log(`Reported post ${postId}: ${reason}`);
        alert('Thank you for your report. We will review it soon.');
    }
}

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;
    
    if (diff < minute) return 'baru saja';
    if (diff < hour) return `${Math.floor(diff / minute)} menit yang lalu`;
    if (diff < day) return `${Math.floor(diff / hour)} jam yang lalu`;
    if (diff < week) return `${Math.floor(diff / day)} hari yang lalu`;
    if (diff < month) return `${Math.floor(diff / week)} minggu yang lalu`;
    if (diff < year) return `${Math.floor(diff / month)} bulan yang lalu`;
    return `${Math.floor(diff / year)} tahun yang lalu`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions
export { loadPosts, createPost, handleLike, handleComment, handleShare };