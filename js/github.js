// GitHub API Configuration
const GITHUB_CONFIG = {
    token: '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',
    username: 'Joodev23',
    repo: 'forum-vortex',
    baseUrl: 'https://api.github.com'
};

// Headers for GitHub API requests
function getHeaders() {
    return {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
    };
}

// Get SHA of existing file
async function getFileSha(filePath) {
    try {
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        if (response.status === 404) {
            return null; // File doesn't exist
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.sha;
    } catch (error) {
        console.error('Error getting file SHA:', error);
        return null;
    }
}

// Save user data to GitHub
async function saveUserToGitHub(user) {
    try {
        const filePath = `users/${user.username}.json`;
        const content = JSON.stringify(user, null, 2);
        const sha = await getFileSha(filePath);
        
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                message: `Add/Update user: ${user.username}`,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API error: ${error.message}`);
        }
        
        // Also update users index
        await updateUsersIndex(user);
        
        return true;
    } catch (error) {
        console.error('Error saving user to GitHub:', error);
        throw error;
    }
}

// Update users index file
async function updateUsersIndex(user) {
    try {
        const filePath = 'users/index.json';
        let existingUsers = [];
        
        // Get existing users index
        const sha = await getFileSha(filePath);
        if (sha) {
            const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
            const response = await fetch(url, {
                headers: getHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                existingUsers = JSON.parse(content);
            }
        }
        
        // Add new user to index
        const userIndex = {
            id: user.id,
            username: user.username,
            name: user.name,
            verified: user.verified,
            joinDate: user.joinDate
        };
        
        // Remove if already exists and add at beginning
        existingUsers = existingUsers.filter(u => u.username !== user.username);
        existingUsers.unshift(userIndex);
        
        // Save updated index
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        const content = JSON.stringify(existingUsers, null, 2);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                message: `Update users index`,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update users index');
        }
        
        return true;
    } catch (error) {
        console.error('Error updating users index:', error);
        // Don't throw error for index update failure
        return false;
    }
}

// Check if username exists
async function checkUsernameExists(username) {
    try {
        const filePath = `users/${username}.json`;
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        return response.status === 200;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// Get user data
async function getUserData(username) {
    try {
        const filePath = `users/${username}.json`;
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/main/${filePath}`;
        
        const response = await fetch(rawUrl);
        
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
}

// Save post to GitHub
async function savePostToGitHub(post) {
    try {
        const timestamp = Date.now();
        const filePath = `posts/${timestamp}.json`;
        const content = JSON.stringify(post, null, 2);
        
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                message: `New post by ${post.author.username}`,
                content: btoa(unescape(encodeURIComponent(content)))
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API error: ${error.message}`);
        }
        
        // Update posts index
        await updatePostsIndex(post, timestamp);
        
        return true;
    } catch (error) {
        console.error('Error saving post to GitHub:', error);
        throw error;
    }
}

// Update posts index
async function updatePostsIndex(post, timestamp) {
    try {
        const filePath = 'posts/index.json';
        let existingPosts = [];
        
        // Get existing posts index
        const sha = await getFileSha(filePath);
        if (sha) {
            const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
            const response = await fetch(url, {
                headers: getHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                existingPosts = JSON.parse(content);
            }
        }
        
        // Add new post to index
        const postIndex = {
            id: post.id,
            timestamp,
            author: post.author.username,
            type: post.type,
            hasMedia: !!post.media,
            likes: post.likes || 0,
            comments: post.comments || 0
        };
        
        existingPosts.unshift(postIndex);
        
        // Save updated index
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        const content = JSON.stringify(existingPosts, null, 2);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                message: `Update posts index`,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update posts index');
        }
        
        return true;
    } catch (error) {
        console.error('Error updating posts index:', error);
        return false;
    }
}

// Save story to GitHub
async function saveStoryToGitHub(story) {
    try {
        const timestamp = Date.now();
        const filePath = `stories/${timestamp}.json`;
        const content = JSON.stringify(story, null, 2);
        
        const url = `${GITHUB_CONFIG.baseUrl}/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                message: `New story by ${story.author.username}`,
                content: btoa(unescape(encodeURIComponent(content)))
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API error: ${error.message}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving story to GitHub:', error);
        throw error;
    }
}

// Get all stories
async function getStories() {
    try {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/main/stories/index.json`;
        const response = await fetch(rawUrl);
        
        if (!response.ok) {
            return [];
        }
        
        const stories = await response.json();
        
        // Filter out expired stories (older than 24 hours)
        const now = Date.now();
        const validStories = stories.filter(story => {
            const age = now - story.timestamp;
            return age < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        });
        
        return validStories;
    } catch (error) {
        console.error('Error getting stories:', error);
        return [];
    }
}

// Get all posts
async function getPosts(sortBy = 'latest') {
    try {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/main/posts/index.json`;
        const response = await fetch(rawUrl);
        
        if (!response.ok) {
            return [];
        }
        
        let posts = await response.json();
        
        // Sort posts
        if (sortBy === 'popular') {
            posts.sort((a, b) => {
                const aScore = (a.likes || 0) + (a.comments || 0);
                const bScore = (b.likes || 0) + (b.comments || 0);
                return bScore - aScore;
            });
        } else {
            posts.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        return posts;
    } catch (error) {
        console.error('Error getting posts:', error);
        return [];
    }
}

// Update user profile
async function updateUserProfile(username, updates) {
    try {
        const user = await getUserData(username);
        const updatedUser = { ...user, ...updates };
        
        await saveUserToGitHub(updatedUser);
        
        // Update localStorage if it's the current user
        const currentUser = JSON.parse(localStorage.getItem('vortexx_user') || '{}');
        if (currentUser.username === username) {
            localStorage.setItem('vortexx_user', JSON.stringify(updatedUser));
        }
        
        return updatedUser;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

// Export functions
export {
    saveUserToGitHub,
    checkUsernameExists,
    getUserData,
    savePostToGitHub,
    saveStoryToGitHub,
    getStories,
    getPosts,
    updateUserProfile
};