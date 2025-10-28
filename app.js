// Main Application with Firebase Integration
// Import Firebase modules
import {
  auth, db, storage,
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
  ref, uploadBytes, getDownloadURL
} from './firebase-config.js';

// Global state
let currentUser = null;
let currentBlogId = null;
let currentFilter = 'all';
let blogs = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeAuth();
  loadBlogs();
  setupEventListeners();
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

function initializeAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      updateUIForLoggedInUser(user);
      console.log('User logged in:', user.email);
    } else {
      currentUser = null;
      updateUIForLoggedOutUser();
      console.log('User logged out');
    }
  });
}

function updateUIForLoggedInUser(user) {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.textContent = user.displayName || user.email.split('@')[0];
    loginBtn.onclick = showUserMenu;
  }
}

function updateUIForLoggedOutUser() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.textContent = 'Sign In';
    loginBtn.onclick = () => document.getElementById('loginModal').style.display = 'block';
  }
}

function showUserMenu() {
  // Simple menu for now
  const menu = confirm('Profile Menu\n\nClick OK to Sign Out, Cancel to stay signed in');
  if (menu) {
    handleSignOut();
  }
}

// Sign in with Google
async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Create user profile if first time
    await createUserProfile(user);

    document.getElementById('loginModal').style.display = 'none';
    alert('Welcome, ' + user.displayName + '!');
  } catch (error) {
    console.error('Error signing in with Google:', error);
    alert('Error signing in: ' + error.message);
  }
}

// Sign in with Email/Password
async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('loginModal').style.display = 'none';
    alert('Welcome back!');
  } catch (error) {
    console.error('Error signing in:', error);
    alert('Error: ' + error.message);
  }
}

// Sign up with Email/Password
async function signUpWithEmail(email, password, name) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Create user profile
    await createUserProfile(user, name);

    document.getElementById('loginModal').style.display = 'none';
    alert('Account created successfully!');
  } catch (error) {
    console.error('Error signing up:', error);
    alert('Error: ' + error.message);
  }
}

// Sign out
async function handleSignOut() {
  try {
    await signOut(auth);
    alert('Signed out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
    alert('Error signing out: ' + error.message);
  }
}

// Create user profile in Firestore
async function createUserProfile(user, customName = null) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: customName || user.displayName || 'Anonymous User',
      photoURL: user.photoURL || '',
      bio: '',
      website: '',
      socialLinks: {},
      followers: 0,
      following: 0,
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      joinedDate: serverTimestamp(),
      verified: false
    };

    await addDoc(collection(db, 'users'), userProfile);
    console.log('User profile created');
  }
}

// ============================================================================
// BLOG MANAGEMENT
// ============================================================================

// Load all blogs from Firestore
async function loadBlogs() {
  try {
    showLoading();

    const blogsQuery = query(
      collection(db, 'blogs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(blogsQuery);
    blogs = [];

    querySnapshot.forEach((doc) => {
      blogs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Display blogs (even if empty - no more sample data!)
    displayBlogs(currentFilter);
    displayTrendingBlogs();
    updateStats();
    hideLoading();

  } catch (error) {
    console.error('Error loading blogs:', error);
    hideLoading();
    alert('Error loading blogs. Please refresh the page.');
  }
}

// Create new blog
async function createBlog(title, author, category, content) {
  if (!currentUser) {
    alert('Please sign in to create a blog');
    return;
  }

  try {
    const excerpt = content.substring(0, 150) + '...';

    const blogData = {
      title: title,
      author: author || currentUser.displayName || 'Anonymous',
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      category: category,
      content: content,
      excerpt: excerpt,
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'blogs'), blogData);
    console.log('Blog created with ID:', docRef.id);

    // Update user's total posts
    await incrementUserPostCount(currentUser.uid);

    // Reload blogs
    await loadBlogs();

    return docRef.id;
  } catch (error) {
    console.error('Error creating blog:', error);
    throw error;
  }
}

// Update blog views
async function incrementBlogViews(blogId) {
  try {
    const blogRef = doc(db, 'blogs', blogId);
    const blogSnap = await getDoc(blogRef);

    if (blogSnap.exists()) {
      const currentViews = blogSnap.data().views || 0;
      await updateDoc(blogRef, {
        views: currentViews + 1
      });
    }
  } catch (error) {
    console.error('Error updating views:', error);
  }
}

// Update blog likes
async function incrementBlogLikes(blogId) {
  try {
    const blogRef = doc(db, 'blogs', blogId);
    const blogSnap = await getDoc(blogRef);

    if (blogSnap.exists()) {
      const currentLikes = blogSnap.data().likes || 0;
      await updateDoc(blogRef, {
        likes: currentLikes + 1
      });
    }
  } catch (error) {
    console.error('Error updating likes:', error);
  }
}

// Update blog shares
async function incrementBlogShares(blogId) {
  try {
    const blogRef = doc(db, 'blogs', blogId);
    const blogSnap = await getDoc(blogRef);

    if (blogSnap.exists()) {
      const currentShares = blogSnap.data().shares || 0;
      await updateDoc(blogRef, {
        shares: currentShares + 1
      });
    }
  } catch (error) {
    console.error('Error updating shares:', error);
  }
}

// Increment user's post count
async function incrementUserPostCount(userId) {
  try {
    const usersQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const currentPosts = userDoc.data().totalPosts || 0;
      await updateDoc(doc(db, 'users', userDoc.id), {
        totalPosts: currentPosts + 1
      });
    }
  } catch (error) {
    console.error('Error updating user post count:', error);
  }
}

// Sample blog seeding function removed - use real user-generated content only

// ============================================================================
// UI FUNCTIONS
// ============================================================================

// Display blogs with optional filter
function displayBlogs(filter = 'all') {
  const blogsContainer = document.getElementById('blogsContainer');
  if (!blogsContainer) return;

  let filteredBlogs = filter === 'all' ? blogs : blogs.filter(b => b.category === filter);

  if (filteredBlogs.length === 0) {
    blogsContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No blogs found. Be the first to write one!</p>';
    return;
  }

  blogsContainer.innerHTML = filteredBlogs.map(blog => `
    <div class="blog-card" onclick="openBlogDetails('${blog.id}')">
      <h3>${escapeHtml(blog.title)}</h3>
      <div class="blog-meta">
        <span class="blog-category">${blog.category}</span>
        <span class="blog-date">${formatDate(blog.createdAt)}</span>
      </div>
      <p class="blog-excerpt">${renderBlogContent(blog.excerpt)}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <span style="color: #999; font-size: 0.9rem;">By ${escapeHtml(blog.author)}</span>
        <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: #999;">
          <span>👁 ${formatNumber(blog.views)}</span>
          <span>❤ ${formatNumber(blog.likes)}</span>
        </div>
      </div>
      <a href="#" class="read-more" onclick="event.stopPropagation(); openBlogDetails('${blog.id}')">Read More →</a>
    </div>
  `).join('');
}

// Display trending blogs
function displayTrendingBlogs() {
  const trendingContainer = document.getElementById('trendingContainer');
  if (!trendingContainer) return;

  const trendingBlogs = [...blogs]
    .sort((a, b) => (b.views + b.likes * 10) - (a.views + a.likes * 10))
    .slice(0, 3);

  if (trendingBlogs.length === 0) {
    trendingContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No trending blogs yet.</p>';
    return;
  }

  trendingContainer.innerHTML = trendingBlogs.map(blog => `
    <div class="blog-card" onclick="openBlogDetails('${blog.id}')" style="border: 2px solid #ffd700;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.75rem; font-weight: bold;">🔥 TRENDING</span>
      </div>
      <h3>${escapeHtml(blog.title)}</h3>
      <div class="blog-meta">
        <span class="blog-category">${blog.category}</span>
        <span class="blog-date">${formatDate(blog.createdAt)}</span>
      </div>
      <p class="blog-excerpt">${renderBlogContent(blog.excerpt)}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <span style="color: #999; font-size: 0.9rem;">By ${escapeHtml(blog.author)}</span>
        <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: #999;">
          <span>👁 ${formatNumber(blog.views)}</span>
          <span>❤ ${formatNumber(blog.likes)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Open blog details
async function openBlogDetails(blogId) {
  const blog = blogs.find(b => b.id === blogId);
  if (!blog) return;

  currentBlogId = blogId;

  // Increment views
  await incrementBlogViews(blogId);
  blog.views++;

  const blogDetails = document.getElementById('blogDetails');
  blogDetails.innerHTML = `
    <h2>${escapeHtml(blog.title)}</h2>
    <div class="blog-meta">
      <span class="blog-category">${blog.category}</span>
      <span style="margin: 0 1rem;">By ${escapeHtml(blog.author)}</span>
      <span class="blog-date">${formatDate(blog.createdAt)}</span>
    </div>
    <div style="display: flex; gap: 2rem; margin: 1rem 0; color: #999; font-size: 0.9rem;">
      <span>👁 ${formatNumber(blog.views)} views</span>
      <span>❤ ${formatNumber(blog.likes)} likes</span>
      <span>📤 ${formatNumber(blog.shares)} shares</span>
    </div>
    <div class="blog-content">${renderBlogContent(blog.content)}</div>
  `;

  // Update like count
  document.getElementById('likeCount').textContent = blog.likes;

  document.getElementById('readModal').style.display = 'block';
}

// Like blog
async function likeBlog() {
  if (!currentBlogId) return;

  await incrementBlogLikes(currentBlogId);

  // Update local data and UI
  const blog = blogs.find(b => b.id === currentBlogId);
  if (blog) {
    blog.likes++;
    document.getElementById('likeCount').textContent = blog.likes;
    document.getElementById('likeIcon').textContent = '❤';
    displayBlogs(currentFilter);
    displayTrendingBlogs();
  }
}

// Update stats
function updateStats() {
  const blogCountEl = document.getElementById('blogCount');
  const readerCountEl = document.getElementById('readerCount');

  if (blogCountEl) {
    blogCountEl.textContent = formatNumber(blogs.length) + '+';
  }

  if (readerCountEl) {
    const totalViews = blogs.reduce((sum, blog) => sum + (blog.views || 0), 0);
    readerCountEl.textContent = formatNumber(totalViews) + '+';
  }
}

// Clean up fake/sample blogs (those with @example.com emails)
async function deleteFakeBlogs() {
  try {
    console.log('🧹 Starting cleanup of fake blogs...');

    const blogsQuery = query(collection(db, 'blogs'));
    const querySnapshot = await getDocs(blogsQuery);

    let deletedCount = 0;
    const deletePromises = [];

    querySnapshot.forEach((docSnapshot) => {
      const blog = docSnapshot.data();
      if (blog.authorEmail && blog.authorEmail.endsWith('@example.com')) {
        console.log(`Deleting fake blog: "${blog.title}" by ${blog.author}`);
        deletePromises.push(deleteDoc(doc(db, 'blogs', docSnapshot.id)));
        deletedCount++;
      }
    });

    await Promise.all(deletePromises);

    console.log(`✅ Deleted ${deletedCount} fake blogs`);

    // Reload blogs to refresh the display
    await loadBlogs();

    alert(`Successfully deleted ${deletedCount} fake/sample blogs!`);
  } catch (error) {
    console.error('❌ Error deleting fake blogs:', error);
    alert('Error deleting blogs: ' + error.message);
  }
}

// Make function available globally for console access
window.deleteFakeBlogs = deleteFakeBlogs;

// Utility functions
function formatDate(timestamp) {
  if (!timestamp) return 'Recently';

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render blog content with images (convert markdown images to HTML)
function renderBlogContent(content) {
  if (!content) return '';

  // Escape HTML first for security
  let sanitized = escapeHtml(content);

  // Convert markdown images: ![alt](url) to <img> tags
  // Added loading="lazy" for better mobile performance
  // Added onerror handler to help debug image loading issues
  sanitized = sanitized.replace(
    /!\[([^\]]*)\]\(([^\)]+)\)/g,
    (match, alt, url) => {
      return `<img src="${url}" alt="${alt}" loading="lazy" crossorigin="anonymous" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 8px; display: block;" onerror="console.error('Failed to load image:', '${url}'); this.style.border='2px solid #fcc'; this.style.padding='1rem'; this.alt='⚠️ Image failed to load: ${url}';">`;
    }
  );

  // Convert line breaks to <br> for better formatting
  sanitized = sanitized.replace(/\n/g, '<br>');

  return sanitized;
}

function showLoading() {
  const blogsContainer = document.getElementById('blogsContainer');
  if (blogsContainer) {
    blogsContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">Loading blogs...</p>';
  }
}

function hideLoading() {
  // Loading is replaced by actual content
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      displayBlogs(currentFilter);
    });
  });

  // Write blog button
  const writeBtn = document.getElementById('writeBtn');
  if (writeBtn) {
    writeBtn.onclick = function() {
      if (!currentUser) {
        alert('Please sign in to write a blog');
        document.getElementById('loginModal').style.display = 'block';
        return;
      }
      document.getElementById('blogModal').style.display = 'block';
    };
  }

  // Blog form submission
  const blogForm = document.getElementById('blogForm');
  if (blogForm) {
    blogForm.onsubmit = async function(e) {
      e.preventDefault();

      const title = document.getElementById('blogTitle').value;
      const author = document.getElementById('blogAuthor').value;
      const category = document.getElementById('blogCategory').value;
      const content = document.getElementById('blogContent').value;

      try {
        await createBlog(title, author, category, content);

        document.getElementById('blogModal').style.display = 'none';
        blogForm.reset();

        document.getElementById('blogs').scrollIntoView({ behavior: 'smooth' });

        alert('🎉 Blog published successfully! Share it with your friends!');
      } catch (error) {
        alert('Error publishing blog: ' + error.message);
      }
    };
  }

  // Login form - Google sign in
  const googleLoginButtons = document.querySelectorAll('.social-login-btn.google');
  googleLoginButtons.forEach(btn => {
    btn.onclick = signInWithGoogle;
  });

  // Close modals
  setupModalClosing();

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function setupModalClosing() {
  const modal = document.getElementById('blogModal');
  const readModal = document.getElementById('readModal');
  const loginModal = document.getElementById('loginModal');

  const closeBtn = document.getElementsByClassName('close')[0];
  const closeReadBtn = document.getElementsByClassName('close-read')[0];
  const closeLoginBtn = document.getElementsByClassName('close-login')[0];

  if (closeBtn) {
    closeBtn.onclick = function() {
      modal.style.display = 'none';
      document.getElementById('blogForm').reset();
    };
  }

  if (closeReadBtn) {
    closeReadBtn.onclick = function() {
      readModal.style.display = 'none';
      currentBlogId = null;
    };
  }

  if (closeLoginBtn) {
    closeLoginBtn.onclick = function() {
      loginModal.style.display = 'none';
    };
  }

  // Close when clicking outside
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
    if (event.target == readModal) {
      readModal.style.display = 'none';
      currentBlogId = null;
    }
    if (event.target == loginModal) {
      loginModal.style.display = 'none';
    }
  };
}

// ============================================================================
// SOCIAL SHARING
// ============================================================================

function shareOnTwitter() {
  if (!currentBlogId) return;
  const blog = blogs.find(b => b.id === currentBlogId);
  if (!blog) return;

  const text = `Check out this blog: "${blog.title}" by ${blog.author}`;
  const url = window.location.href;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');

  incrementBlogShares(currentBlogId);
}

function shareOnFacebook() {
  const url = window.location.href;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  if (currentBlogId) incrementBlogShares(currentBlogId);
}

function shareOnLinkedIn() {
  const url = window.location.href;
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  if (currentBlogId) incrementBlogShares(currentBlogId);
}

function shareOnWhatsApp() {
  if (!currentBlogId) return;
  const blog = blogs.find(b => b.id === currentBlogId);
  if (!blog) return;

  const text = `Check out this blog: "${blog.title}" by ${blog.author} - ${window.location.href}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  incrementBlogShares(currentBlogId);
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('Link copied to clipboard!');
    if (currentBlogId) incrementBlogShares(currentBlogId);
  });
}

function bookmarkBlog() {
  if (!currentUser) {
    alert('Please sign in to bookmark blogs');
    return;
  }
  alert('Blog bookmarked! (Feature will be fully implemented in next update)');
}

// Make functions global for onclick handlers
window.openBlogDetails = openBlogDetails;
window.likeBlog = likeBlog;
window.shareOnTwitter = shareOnTwitter;
window.shareOnFacebook = shareOnFacebook;
window.shareOnLinkedIn = shareOnLinkedIn;
window.shareOnWhatsApp = shareOnWhatsApp;
window.copyLink = copyLink;
window.bookmarkBlog = bookmarkBlog;
