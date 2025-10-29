// Profile Page Logic with Firebase Integration
import {
  auth, db,
  onAuthStateChanged,
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp
} from './firebase-config.js';

// Global state
let currentUser = null;
let currentEditBlogId = null;
let userBlogs = [];

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
  initializeAuth();
  setupEventListeners();
});

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
      loadUserProfile();
    } else {
      // Redirect to home if not signed in
      showToast('Please sign in to view your profile', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  });
}

// ============================================================================
// PROFILE LOADING
// ============================================================================

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    // Update profile header
    document.getElementById('profilePhoto').src = currentUser.photoURL || 'https://via.placeholder.com/120';
    document.getElementById('profileName').textContent = currentUser.displayName || 'User';
    document.getElementById('profileEmail').textContent = currentUser.email;

    // Update navbar button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.textContent = currentUser.displayName || currentUser.email.split('@')[0];
      loginBtn.onclick = () => window.location.href = 'profile.html';
    }

    // Get user's blogs (without orderBy to avoid index requirement)
    const userBlogsQuery = query(
      collection(db, 'blogs'),
      where('authorId', '==', currentUser.uid)
    );

    const querySnapshot = await getDocs(userBlogsQuery);
    userBlogs = [];

    querySnapshot.forEach((doc) => {
      userBlogs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by createdAt in JavaScript
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
    displayUserBlogs();
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Error loading profile: ' + error.message, 'error');
  }
}

// ============================================================================
// DISPLAY BLOGS
// ============================================================================

function displayUserBlogs() {
  const container = document.getElementById('userBlogsContainer');

  if (userBlogs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p class="empty-state-text">You haven't written any blogs yet</p>
        <a href="index.html#write" class="btn-primary">Write Your First Blog</a>
      </div>
    `;
    return;
  }

  container.innerHTML = userBlogs.map(blog => {
    const excerpt = blog.excerpt ? escapeHtml(blog.excerpt).substring(0, 200) : '';
    return `
      <div class="blog-list-item">
        <div class="blog-item-header">
          <div style="flex: 1;">
            <h3 class="blog-item-title">${escapeHtml(blog.title)}</h3>
            <div class="blog-item-meta">
              <span class="blog-category">${escapeHtml(blog.category)}</span>
              <span>👁 ${formatNumber(blog.views || 0)} views</span>
              <span>❤ ${formatNumber(blog.likes || 0)} likes</span>
              <span>📅 ${formatDate(blog.createdAt)}</span>
            </div>
          </div>
        </div>
        <p class="blog-item-excerpt">${excerpt}...</p>
        <div class="blog-item-actions">
          <button class="btn-view" onclick="window.location.href='index.html#blog-${blog.id}'">View Blog</button>
          <button class="btn-edit" onclick="editBlog('${blog.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteBlog('${blog.id}', '${escapeHtml(blog.title).replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// EDIT BLOG
// ============================================================================

async function editBlog(blogId) {
  try {
    const blog = userBlogs.find(b => b.id === blogId);
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

    // Create new excerpt with smart truncation
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

    // Reload profile
    await loadUserProfile();
  } catch (error) {
    console.error('Error updating blog:', error);
    showToast('Error updating blog: ' + error.message, 'error');
  }
}

// ============================================================================
// DELETE BLOG
// ============================================================================

async function deleteBlog(blogId, blogTitle) {
  if (!confirm(`Are you sure you want to delete "${blogTitle}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'blogs', blogId));
    showToast('Blog deleted successfully!', 'success');

    // Reload profile
    await loadUserProfile();
  } catch (error) {
    console.error('Error deleting blog:', error);
    showToast('Error deleting blog: ' + error.message, 'error');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Write button
  const writeBtn = document.getElementById('writeBtn');
  if (writeBtn) {
    writeBtn.onclick = () => window.location.href = 'index.html#write';
  }

  // Edit form submission
  const editBlogForm = document.getElementById('editBlogForm');
  if (editBlogForm) {
    editBlogForm.onsubmit = saveEditedBlog;
  }

  // Modal close button
  const closeEditBtn = document.getElementsByClassName('close-edit')[0];
  if (closeEditBtn) {
    closeEditBtn.onclick = function() {
      document.getElementById('editModal').style.display = 'none';
      currentEditBlogId = null;
    };
  }

  // Close modal when clicking outside
  const editModal = document.getElementById('editModal');
  window.onclick = function(event) {
    if (event.target == editModal) {
      editModal.style.display = 'none';
      currentEditBlogId = null;
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

// Make functions global for onclick handlers
window.editBlog = editBlog;
window.deleteBlog = deleteBlog;
