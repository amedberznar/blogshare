// ImgBB Image Upload - 100% FREE, Works Worldwide
// Get your API key from: https://api.imgbb.com

const IMGBB_API_KEY = "e1de1c98419dd176c619d66015b968c4"; // Replace with your actual API key

// Add image upload button to blog form
function addImageUploadToBlogForm() {
  const contentField = document.getElementById("blogContent");
  if (!contentField) return;

  // Check if button already exists
  if (document.getElementById("imgUploadBtn")) return;

  // Create upload button
  const uploadBtn = document.createElement("button");
  uploadBtn.id = "imgUploadBtn";
  uploadBtn.type = "button";
  uploadBtn.className = "btn-secondary";
  uploadBtn.textContent = "📷 Upload Image";
  uploadBtn.style.marginTop = "10px";
  uploadBtn.style.marginRight = "10px";

  uploadBtn.onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (max 32MB for ImgBB)
      if (file.size > 32 * 1024 * 1024) {
        alert("Image too large! Maximum size is 32MB.");
        return;
      }

      // Show loading
      uploadBtn.textContent = "⏳ Uploading...";
      uploadBtn.disabled = true;

      try {
        const imageUrl = await uploadImageToImgBB(file);

        // Insert image markdown in textarea
        const textarea = document.getElementById("blogContent");
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);

        textarea.value = textBefore + `\n![Image](${imageUrl})\n` + textAfter;

        alert("✅ Image uploaded successfully!");
      } catch (error) {
        console.error("Upload error:", error);
        alert("❌ Error uploading image: " + error.message);
      } finally {
        uploadBtn.textContent = "📷 Upload Image";
        uploadBtn.disabled = false;
      }
    };

    input.click();
  };

  // Add button after textarea
  contentField.parentNode.appendChild(uploadBtn);
}

// Upload to ImgBB
async function uploadImageToImgBB(file) {
  // Convert file to base64
  const base64 = await fileToBase64(file);

  // Remove data URL prefix
  const base64Data = base64.split(",")[1];

  // Create form data
  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", base64Data);

  // Upload
  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed: " + response.statusText);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      "Upload failed: " + (data.error.message || "Unknown error")
    );
  }

  // Return direct image URL
  return data.data.url;
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addImageUploadToBlogForm);
} else {
  addImageUploadToBlogForm();
}
