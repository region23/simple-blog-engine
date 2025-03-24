/**
 * Initialization script for fslightbox
 * Adds lightbox functionality to images in post content
 */
document.addEventListener('DOMContentLoaded', function() {
  // Only proceed if fslightbox is available
  if (typeof window.refreshFsLightbox !== 'function') {
    console.warn('fslightbox not found, skipping lightbox initialization');
    return;
  }
  
  // Target all images within .post-content, including those in figure tags
  const targetedImages = document.querySelectorAll('.post-content img:not(pre img):not(code img)');
  
  // Skip if no images found
  if (targetedImages.length === 0) {
    console.log('No images found in post content');
    return;
  }
  
  console.log(`Found ${targetedImages.length} images to process`);
  
  // For each image in the post content
  targetedImages.forEach((img) => {
    // Skip if image is already wrapped in an a tag with data-fslightbox
    if (img.parentElement.tagName === 'A' && img.parentElement.hasAttribute('data-fslightbox')) {
      return;
    }
    
    // Get the original image URL
    const imageUrl = img.getAttribute('src');
    
    // Create wrapper anchor element
    const wrapper = document.createElement('a');
    wrapper.href = imageUrl;
    wrapper.setAttribute('data-fslightbox', 'post-gallery');
    
    // If image has caption, add it to the wrapper
    if (img.alt) {
      wrapper.setAttribute('data-caption', img.alt);
    }
    
    // Replace image with wrapped version
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  });
  
  // Initialize or refresh fslightbox
  window.refreshFsLightbox();
  
  console.log('Lightbox initialization completed');
}); 