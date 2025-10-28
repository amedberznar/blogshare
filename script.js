// Blog data storage with localStorage persistence
let blogs = JSON.parse(localStorage.getItem('blogShareBlogs')) || [
    {
        id: 1,
        title: "Getting Started with Web Development in 2025",
        author: "Sarah Johnson",
        category: "Technology",
        content: "Web development is an exciting field that combines creativity with technical skills. Whether you're building your first website or developing complex web applications, understanding the fundamentals is crucial.\n\nHTML, CSS, and JavaScript form the foundation of web development. HTML provides structure, CSS handles styling, and JavaScript adds interactivity. Together, these three technologies enable you to create engaging and functional websites.\n\nStarting your journey in web development can seem overwhelming, but breaking it down into manageable steps makes it accessible to everyone. Begin with HTML and CSS, then gradually incorporate JavaScript as you become more comfortable.\n\nThe web development landscape in 2025 offers incredible frameworks and tools like React, Vue, and Next.js that make building modern applications faster and more enjoyable.",
        date: "2025-10-25",
        excerpt: "Web development is an exciting field that combines creativity with technical skills. Whether you're building your first website...",
        views: 1247,
        likes: 89,
        shares: 34
    },
    {
        id: 2,
        title: "10 Must-Visit Destinations in 2025",
        author: "Michael Chen",
        category: "Travel",
        content: "Travel opens up new perspectives and creates unforgettable memories. As we navigate through 2025, there are incredible destinations waiting to be explored.\n\nFrom the historic streets of Rome to the pristine beaches of Bali, each destination offers unique experiences. Whether you're seeking adventure, relaxation, or cultural immersion, the world has something for everyone.\n\nPlanning your next trip? Consider factors like weather, local festivals, and seasonal attractions. Traveling during shoulder seasons often provides the best balance of good weather and fewer crowds.\n\nSome top picks include Iceland for the Northern Lights, Japan for cherry blossom season, Peru for Machu Picchu, and Morocco for vibrant markets and desert adventures.",
        date: "2025-10-24",
        excerpt: "Travel opens up new perspectives and creates unforgettable memories. As we navigate through 2025, there are incredible destinations...",
        views: 2103,
        likes: 156,
        shares: 78
    },
    {
        id: 3,
        title: "The Art of Mindful Living",
        author: "Emma Williams",
        category: "Lifestyle",
        content: "In our fast-paced world, mindfulness has become more important than ever. Taking time to be present and aware can significantly improve our quality of life.\n\nMindfulness isn't just about meditation; it's about bringing awareness to every aspect of your daily routine. From eating meals without distractions to truly listening during conversations, small changes can make a big difference.\n\nStart with just five minutes a day. Find a quiet space, focus on your breath, and observe your thoughts without judgment. As you practice regularly, you'll notice increased clarity, reduced stress, and greater appreciation for life's simple moments.\n\nIncorporate mindfulness into daily activities: mindful walking, eating, working, and even cleaning can become meditative practices.",
        date: "2025-10-23",
        excerpt: "In our fast-paced world, mindfulness has become more important than ever. Taking time to be present and aware can significantly...",
        views: 1876,
        likes: 134,
        shares: 56
    },
    {
        id: 4,
        title: "AI and the Future of Work",
        author: "David Rodriguez",
        category: "Technology",
        content: "Artificial Intelligence is transforming how we work, creating new opportunities while challenging traditional job roles. Understanding this shift is crucial for staying relevant in the modern workforce.\n\nAI tools like ChatGPT, Claude, and others are augmenting human capabilities, automating repetitive tasks, and enabling us to focus on creative and strategic work. Rather than replacing humans, AI is becoming a powerful collaborator.\n\nThe key to thriving in this new era is adaptability. Learn to work alongside AI tools, understand their strengths and limitations, and focus on developing uniquely human skills like creativity, emotional intelligence, and complex problem-solving.\n\nIndustries from healthcare to finance, education to entertainment are being revolutionized by AI. The future belongs to those who embrace change and continuously learn.",
        date: "2025-10-22",
        excerpt: "Artificial Intelligence is transforming how we work, creating new opportunities while challenging traditional job roles...",
        views: 3421,
        likes: 267,
        shares: 143
    },
    {
        id: 5,
        title: "Healthy Eating on a Budget",
        author: "Lisa Martinez",
        category: "Food",
        content: "Eating healthy doesn't have to break the bank. With smart planning and strategic shopping, you can nourish your body while staying within budget.\n\nStart by meal planning for the week. This prevents impulse purchases and reduces food waste. Buy seasonal produce, which is often cheaper and fresher. Consider frozen fruits and vegetables – they're just as nutritious and last longer.\n\nBatch cooking is your friend. Prepare large portions of staples like rice, beans, and grains. They're inexpensive, versatile, and can be used in multiple meals throughout the week.\n\nShop at farmer's markets near closing time for discounts, buy store brands, and don't underestimate the power of simple ingredients. Some of the healthiest meals are also the most affordable.",
        date: "2025-10-21",
        excerpt: "Eating healthy doesn't have to break the bank. With smart planning and strategic shopping, you can nourish your body...",
        views: 1654,
        likes: 98,
        shares: 41
    },
    {
        id: 6,
        title: "Building a Successful Startup in 2025",
        author: "James Anderson",
        category: "Business",
        content: "Starting a business in 2025 presents unique challenges and opportunities. The digital landscape has leveled the playing field, allowing entrepreneurs to reach global audiences with minimal investment.\n\nFirst, validate your idea. Don't spend months building something nobody wants. Talk to potential customers, create MVPs (Minimum Viable Products), and iterate based on feedback.\n\nFocus on solving real problems. The best businesses address genuine pain points. Your solution doesn't need to be revolutionary – it just needs to be significantly better than existing alternatives.\n\nLeverage modern tools: no-code platforms, AI assistants, social media marketing, and cloud infrastructure make starting a business more accessible than ever. Bootstrap when possible, and only seek funding when you have clear traction.\n\nRemember: overnight success usually takes years. Stay persistent, adapt quickly, and keep learning.",
        date: "2025-10-20",
        excerpt: "Starting a business in 2025 presents unique challenges and opportunities. The digital landscape has leveled the playing field...",
        views: 2987,
        likes: 201,
        shares: 112
    }
];

let currentBlogId = null;
let currentFilter = 'all';

// Save blogs to localStorage
function saveBlogs() {
    localStorage.setItem('blogShareBlogs', JSON.stringify(blogs));
}

// Get next ID for new blogs
function getNextId() {
    return blogs.length > 0 ? Math.max(...blogs.map(b => b.id)) + 1 : 1;
}

// Display all blogs with filter
function displayBlogs(filter = 'all') {
    const blogsContainer = document.getElementById('blogsContainer');
    let filteredBlogs = filter === 'all' ? blogs : blogs.filter(b => b.category === filter);

    if (filteredBlogs.length === 0) {
        blogsContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No blogs found. Be the first to write one!</p>';
        return;
    }

    blogsContainer.innerHTML = filteredBlogs.map(blog => `
        <div class="blog-card" onclick="openBlogDetails(${blog.id})">
            <h3>${escapeHtml(blog.title)}</h3>
            <div class="blog-meta">
                <span class="blog-category">${blog.category}</span>
                <span class="blog-date">${formatDate(blog.date)}</span>
            </div>
            <p class="blog-excerpt">${escapeHtml(blog.excerpt)}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <span style="color: #999; font-size: 0.9rem;">By ${escapeHtml(blog.author)}</span>
                <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: #999;">
                    <span>👁 ${formatNumber(blog.views)}</span>
                    <span>❤ ${formatNumber(blog.likes)}</span>
                </div>
            </div>
            <a href="#" class="read-more" onclick="event.stopPropagation(); openBlogDetails(${blog.id})">Read More →</a>
        </div>
    `).join('');
}

// Display trending blogs (top by views and likes)
function displayTrendingBlogs() {
    const trendingContainer = document.getElementById('trendingContainer');
    const trendingBlogs = [...blogs]
        .sort((a, b) => (b.views + b.likes * 10) - (a.views + a.likes * 10))
        .slice(0, 3);

    if (trendingBlogs.length === 0) {
        trendingContainer.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">No trending blogs yet.</p>';
        return;
    }

    trendingContainer.innerHTML = trendingBlogs.map(blog => `
        <div class="blog-card" onclick="openBlogDetails(${blog.id})" style="border: 2px solid #ffd700;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.75rem; font-weight: bold;">🔥 TRENDING</span>
            </div>
            <h3>${escapeHtml(blog.title)}</h3>
            <div class="blog-meta">
                <span class="blog-category">${blog.category}</span>
                <span class="blog-date">${formatDate(blog.date)}</span>
            </div>
            <p class="blog-excerpt">${escapeHtml(blog.excerpt)}</p>
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

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format numbers (e.g., 1200 -> 1.2K)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open blog details modal
function openBlogDetails(blogId) {
    const blog = blogs.find(b => b.id === blogId);
    if (!blog) return;

    currentBlogId = blogId;

    // Increment views
    blog.views++;
    saveBlogs();

    const blogDetails = document.getElementById('blogDetails');
    blogDetails.innerHTML = `
        <h2>${escapeHtml(blog.title)}</h2>
        <div class="blog-meta">
            <span class="blog-category">${blog.category}</span>
            <span style="margin: 0 1rem;">By ${escapeHtml(blog.author)}</span>
            <span class="blog-date">${formatDate(blog.date)}</span>
        </div>
        <div style="display: flex; gap: 2rem; margin: 1rem 0; color: #999; font-size: 0.9rem;">
            <span>👁 ${formatNumber(blog.views)} views</span>
            <span>❤ ${formatNumber(blog.likes)} likes</span>
            <span>📤 ${formatNumber(blog.shares)} shares</span>
        </div>
        <div class="blog-content">${escapeHtml(blog.content)}</div>
    `;

    // Update like count
    document.getElementById('likeCount').textContent = blog.likes;

    document.getElementById('readModal').style.display = 'block';
}

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        displayBlogs(currentFilter);
    });
});

// Social sharing functions
function shareOnTwitter() {
    const blog = blogs.find(b => b.id === currentBlogId);
    if (!blog) return;

    const text = `Check out this blog: "${blog.title}" by ${blog.author}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');

    incrementShares();
}

function shareOnFacebook() {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    incrementShares();
}

function shareOnLinkedIn() {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    incrementShares();
}

function shareOnWhatsApp() {
    const blog = blogs.find(b => b.id === currentBlogId);
    if (!blog) return;

    const text = `Check out this blog: "${blog.title}" by ${blog.author} - ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    incrementShares();
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
        incrementShares();
    });
}

function incrementShares() {
    const blog = blogs.find(b => b.id === currentBlogId);
    if (blog) {
        blog.shares++;
        saveBlogs();
        openBlogDetails(currentBlogId); // Refresh to show updated count
    }
}

// Like functionality
function likeBlog() {
    const blog = blogs.find(b => b.id === currentBlogId);
    if (!blog) return;

    blog.likes++;
    saveBlogs();

    document.getElementById('likeCount').textContent = blog.likes;
    document.getElementById('likeIcon').textContent = '❤';

    // Refresh displays
    displayBlogs(currentFilter);
    displayTrendingBlogs();
}

// Bookmark functionality
function bookmarkBlog() {
    alert('Blog bookmarked! (In a full version, this would save to your profile)');
}

// Modal functionality
const modal = document.getElementById('blogModal');
const readModal = document.getElementById('readModal');
const loginModal = document.getElementById('loginModal');
const writeBtn = document.getElementById('writeBtn');
const loginBtn = document.getElementById('loginBtn');
const closeBtn = document.getElementsByClassName('close')[0];
const closeReadBtn = document.getElementsByClassName('close-read')[0];
const closeLoginBtn = document.getElementsByClassName('close-login')[0];
const blogForm = document.getElementById('blogForm');
const loginForm = document.getElementById('loginForm');

// Open write modal
writeBtn.onclick = function() {
    modal.style.display = 'block';
}

// Open login modal
loginBtn.onclick = function() {
    loginModal.style.display = 'block';
}

// Close modals
closeBtn.onclick = function() {
    modal.style.display = 'none';
    blogForm.reset();
}

closeReadBtn.onclick = function() {
    readModal.style.display = 'none';
    currentBlogId = null;
}

closeLoginBtn.onclick = function() {
    loginModal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        blogForm.reset();
    }
    if (event.target == readModal) {
        readModal.style.display = 'none';
        currentBlogId = null;
    }
    if (event.target == loginModal) {
        loginModal.style.display = 'none';
    }
}

// Handle blog form submission
blogForm.onsubmit = function(e) {
    e.preventDefault();

    const title = document.getElementById('blogTitle').value;
    const author = document.getElementById('blogAuthor').value;
    const category = document.getElementById('blogCategory').value;
    const content = document.getElementById('blogContent').value;

    // Create excerpt (first 100 characters)
    const excerpt = content.substring(0, 100) + '...';

    // Create new blog object
    const newBlog = {
        id: getNextId(),
        title: title,
        author: author,
        category: category,
        content: content,
        date: new Date().toISOString().split('T')[0],
        excerpt: excerpt,
        views: 0,
        likes: 0,
        shares: 0
    };

    // Add to blogs array
    blogs.unshift(newBlog); // Add to beginning
    saveBlogs();

    // Update display
    displayBlogs(currentFilter);
    displayTrendingBlogs();

    // Close modal and reset form
    modal.style.display = 'none';
    blogForm.reset();

    // Scroll to blogs section
    document.getElementById('blogs').scrollIntoView({ behavior: 'smooth' });

    // Show success message
    alert('🎉 Blog published successfully! Share it with your friends to get more views!');
}

// Handle login form submission
loginForm.onsubmit = function(e) {
    e.preventDefault();
    alert('Login functionality would be implemented with a backend service (Firebase, Auth0, etc.)');
    loginModal.style.display = 'none';
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Update stats dynamically
function updateStats() {
    document.getElementById('blogCount').textContent = formatNumber(blogs.length) + '+';
    const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);
    document.getElementById('readerCount').textContent = formatNumber(totalViews) + '+';
}

// Analytics tracking (placeholder)
function trackEvent(eventName, eventData) {
    // In production, this would send to Google Analytics, Mixpanel, etc.
    console.log('Event tracked:', eventName, eventData);
}

// Track page view
trackEvent('page_view', { page: 'home' });

// Initial display
displayBlogs();
displayTrendingBlogs();
updateStats();

// Auto-refresh trending every 30 seconds (simulates live updates)
setInterval(() => {
    displayTrendingBlogs();
}, 30000);
