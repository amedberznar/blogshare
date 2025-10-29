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
  handleHashNavigation();
});

// Handle hash navigation (for #write from profile page)
function handleHashNavigation() {
  const hash = window.location.hash;
  if (hash === '#write') {
    setTimeout(() => {
      if (currentUser) {
        document.getElementById('blogModal').style.display = 'block';
      } else {
        document.getElementById('loginModal').style.display = 'block';
      }
    }, 500);
  }
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

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
    loginBtn.onclick = () => window.location.href = 'profile.html';
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
    // Create smart excerpt that doesn't break markdown image URLs
    let excerpt = content;

    // If content is longer than 150 chars, create excerpt carefully
    if (content.length > 150) {
      // Check if there's an image in the first 150 chars
      const firstPart = content.substring(0, 150);
      const imageStartIndex = firstPart.lastIndexOf('![');

      if (imageStartIndex !== -1) {
        // There's a partial image markdown, find where it ends in full content
        const imageEndIndex = content.indexOf(')', imageStartIndex);
        if (imageEndIndex !== -1 && imageEndIndex > 150) {
          // Include the complete image URL
          excerpt = content.substring(0, imageEndIndex + 1) + '\n...';
        } else {
          excerpt = content.substring(0, 150) + '...';
        }
      } else {
        // No image in first part, safe to truncate
        excerpt = content.substring(0, 150) + '...';
      }
    }

    const blogData = {
      title: title,
      author: author || currentUser.displayName || 'Anonymous',
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      authorPhoto: currentUser.photoURL || '', // Google profile photo
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
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${blog.authorPhoto ? `<img src="${blog.authorPhoto}" alt="${escapeHtml(blog.author)}" class="author-avatar" onerror="this.style.display='none'">` : ''}
          <span style="color: #999; font-size: 0.9rem;">By ${escapeHtml(blog.author)}</span>
        </div>
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
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${blog.authorPhoto ? `<img src="${blog.authorPhoto}" alt="${escapeHtml(blog.author)}" class="author-avatar" onerror="this.style.display='none'">` : ''}
          <span style="color: #999; font-size: 0.9rem;">By ${escapeHtml(blog.author)}</span>
        </div>
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
      <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0 1rem;">
        ${blog.authorPhoto ? `<img src="${blog.authorPhoto}" alt="${escapeHtml(blog.author)}" class="author-avatar-large" onerror="this.style.display='none'">` : ''}
        <span>By ${escapeHtml(blog.author)}</span>
      </div>
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

// Migrate old blogs to add author photos (uses current user's photo for their blogs)
async function addPhotosToMyOldBlogs() {
  if (!currentUser) {
    alert('Please sign in first!');
    return;
  }

  try {
    console.log('📸 Adding your photo to your old blogs...');

    // Get all blogs by current user
    const blogsQuery = query(
      collection(db, 'blogs'),
      where('authorId', '==', currentUser.uid)
    );
    const blogsSnapshot = await getDocs(blogsQuery);

    let updatedCount = 0;
    const updatePromises = [];

    blogsSnapshot.forEach((blogDoc) => {
      const blog = blogDoc.data();

      // Only update if authorPhoto is missing or empty
      if (!blog.authorPhoto && currentUser.photoURL) {
        console.log(`Adding photo to blog: "${blog.title}"`);
        updatePromises.push(
          updateDoc(doc(db, 'blogs', blogDoc.id), {
            authorPhoto: currentUser.photoURL
          })
        );
        updatedCount++;
      }
    });

    await Promise.all(updatePromises);

    console.log(`✅ Migration complete! Updated ${updatedCount} of your blogs`);

    // Reload blogs to show the changes
    await loadBlogs();

    alert(`Successfully added your photo to ${updatedCount} old blogs!`);
  } catch (error) {
    console.error('❌ Error migrating blogs:', error);
    alert('Error adding photos to old blogs: ' + error.message);
  }
}

// Migrate ALL old blogs to add author photos (admin function)
async function addPhotosToAllOldBlogs() {
  try {
    console.log('📸 Starting migration to add author photos to ALL old blogs...');

    // Get all blogs
    const blogsQuery = query(collection(db, 'blogs'));
    const blogsSnapshot = await getDocs(blogsQuery);

    // Get all users
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);

    // Create a map of userId -> photoURL
    const userPhotos = {};
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.uid && userData.photoURL) {
        userPhotos[userData.uid] = userData.photoURL;
      }
    });

    console.log(`Found ${Object.keys(userPhotos).length} users with photos`);

    let updatedCount = 0;
    const updatePromises = [];

    blogsSnapshot.forEach((blogDoc) => {
      const blog = blogDoc.data();

      // Only update if authorPhoto is missing or empty
      if (!blog.authorPhoto && blog.authorId) {
        const photoURL = userPhotos[blog.authorId];

        if (photoURL) {
          console.log(`Adding photo to blog: "${blog.title}" by ${blog.author}`);
          updatePromises.push(
            updateDoc(doc(db, 'blogs', blogDoc.id), {
              authorPhoto: photoURL
            })
          );
          updatedCount++;
        } else {
          console.log(`No photo found for user ${blog.authorId} (${blog.author})`);
        }
      }
    });

    await Promise.all(updatePromises);

    console.log(`✅ Migration complete! Updated ${updatedCount} blogs with author photos`);

    // Reload blogs to show the changes
    await loadBlogs();

    alert(`Successfully added photos to ${updatedCount} old blogs!`);
  } catch (error) {
    console.error('❌ Error migrating blogs:', error);
    alert('Error adding photos to old blogs: ' + error.message);
  }
}

// Make migration functions available globally
window.addPhotosToMyOldBlogs = addPhotosToMyOldBlogs;
window.addPhotosToAllOldBlogs = addPhotosToAllOldBlogs;

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

  // Step 1: Extract markdown images BEFORE escaping HTML (to preserve URLs)
  const imagePlaceholders = [];
  let processed = content.replace(
    /!\[([^\]]*)\]\(([^\)]+)\)/g,
    (match, alt, url) => {
      const placeholder = `___IMAGE_PLACEHOLDER_${imagePlaceholders.length}___`;
      imagePlaceholders.push({
        alt: alt,
        url: url.trim() // Trim whitespace from URL
      });
      return placeholder;
    }
  );

  // Step 2: Now escape HTML for security (won't affect image URLs)
  let sanitized = escapeHtml(processed);

  // Step 3: Replace placeholders with actual img tags
  imagePlaceholders.forEach((img, index) => {
    const placeholder = `___IMAGE_PLACEHOLDER_${index}___`;
    const imgTag = `<img src="${img.url}" alt="${escapeHtml(img.alt)}" loading="lazy" crossorigin="anonymous" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 8px; display: block;" onerror="console.error('Failed to load image:', '${img.url}'); this.style.border='2px solid #fcc'; this.style.padding='1rem'; this.alt='⚠️ Image failed to load';">`;
    sanitized = sanitized.replace(placeholder, imgTag);
  });

  // Step 4: Convert line breaks to <br> for better formatting
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

  // Edit blog form submission
  const editBlogForm = document.getElementById('editBlogForm');
  if (editBlogForm) {
    editBlogForm.onsubmit = saveEditedBlog;
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
  const profileModal = document.getElementById('profileModal');
  const editModal = document.getElementById('editModal');

  const closeBtn = document.getElementsByClassName('close')[0];
  const closeReadBtn = document.getElementsByClassName('close-read')[0];
  const closeLoginBtn = document.getElementsByClassName('close-login')[0];
  const closeProfileBtn = document.getElementsByClassName('close-profile')[0];
  const closeEditBtn = document.getElementsByClassName('close-edit')[0];

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

  if (closeProfileBtn) {
    closeProfileBtn.onclick = function() {
      profileModal.style.display = 'none';
    };
  }

  if (closeEditBtn) {
    closeEditBtn.onclick = function() {
      editModal.style.display = 'none';
      currentEditBlogId = null;
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
    if (event.target == profileModal) {
      profileModal.style.display = 'none';
    }
    if (event.target == editModal) {
      editModal.style.display = 'none';
      currentEditBlogId = null;
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

// ============================================================================
// PROFILE PAGE FUNCTIONALITY
// ============================================================================

let currentEditBlogId = null;

// Open user profile
async function openProfile() {
  if (!currentUser) {
    document.getElementById('loginModal').style.display = 'block';
    return;
  }

  try {
    // Update profile header
    document.getElementById('profilePhoto').src = currentUser.photoURL || '';
    document.getElementById('profileName').textContent = currentUser.displayName || 'User';
    document.getElementById('profileEmail').textContent = currentUser.email;

    // Get user's blogs (without orderBy to avoid index requirement)
    const userBlogsQuery = query(
      collection(db, 'blogs'),
      where('authorId', '==', currentUser.uid)
    );

    const querySnapshot = await getDocs(userBlogsQuery);
    const userBlogs = [];

    querySnapshot.forEach((doc) => {
      userBlogs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by createdAt in JavaScript instead
    userBlogs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime; // Descending order (newest first)
    });

    // Calculate stats
    const totalViews = userBlogs.reduce((sum, blog) => sum + (blog.views || 0), 0);
    const totalLikes = userBlogs.reduce((sum, blog) => sum + (blog.likes || 0), 0);

    document.getElementById('userBlogCount').textContent = userBlogs.length;
    document.getElementById('userTotalViews').textContent = formatNumber(totalViews);
    document.getElementById('userTotalLikes').textContent = formatNumber(totalLikes);

    // Display user's blogs
    displayUserBlogs(userBlogs);

    // Show profile modal
    document.getElementById('profileModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Error loading profile: ' + error.message, 'error');
  }
}

// Display user's blogs in profile
function displayUserBlogs(userBlogs) {
  const container = document.getElementById('userBlogsContainer');

  if (userBlogs.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">You haven\'t written any blogs yet. <a href="#" onclick="document.getElementById(\'profileModal\').style.display=\'none\'; document.getElementById(\'blogModal\').style.display=\'block\';" style="color: var(--primary-color);">Write your first blog!</a></p>';
    return;
  }

  container.innerHTML = userBlogs.map(blog => `
    <div class="user-blog-item">
      <div class="user-blog-info">
        <h4>${escapeHtml(blog.title)}</h4>
        <p>${escapeHtml(blog.excerpt)}</p>
        <div class="user-blog-meta">
          <span class="blog-category">${blog.category}</span>
          <span>👁 ${formatNumber(blog.views)} views</span>
          <span>❤ ${formatNumber(blog.likes)} likes</span>
          <span>${formatDate(blog.createdAt)}</span>
        </div>
      </div>
      <div class="user-blog-actions">
        <button class="btn-edit" onclick="editBlog('${blog.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteBlog('${blog.id}', '${escapeHtml(blog.title).replace(/'/g, "\\'")}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Edit blog
async function editBlog(blogId) {
  try {
    const blog = blogs.find(b => b.id === blogId);
    if (!blog) {
      showToast('Blog not found', 'error');
      return;
    }

    // Populate edit form
    document.getElementById('editBlogTitle').value = blog.title;
    document.getElementById('editBlogCategory').value = blog.category;
    document.getElementById('editBlogContent').value = blog.content;

    currentEditBlogId = blogId;

    // Show edit modal
    document.getElementById('editModal').style.display = 'block';
  } catch (error) {
    console.error('Error editing blog:', error);
    showToast('Error loading blog for editing: ' + error.message, 'error');
  }
}

// Save edited blog
async function saveEditedBlog(e) {
  e.preventDefault();

  if (!currentEditBlogId) return;

  try {
    const title = document.getElementById('editBlogTitle').value;
    const category = document.getElementById('editBlogCategory').value;
    const content = document.getElementById('editBlogContent').value;

    // Create new excerpt
    let excerpt = content;
    if (content.length > 150) {
      const firstPart = content.substring(0, 150);
      const imageStartIndex = firstPart.lastIndexOf('![');
      if (imageStartIndex !== -1) {
        const imageEndIndex = content.indexOf(')', imageStartIndex);
        if (imageEndIndex !== -1 && imageEndIndex > 150) {
          excerpt = content.substring(0, imageEndIndex + 1) + '\n...';
        } else {
          excerpt = content.substring(0, 150) + '...';
        }
      } else {
        excerpt = content.substring(0, 150) + '...';
      }
    }

    await updateDoc(doc(db, 'blogs', currentEditBlogId), {
      title: title,
      category: category,
      content: content,
      excerpt: excerpt,
      updatedAt: serverTimestamp()
    });

    showToast('Blog updated successfully!', 'success');
    document.getElementById('editModal').style.display = 'none';

    // Reload blogs and profile
    await loadBlogs();
    await openProfile();
  } catch (error) {
    console.error('Error updating blog:', error);
    showToast('Error updating blog: ' + error.message, 'error');
  }
}

// Delete blog
async function deleteBlog(blogId, blogTitle) {
  if (!confirm(`Are you sure you want to delete "${blogTitle}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'blogs', blogId));
    showToast('Blog deleted successfully!', 'success');

    // Reload blogs and profile
    await loadBlogs();
    await openProfile();
  } catch (error) {
    console.error('Error deleting blog:', error);
    showToast('Error deleting blog: ' + error.message, 'error');
  }
}

// Make functions global for onclick handlers
window.openBlogDetails = openBlogDetails;
window.openProfile = openProfile;
window.editBlog = editBlog;
window.deleteBlog = deleteBlog;
window.likeBlog = likeBlog;
window.shareOnTwitter = shareOnTwitter;
window.shareOnFacebook = shareOnFacebook;
window.shareOnLinkedIn = shareOnLinkedIn;
window.shareOnWhatsApp = shareOnWhatsApp;
window.copyLink = copyLink;
window.bookmarkBlog = bookmarkBlog;
