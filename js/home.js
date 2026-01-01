import { getStories, getPosts } from './github.js';
import { currentUser } from './auth.js';
import { loadPosts, createPost } from './posts.js';
import { loadStories, createStory } from './stories.js';

// DOM Elements
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const welcomeMessage = document.getElementById('welcomeMessage');
const currentUserAvatar = document.getElementById('currentUserAvatar');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const sidebarUsername = document.getElementById('sidebarUsername');
const sidebarName = document.getElementById('sidebarName');
const sidebarHandle = document.getElementById('sidebarHandle');
const verifiedBadge = document.getElementById('verifiedBadge');
const postCount = document.getElementById('postCount');
const followerCount = document.getElementById('followerCount');
const followingCount = document.getElementById('followingCount');
const logoutBtn = document.getElementById('logoutBtn');
const profileDropdown = document.getElementById('profileDropdown');
const profileDropdownMenu = document.getElementById('profileDropdownMenu');
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
const postInput = document.getElementById('postInput');
const submitPostBtn = document.getElementById('submitPostBtn');
const createStoryBtn = document.getElementById('createStoryBtn');
const createStoryModal = document.getElementById('createStoryModal');
const closeStoryModal = document.getElementById('closeStoryModal');
const storyForm = document.getElementById('storyForm');
const createPostModal = document.getElementById('createPostModal');
const closePostModal = document.getElementById('closePostModal');
const postForm = document.getElementById('postForm');
const fabBtn = document.getElementById('fabBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const sortBtns = document.querySelectorAll('.sort-btn');
const postAvatar = document.getElementById('postAvatar');
const postActionBtns = document.querySelectorAll('.post-action-btn');

// State
let currentSort = 'popular';
let currentPage = 1;
const postsPerPage = 5;
let isLoading = false;
let userData = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
    loadInitialData();
});

// Initialize App
async function initializeApp() {
    // Check authentication
    const storedUser = localStorage.getItem('vortexx_user');
    const token = localStorage.getItem('vortexx_token');
    
    if (!storedUser || !token) {
        window.location.href = 'index.html';
        return;
    }
    
    userData = JSON.parse(storedUser);
    
    // Update UI with user data
    updateUserUI();
    
    // Load user stats
    await loadUserStats();
}

// Update UI with user data
function updateUserUI() {
    if (!userData) return;
    
    // Welcome message
    welcomeMessage.textContent = `Welcome back, ${userData.name}!`;
    
    // Profile pictures
    if (userData.profilePic) {
        currentUserAvatar.src = userData.profilePic;
        sidebarAvatar.src = userData.profilePic;
        postAvatar.src = userData.profilePic;
    }
    
    // User info
    sidebarName.textContent = userData.name;
    sidebarHandle.textContent = `@${userData.username}`;
    
    // Verified badge
    if (userData.verified) {
        verifiedBadge.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        `;
    }
}

// Load user stats
async function loadUserStats() {
    try {
        // In a real app, this would be an API call
        // For now, use localStorage data
        const posts = JSON.parse(localStorage.getItem('vortexx_posts') || '[]');
        const userPosts = posts.filter(post => post.author?.username === userData.username);
        
        postCount.textContent = userPosts.length;
        followerCount.textContent = userData.stats?.followers || 0;
        followingCount.textContent = userData.stats?.following || 0;
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle
    menuBtn?.addEventListener('click', toggleSidebar);
    sidebarClose?.addEventListener('click', toggleSidebar);
    
    // Profile dropdown
    profileDropdown?.addEventListener('click', toggleProfileDropdown);
    document.addEventListener('click', closeProfileDropdown);
    
    // Logout
    logoutBtn?.addEventListener('click', handleLogout);
    dropdownLogoutBtn?.addEventListener('click', handleLogout);
    
    // Create post
    submitPostBtn?.addEventListener('click', () => {
        createPostModal.classList.add('active');
    });
    
    postInput?.addEventListener('click', () => {
        createPostModal.classList.add('active');
    });
    
    postActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = btn.dataset.type;
            createPostModal.classList.add('active');
            // Set post type in modal
            const postTypeSelect = document.getElementById('postType');
            if (postTypeSelect) {
                postTypeSelect.value = type;
                updateMediaUploadVisibility(type);
            }
        });
    });
    
    // Close modals
    closePostModal?.addEventListener('click', () => {
        createPostModal.classList.remove('active');
    });
    
    closeStoryModal?.addEventListener('click', () => {
        createStoryModal.classList.remove('active');
    });
    
    // Create story
    createStoryBtn?.addEventListener('click', () => {
        if (!userData.verified) {
            showDonateModal('Hanya user terverifikasi yang bisa membuat story.');
            return;
        }
        createStoryModal.classList.add('active');
    });
    
    // Form submissions
    postForm?.addEventListener('submit', handleCreatePost);
    storyForm?.addEventListener('submit', handleCreateStory);
    
    // Sort posts
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sort = btn.dataset.sort;
            changeSort(sort);
        });
    });
    
    // Load more posts
    loadMoreBtn?.addEventListener('click', loadMorePosts);
    
    // FAB
    fabBtn?.addEventListener('click', () => {
        createPostModal.classList.add('active');
    });
    
    // Media upload
    setupMediaUpload();
}

// Toggle sidebar
function toggleSidebar() {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
}

// Toggle profile dropdown
function toggleProfileDropdown(e) {
    e.stopPropagation();
    profileDropdownMenu.classList.toggle('show');
}

// Close profile dropdown
function closeProfileDropdown(e) {
    if (!profileDropdown?.contains(e.target) && !profileDropdownMenu?.contains(e.target)) {
        profileDropdownMenu.classList.remove('show');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('vortexx_token');
    localStorage.removeItem('vortexx_user');
    window.location.href = 'index.html';
}

// Show donate modal
function showDonateModal(message = '') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content modal-donate">
            <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <div class="donate-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
            </div>
            <h2>Verifikasi Diperlukan</h2>
            ${message ? `<p class="donate-description">${message}</p>` : ''}
            <p class="donate-description">Dukung pengembangan dengan donasi untuk mendapatkan status terverifikasi dan akses fitur premium.</p>
            <div class="qris-container">
                <img src="https://files.catbox.moe/l9y65y.jpg" alt="QRIS Donation" class="qris-image">
            </div>
            <p class="donate-note">Scan QRIS di atas untuk donasi</p>
            <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Mengerti</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Setup media upload
function setupMediaUpload() {
    const mediaUploadArea = document.getElementById('mediaUploadArea');
    const storyUploadArea = document.getElementById('storyUploadArea');
    const postMediaInput = document.getElementById('postMedia');
    const storyMediaInput = document.getElementById('storyMedia');
    
    // Post media upload
    if (mediaUploadArea && postMediaInput) {
        setupDragAndDrop(mediaUploadArea, postMediaInput);
    }
    
    // Story media upload
    if (storyUploadArea && storyMediaInput) {
        setupDragAndDrop(storyUploadArea, storyMediaInput);
    }
}

// Setup drag and drop
function setupDragAndDrop(dropArea, input) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('dragover');
    }
    
    function unhighlight() {
        dropArea.classList.remove('dragover');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        input.files = files;
        
        // Trigger change event
        const event = new Event('change');
        input.dispatchEvent(event);
    }
    
    // Click to select files
    dropArea.addEventListener('click', () => {
        input.click();
    });
}

// Update media upload visibility
function updateMediaUploadVisibility(type) {
    const mediaUploadGroup = document.getElementById('mediaUploadGroup');
    if (type === 'text') {
        mediaUploadGroup.style.display = 'none';
    } else {
        mediaUploadGroup.style.display = 'block';
    }
}

// Handle create post
async function handleCreatePost(e) {
    e.preventDefault();
    
    const caption = document.getElementById('postCaption').value;
    const postType = document.getElementById('postType').value;
    const mediaFile = document.getElementById('postMedia').files[0];
    const allowComments = document.getElementById('allowComments').checked;
    const allowLikes = document.getElementById('allowLikes').checked;
    
    if (!caption.trim() && postType === 'text') {
        alert('Harap isi caption untuk postingan teks');
        return;
    }
    
    if ((postType === 'image' || postType === 'video') && !mediaFile) {
        alert('Harap pilih media untuk postingan ini');
        return;
    }
    
    try {
        const createPostBtn = document.getElementById('createPostBtn');
        const originalText = createPostBtn.innerHTML;
        createPostBtn.innerHTML = '<div class="spinner"></div>';
        createPostBtn.disabled = true;
        
        // Create post
        await createPost({
            caption,
            type: postType,
            mediaFile,
            allowComments,
            allowLikes
        });
        
        // Reset form
        e.target.reset();
        const mediaPreview = document.getElementById('mediaPreview');
        if (mediaPreview) mediaPreview.innerHTML = '';
        
        // Close modal
        createPostModal.classList.remove('active');
        
        // Reload posts
        await loadPosts(currentSort);
        
        // Update user stats
        await loadUserStats();
        
        createPostBtn.innerHTML = originalText;
        createPostBtn.disabled = false;
        
    } catch (error) {
        alert(error.message);
        const createPostBtn = document.getElementById('createPostBtn');
        createPostBtn.innerHTML = 'Publikasikan';
        createPostBtn.disabled = false;
    }
}

// Handle create story
async function handleCreateStory(e) {
    e.preventDefault();
    
    const mediaFile = document.getElementById('storyMedia').files[0];
    const caption = document.getElementById('storyCaption').value;
    
    if (!mediaFile) {
        alert('Harap pilih media untuk story');
        return;
    }
    
    try {
        const createStoryBtn = document.getElementById('createStoryBtn');
        const originalText = createStoryBtn.innerHTML;
        createStoryBtn.innerHTML = '<div class="spinner"></div>';
        createStoryBtn.disabled = true;
        
        // Create story
        await createStory({
            mediaFile,
            caption
        });
        
        // Reset form
        e.target.reset();
        const storyPreview = document.getElementById('storyPreview');
        if (storyPreview) storyPreview.innerHTML = '';
        
        // Close modal
        createStoryModal.classList.remove('active');
        
        // Reload stories
        await loadStories();
        
        createStoryBtn.innerHTML = originalText;
        createStoryBtn.disabled = false;
        
    } catch (error) {
        alert(error.message);
        const createStoryBtn = document.getElementById('createStoryBtn');
        createStoryBtn.innerHTML = 'Bagikan ke Story';
        createStoryBtn.disabled = false;
    }
}

// Change sort
function changeSort(sort) {
    if (sort === currentSort) return;
    
    currentSort = sort;
    currentPage = 1;
    
    // Update active button
    sortBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sort);
    });
    
    // Reload posts
    loadPosts(sort);
}

// Load initial data
async function loadInitialData() {
    try {
        // Load stories
        await loadStories();
        
        // Load posts
        await loadPosts(currentSort);
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Load more posts
async function loadMorePosts() {
    if (isLoading) return;
    
    isLoading = true;
    currentPage++;
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const originalText = loadMoreBtn.textContent;
    loadMoreBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';
    loadMoreBtn.disabled = true;
    
    try {
        // Simulate loading more posts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a real app, this would load more posts from the server
        const postsContainer = document.getElementById('postsContainer');
        const loader = document.createElement('div');
        loader.className = 'post-loader';
        loader.innerHTML = '<div class="spinner"></div><p>Memuat postingan tambahan...</p>';
        postsContainer.appendChild(loader);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        loader.remove();
        
        // Add dummy posts (in real app, these would come from API)
        for (let i = 0; i < 3; i++) {
            const post = createDummyPost();
            postsContainer.appendChild(post);
        }
        
    } catch (error) {
        console.error('Error loading more posts:', error);
    } finally {
        isLoading = false;
        loadMoreBtn.textContent = originalText;
        loadMoreBtn.disabled = false;
    }
}

// Create dummy post for demo
function createDummyPost() {
    const post = document.createElement('div');
    post.className = 'post-card slide-up';
    post.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <img src="https://via.placeholder.com/44" alt="Avatar" class="author-avatar">
                <div class="author-info">
                    <div class="author-name">
                        <span>User Demo</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div class="post-time">2 jam yang lalu</div>
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
            <p class="post-text">Ini adalah contoh postingan tambahan untuk demonstrasi.</p>
        </div>
        <div class="post-stats">
            <div class="post-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span>42 likes</span>
            </div>
            <div class="post-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>8 komentar</span>
            </div>
        </div>
        <div class="post-actions-row">
            <button class="post-action like-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                <span>Like</span>
            </button>
            <button class="post-action comment-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Komentar</span>
            </button>
            <button class="post-action share-btn">
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
    
    return post;
}

// Handle media preview
document.addEventListener('change', (e) => {
    if (e.target.id === 'postMedia' || e.target.id === 'storyMedia') {
        const file = e.target.files[0];
        if (!file) return;
        
        const previewId = e.target.id === 'postMedia' ? 'mediaPreview' : 'storyPreview';
        const preview = document.getElementById(previewId);
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <div class="${previewId === 'mediaPreview' ? 'media-preview-item' : 'story-preview-item'}">
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-media" onclick="this.parentElement.remove()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            preview.innerHTML = `
                <div class="${previewId === 'mediaPreview' ? 'media-preview-item' : 'story-preview-item'}">
                    <video src="${url}" controls></video>
                    <button class="remove-media" onclick="this.parentElement.remove(); URL.revokeObjectURL('${url}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `;
        }
    }
});

// Update post type visibility
document.addEventListener('change', (e) => {
    if (e.target.id === 'postType') {
        updateMediaUploadVisibility(e.target.value);
    }
});

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Export for use in other files
export { showDonateModal, updateUserUI };