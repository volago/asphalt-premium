/* ==========================================
   IMAGE MODAL - Image Zoom Functionality
   Asphalt Premium
   ========================================== */

class ImageModal {
    constructor() {
        this.modal = null;
        this.modalImg = null;
        this.modalCaption = null;
        this.closeBtn = null;
        
        this.init();
    }
    
    init() {
        // Get modal elements
        this.modal = document.getElementById('imageModal');
        this.modalImg = document.getElementById('modalImage');
        this.modalCaption = document.getElementById('modalCaption');
        this.closeBtn = document.querySelector('.image-modal-close');
        
        if (!this.modal || !this.modalImg || !this.closeBtn) {
            console.warn('Image modal elements not found');
            return;
        }
        
        this.bindEvents();
        console.log('Image modal initialized');
    }
    
    bindEvents() {
        // Add click event to all clickable images
        document.addEventListener('click', (e) => {
            const clickableImage = e.target.closest('.clickable-image');
            if (clickableImage) {
                const img = clickableImage.querySelector('img');
                if (img && !img.parentElement.classList.contains('image-placeholder')) {
                    this.openModal(img);
                }
            }
        });
        
        // Close modal when clicking X
        this.closeBtn.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close modal when clicking outside the image
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeModal();
            }
        });
    }
    
    openModal(img) {
        if (!this.modal || !this.modalImg) return;
        
        this.modal.style.display = 'block';
        this.modalImg.src = img.src;
        
        if (this.modalCaption) {
            this.modalCaption.textContent = img.alt || '';
        }
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

/* ==========================================
   INITIALIZE IMAGE MODAL
   ========================================== */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the image modal
    window.imageModal = new ImageModal();
});

