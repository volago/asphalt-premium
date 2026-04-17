/* ==========================================
   CONFIRMATION MODAL - JS Module
   Asfalt Premium
   ========================================== */

/**
 * ConfirmationModal — reusable confirmation dialog
 *
 * Usage:
 *   const confirmed = await ConfirmationModal.show({ wayId, oldValue, newValue, skippedCount });
 */
const ConfirmationModal = {

    /**
     * Show the confirmation dialog and return a Promise<boolean>.
     *
     * @param {Object} options
     * @param {string|number} options.wayId       - Road ID or label (e.g. "Wiele odcinków (3)")
     * @param {string}        options.oldValue    - Previous smoothness value (or 'brak danych')
     * @param {string}        options.newValue    - New smoothness value to save
     * @param {number}        [options.skippedCount=0] - Number of roads skipped (already have that value)
     * @returns {Promise<boolean>} Resolves true if user confirmed, false otherwise
     */
    show({ wayId, oldValue, newValue, skippedCount = 0 }) {
        return new Promise((resolve) => {
            const modal     = document.getElementById('confirmationModal');
            const title     = document.getElementById('confirmationModalTitle');
            const body      = document.getElementById('confirmationModalBody');
            const confirmBtn = document.getElementById('confirmationModalConfirm');
            const cancelBtn  = document.getElementById('confirmationModalCancel');
            const closeBtn   = document.getElementById('confirmationModalClose');

            if (!modal) {
                resolve(false);
                return;
            }

            // Set title
            title.textContent = 'Potwierdź zapisanie zmian';

            // Build body content
            body.innerHTML = this._buildBodyHTML(wayId, oldValue, newValue, skippedCount);

            // Show modal
            modal.style.display = 'flex';

            // Event handlers
            const handleConfirm = () => { cleanup(); resolve(true); };
            const handleCancel  = () => { cleanup(); resolve(false); };

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
        });
    },

    /**
     * Build the HTML body for the confirmation dialog.
     * @private
     */
    _buildBodyHTML(wayId, oldValue, newValue, skippedCount) {
        const oldOption = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === oldValue);
        const newOption = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === newValue);

        let html = '<p>Czy na pewno chcesz zapisać następujące zmiany w OpenStreetMap?</p>';

        html += '<div class="info-grid">';
        html += `<strong>ID drogi:</strong><span>${wayId}</span>`;
        html += `<strong>Nowa wartość:</strong><span>${newOption ? newOption.label : newValue} (${newValue})</span>`;

        if (oldValue === 'brak danych') {
            html += `<strong>Poprzednia wartość:</strong><span>Brak przypisanej wartości</span>`;
        } else if (oldValue === 'Różne wartości dla zaznaczonych dróg') {
            html += `<strong>Poprzednia wartość:</strong><span>Różne wartości dla zaznaczonych dróg</span>`;
        } else if (oldValue) {
            html += `<strong>Poprzednia wartość:</strong><span>${oldOption ? oldOption.label : oldValue} (${oldValue})</span>`;
        }
        html += '</div>';

        if (oldValue && oldValue !== 'brak danych') {
            const warningMsg = oldValue === 'Różne wartości dla zaznaczonych dróg'
                ? 'Zaznaczone drogi mają już przypisaną przynajmniej jedną wartość jakości nawierzchni.'
                : 'Ta droga już ma przypisaną jakość nawierzchni.';

            html += `
                <div class="warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Uwaga:</strong> ${warningMsg}
                    Nowa wartość nadpisze obecną.
                </div>
            `;
        }

        if (skippedCount > 0) {
            const noun = skippedCount === 1
                ? 'odcinek został pominięty, bo już ma'
                : skippedCount < 5
                    ? 'odcinki zostały pominięte, bo już mają'
                    : 'odcinków zostało pominiętych, bo już ma';

            html += `
                <div class="info-note">
                    <i class="fas fa-info-circle"></i>
                    <strong>${skippedCount}</strong> ${noun} wybraną wartość.
                </div>
            `;
        }

        html += '<p>Zmiana zostanie natychmiast zapisana w bazie OpenStreetMap.</p>';

        return html;
    }
};
