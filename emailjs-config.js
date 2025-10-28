// EmailJS Configuration - 100% FREE, Works Worldwide
// Get your credentials from: https://www.emailjs.com

const EMAILJS_PUBLIC_KEY = "F3KxHQiQ0gckIWRkR";
const EMAILJS_SERVICE_ID = "service_fyiauwy";
const EMAILJS_TEMPLATE_ID = "template_176cyf8";

// Initialize EmailJS
(function () {
  // Load EmailJS SDK
  const script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
  script.onload = function () {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log("✅ EmailJS initialized");
  };
  document.head.appendChild(script);
})();

// Send welcome email when user signs up
function sendWelcomeEmail(userEmail, userName) {
  const templateParams = {
    to_email: userEmail,
    to_name: userName,
    from_name: "BlogShare Team",
    message: "Welcome to BlogShare! Start sharing your stories with the world.",
  };

  return emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then((response) => {
      console.log(
        "✅ Email sent successfully:",
        response.status,
        response.text
      );
      return response;
    })
    .catch((error) => {
      console.error("❌ Email send failed:", error);
      throw error;
    });
}

// Send notification when new blog is published
function sendNewBlogNotification(blogData) {
  const templateParams = {
    blog_title: blogData.title,
    author_name: blogData.author,
    category: blogData.category,
    blog_url: window.location.origin + "/#blog-" + blogData.id,
    to_email: "your-email@example.com", // Replace with admin email
  };

  return emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then((response) => {
      console.log("✅ Blog notification sent:", response.status);
      return response;
    })
    .catch((error) => {
      console.error("❌ Notification failed:", error);
      // Don't throw - email is not critical
      return null;
    });
}

// Send email to blog author when someone comments (future feature)
function sendCommentNotification(authorEmail, blogTitle, commenterName) {
  const templateParams = {
    to_email: authorEmail,
    blog_title: blogTitle,
    commenter_name: commenterName,
    message: `${commenterName} commented on your blog "${blogTitle}"`,
  };

  return emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then((response) => {
      console.log("✅ Comment notification sent");
      return response;
    })
    .catch((error) => {
      console.error("❌ Comment notification failed:", error);
      return null;
    });
}

// Export functions for use in other files
window.EmailService = {
  sendWelcomeEmail,
  sendNewBlogNotification,
  sendCommentNotification,
};

console.log("📧 Email service loaded");
