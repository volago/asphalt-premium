/**
 * Global Toast Notification class
 */
class Toast {
    /**
     * Show a toast notification (replaces alert())
     * @param {string} message - Message to display
     * @param {'success'|'error'|'warning'|'info'} type - Toast type
     * @param {number} duration - Duration in ms (default 4000)
     */
    static show(message, type = 'info', duration = 4000) {
        // Remove existing toasts of same type
        document.querySelectorAll(`.toast.toast-${type}`).forEach(el => el.remove());

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Zamknij">×</button>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };

        toast.addEventListener('click', dismiss);
        const timerId = setTimeout(dismiss, duration);
        toast.addEventListener('click', () => clearTimeout(timerId));
    }
}
