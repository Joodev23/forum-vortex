import { catboxUpload } from './catbox.js';
import { saveUserToGitHub, checkUsernameExists } from './github.js';

const donateModal = document.getElementById('donateModal');
const closeDonateBtn = document.getElementById('closeDonate');
const continueBtn = document.getElementById('continueBtn');
const authContainer = document.getElementById('authContainer');
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regName = document.getElementById('regName');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regConfirmPassword = document.getElementById('regConfirmPassword');
const regProfilePic = document.getElementById('regProfilePic');
const profilePreview = document.getElementById('profilePreview');

let currentUser = null;
let profilePicFile = null;

function checkLoggedIn() {
    const user = localStorage.getItem('vortexx_user');
    const token = localStorage.getItem('vortexx_token');
    
    if (user && token) {
        currentUser = JSON.parse(user);
        window.location.href = 'home.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoggedIn();
    setupEventListeners();
});

function setupEventListeners() {
    closeDonateBtn?.addEventListener('click', closeDonateModal);
    continueBtn?.addEventListener('click', closeDonateModal);
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    regProfilePic?.addEventListener('change', handleProfilePicUpload);
    

    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
}

function closeDonateModal() {
    donateModal.classList.remove('active');
    setTimeout(() => {
        authContainer.style.display = 'flex';
        authContainer.classList.add('fade-in');
    }, 300);
}

function switchTab(tab) {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

async function handleProfilePicUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Harap pilih file gambar');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
    }
    
    profilePicFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        profilePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
    };
    reader.readAsDataURL(file);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    
    if (!username || !password) {
        alert('Harap isi semua field');
        return;
    }
    
    const submitBtn = e.target.querySelector('.btn-auth');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<div class="spinner"></div>';
    submitBtn.disabled = true;
    
    try {
        const users = JSON.parse(localStorage.getItem('vortexx_users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            throw new Error('Username atau password salah');
        }
        

        const token = generateToken();
        localStorage.setItem('vortexx_token', token);
        localStorage.setItem('vortexx_user', JSON.stringify(user));
        
        window.location.href = 'home.html';
        
    } catch (error) {
        alert(error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = regName.value.trim();
    const username = regUsername.value.trim();
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;
    
    // Validation
    if (!name || !username || !password || !confirmPassword) {
        alert('Harap isi semua field');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Password tidak cocok');
        return;
    }
    
    if (password.length < 6) {
        alert('Password minimal 6 karakter');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username hanya boleh berisi huruf, angka, dan underscore');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('.btn-auth');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<div class="spinner"></div>';
    submitBtn.disabled = true;
    
    try {
        // Check if username exists
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error('Username sudah digunakan');
        }
        
        let profilePicUrl = '';
        
        // Upload profile picture if exists
        if (profilePicFile) {
            const arrayBuffer = await profilePicFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            profilePicUrl = await catboxUpload(buffer);
        }
        
        // Create user object
        const user = {
            id: generateId(),
            name,
            username,
            password, // In production, hash this password
            profilePic: profilePicUrl,
            verified: false,
            bio: '',
            joinDate: new Date().toISOString(),
            stats: {
                posts: 0,
                followers: 0,
                following: 0
            }
        };
        
        // Save to GitHub
        await saveUserToGitHub(user);
        
        // Also save to localStorage for quick access
        const users = JSON.parse(localStorage.getItem('vortexx_users') || '[]');
        users.push(user);
        localStorage.setItem('vortexx_users', JSON.stringify(users));
        
        // Create session
        const token = generateToken();
        localStorage.setItem('vortexx_token', token);
        localStorage.setItem('vortexx_user', JSON.stringify(user));
        
        alert('Registrasi berhasil!');
        
        // Redirect to home
        window.location.href = 'home.html';
        
    } catch (error) {
        alert(error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateToken() {
    return btoa(Date.now() + Math.random().toString(36)).substr(0, 32);
}

// Export for use in other files
export { currentUser };