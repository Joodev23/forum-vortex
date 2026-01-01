import { catboxUpload, validateFile } from './catbox.js';
import { saveStoryToGitHub, getStories } from './github.js';

// Load stories
async function loadStories() {
    try {
        const storiesContainer = document.getElementById('storiesContainer');
        if (!storiesContainer) return;
        
        // Show loader
        storiesContainer.innerHTML = `
            <div class="story-loader">
                <div class="spinner"></div>
            </div>
        `;
        
        // Get stories from GitHub
        const stories = await getStories();
        
        // Clear container
        storiesContainer.innerHTML = '';
        
        // Add create story button (for verified users)
        const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (user.verified) {
            const createStoryBtn = document.createElement('div');
            createStoryBtn.className = 'story-item';
            createStoryBtn.innerHTML = `
                <button class="create-story-btn" id="createStoryBtnMain">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                </button>
                <div class="story-username">Story Kamu</div>
            `;
            storiesContainer.appendChild(createStoryBtn);
            
            createStoryBtn.querySelector('#createStoryBtnMain').addEventListener('click', () => {
                document.getElementById('createStoryModal').classList.add('active');
            });
        }
        
        // Add stories
        stories.forEach(story => {
            const storyElement = createStoryElement(story);
            storiesContainer.appendChild(storyElement);
        });
        
        // If no stories and user not verified, show message
        if (stories.length === 0 && !user.verified) {
            storiesContainer.innerHTML = `
                <div class="empty-stories">
                    <p>Tidak ada story untuk ditampilkan</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading stories:', error);
        const storiesContainer = document.getElementById('storiesContainer');
        if (storiesContainer) {
            storiesContainer.innerHTML = `
                <div class="error-state">
                    <p>Gagal memuat story</p>
                </div>
            `;
        }
    }
}

// Create story element
function createStoryElement(story) {
    const element = document.createElement('div');
    element.className = 'story-item';
    
    // Calculate time left (24 hours)
    const now = Date.now();
    const storyTime = story.timestamp || Date.now();
    const timeLeft = 24 * 60 * 60 * 1000 - (now - storyTime);
    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
    
    // Create progress ring
    const progress = ((24 - hoursLeft) / 24) * 100;
    
    element.innerHTML = `
        <div class="story-avatar-container">
            <svg class="story-progress" width="76" height="76" viewBox="0 0 38 38">
                <circle cx="19" cy="19" r="17" fill="none" stroke="var(--tertiary-bg)" stroke-width="3"/>
                <circle cx="19" cy="19" r="17" fill="none" 
                        stroke="var(--accent)" stroke-width="3" 
                        stroke-linecap="round"
                        stroke-dasharray="${2 * Math.PI * 17}"
                        stroke-dashoffset="${2 * Math.PI * 17 * (1 - progress / 100)}"
                        transform="rotate(-90 19 19)"/>
            </svg>
            <img src="${story.author?.profilePic || 'https://via.placeholder.com/70'}" 
                 alt="${story.author?.name}" 
                 class="story-avatar"
                 data-story-id="${story.id}">
        </div>
        <div class="story-username">${story.author?.name || 'Unknown'}</div>
    `;
    
    // Add click event to view story
    const avatar = element.querySelector('.story-avatar');
    avatar.addEventListener('click', () => viewStory(story));
    
    return element;
}

// Create new story
async function createStory(data) {
    try {
        const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (!user.username) {
            throw new Error('User not authenticated');
        }
        
        if (!user.verified) {
            throw new Error('Only verified users can create stories');
        }
        
        // Validate file
        validateFile(data.mediaFile, {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
        });
        
        // Upload to Catbox
        const arrayBuffer = await data.mediaFile.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const mediaUrl = await catboxUpload(buffer);
        
        // Create story object
        const story = {
            id: generateId(),
            author: {
                id: user.id,
                username: user.username,
                name: user.name,
                profilePic: user.profilePic,
                verified: user.verified
            },
            media: {
                url: mediaUrl,
                type: data.mediaFile.type,
                size: data.mediaFile.size
            },
            caption: data.caption || '',
            timestamp: Date.now(),
            views: [],
            likes: 0
        };
        
        // Save to GitHub
        await saveStoryToGitHub(story);
        
        // Also save to localStorage for quick access
        const stories = JSON.parse(localStorage.getItem('vortexx_stories') || '[]');
        stories.push(story);
        localStorage.setItem('vortexx_stories', JSON.stringify(stories));
        
        return story;
        
    } catch (error) {
        console.error('Error creating story:', error);
        throw error;
    }
}

// View story
function viewStory(story) {
    // Create story viewer
    const viewer = document.createElement('div');
    viewer.className = 'story-viewer modal-overlay active';
    
    // Calculate time left
    const now = Date.now();
    const timeLeft = 24 * 60 * 60 * 1000 - (now - story.timestamp);
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
    const minutesLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));
    
    viewer.innerHTML = `
        <div class="story-viewer-content">
            <div class="story-header">
                <div class="story-author">
                    <img src="${story.author.profilePic || 'https://via.placeholder.com/40'}" 
                         alt="${story.author.name}" 
                         class="story-author-avatar">
                    <div class="story-author-info">
                        <div class="story-author-name">
                            <span>${story.author.name}</span>
                            ${story.author.verified ? `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            ` : ''}
                        </div>
                        <div class="story-time">${hoursLeft}h ${minutesLeft}m tersisa</div>
                    </div>
                </div>
                <button class="story-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            
            <div class="story-media-container">
                ${story.media.type.startsWith('image/') ? `
                    <img src="${story.media.url}" alt="Story" class="story-media">
                ` : story.media.type.startsWith('video/') ? `
                    <video src="${story.media.url}" controls autoplay class="story-media"></video>
                ` : ''}
            </div>
            
            <div class="story-footer">
                ${story.caption ? `
                    <div class="story-caption">${story.caption}</div>
                ` : ''}
                
                <div class="story-actions">
                    <button class="story-action like-story" data-story-id="${story.id}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        <span>${story.likes || 0}</span>
                    </button>
                    <button class="story-action reply-story">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>Balas</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(viewer);
    
    // Add event listeners
    const closeBtn = viewer.querySelector('.story-close');
    const likeBtn = viewer.querySelector('.like-story');
    const replyBtn = viewer.querySelector('.reply-story');
    
    closeBtn.addEventListener('click', () => viewer.remove());
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) viewer.remove();
    });
    
    likeBtn.addEventListener('click', () => handleStoryLike(story.id));
    replyBtn.addEventListener('click', () => handleStoryReply(story.id));
    
    // Add view to story
    addStoryView(story.id);
}

// Handle story like
async function handleStoryLike(storyId) {
    try {
        const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (!user.username) {
            throw new Error('Please login to like stories');
        }
        
        // Get story from localStorage
        const stories = JSON.parse(localStorage.getItem('vortexx_stories') || '[]');
        const storyIndex = stories.findIndex(s => s.id === storyId);
        
        if (storyIndex === -1) {
            throw new Error('Story not found');
        }
        
        const story = stories[storyIndex];
        
        // Toggle like
        story.likes = (story.likes || 0) + 1;
        
        // Update localStorage
        stories[storyIndex] = story;
        localStorage.setItem('vortexx_stories', JSON.stringify(stories));
        
        // Update UI
        const likeBtn = document.querySelector(`.like-story[data-story-id="${storyId}"]`);
        if (likeBtn) {
            const span = likeBtn.querySelector('span');
            if (span) {
                span.textContent = story.likes;
            }
        }
        
        // In a real app, you would update the server here
        
    } catch (error) {
        console.error('Error liking story:', error);
    }
}

// Handle story reply
function handleStoryReply(storyId) {
    const message = prompt('Kirim pesan ke pembuat story:');
    if (message) {
        // In a real app, send reply to server
        console.log(`Reply to story ${storyId}: ${message}`);
        alert('Pesan terkirim!');
    }
}

// Add story view
function addStoryView(storyId) {
    const user = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
    if (!user.username) return;
    
    const stories = JSON.parse(localStorage.getItem('vortexx_stories') || '[]');
    const storyIndex = stories.findIndex(s => s.id === storyId);
    
    if (storyIndex !== -1) {
        const story = stories[storyIndex];
        story.views = story.views || [];
        
        // Add view if not already viewed
        if (!story.views.includes(user.username)) {
            story.views.push(user.username);
            stories[storyIndex] = story;
            localStorage.setItem('vortexx_stories', JSON.stringify(stories));
        }
    }
}

// Clean up expired stories
function cleanupExpiredStories() {
    const now = Date.now();
    const stories = JSON.parse(localStorage.getItem('vortexx_stories') || '[]');
    
    // Filter out stories older than 24 hours
    const validStories = stories.filter(story => {
        const age = now - story.timestamp;
        return age < 24 * 60 * 60 * 1000;
    });
    
    localStorage.setItem('vortexx_stories', JSON.stringify(validStories));
    
    // Also remove from UI
    const storyElements = document.querySelectorAll('.story-item');
    storyElements.forEach(element => {
        const storyId = element.querySelector('.story-avatar')?.dataset.storyId;
        if (storyId && !validStories.some(s => s.id === storyId)) {
            element.remove();
        }
    });
}

// Utility function
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Run cleanup on load
cleanupExpiredStories();

// Run cleanup every hour
setInterval(cleanupExpiredStories, 60 * 60 * 1000);

// Export functions
export { loadStories, createStory, viewStory };