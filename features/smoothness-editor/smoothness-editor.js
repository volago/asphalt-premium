/* ==========================================
   SMOOTHNESS-EDITOR.JS - Smoothness editing UI and save logic
   Asfalt Premium
   ==========================================
   
   Usage (from MapManager.renderFullEditor):
   
     content.innerHTML = `
         <div class="road-info-scrollable">
             ${SmoothnessEditor.render(smoothness)}
         </div>
         ${SmoothnessEditor.renderActions(properties, isAuthenticated)}
     `;
     SmoothnessEditor.init({
         currentSmoothness: smoothness,
         selectedRoads: this.selectedRoads,
         osmApi: this.osmApi,
         oauth: this.oauth,
         onSaveSuccess: ({ updatedIds, newValue }) => { ... }
     });
   ========================================== */

const SmoothnessEditor = (() => {
    // Internal state — tracks what option the user has selected
    let _selectedValue = null;

    /* ─────────────────────────────────────────
       PUBLIC API
    ───────────────────────────────────────── */

    /**
     * Build the smoothness options gallery HTML.
     * @param {string|null} currentSmoothness - Currently set smoothness value
     * @returns {string} HTML string
     */
    function render(currentSmoothness) {
        const mainOptions = CONFIG.SMOOTHNESS_OPTIONS.filter(opt =>
            ['excellent', 'good', 'intermediate', 'bad', 'very_bad'].includes(opt.value)
        );

        let html = `
            <div class="smoothness-editor">
                <h4>
                    <i class="fas fa-edit"></i>
                    Edycja jakości nawierzchni
                </h4>
                <div class="smoothness-editor-info">
                    Wybierz jakość nawierzchni tej drogi. Twoja ocena zostanie zapisana w OpenStreetMap.
                </div>
        `;

        html += '<div class="smoothness-gallery">';
        for (const option of mainOptions) {
            const selected = option.value === currentSmoothness ? 'selected' : '';
            const imagePath = `assets/smoothness/${option.image}`;

            let qualityClass = 'unknown';
            if (option.value === 'excellent') qualityClass = 'excellent';
            else if (option.value === 'good') qualityClass = 'good';
            else if (['intermediate', 'bad', 'very_bad'].includes(option.value)) qualityClass = 'poor';

            html += `
                <div class="smoothness-option ${selected}" data-value="${option.value}">
                    <div class="smoothness-option-image">
                        <img src="${imagePath}" alt="${option.label}"
                             onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i> ${option.labelEn}'">
                    </div>
                    <div class="smoothness-option-content">
                        <div class="smoothness-option-label-wrapper">
                            <div class="smoothness-option-label">${option.label}</div>
                            <div class="smoothness-option-line ${qualityClass}"></div>
                        </div>
                        <div class="smoothness-option-description">${option.description}</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        html += '</div>';

        return html;
    }

    /**
     * Build the bottom actions bar HTML (Save + OSM link).
     * @param {Object} properties  - Road properties (osm_id, firstOsmId, smoothness, isMulti)
     * @param {boolean} isAuthenticated
     * @returns {string} HTML string
     */
    function renderActions(properties, isAuthenticated) {
        const disabledAttr  = !isAuthenticated ? 'disabled' : '';
        const tooltipAttr   = !isAuthenticated ? 'title="Zaloguj się do OSM, aby zapisać zmiany"' : '';
        const osmEditId     = properties.firstOsmId || properties.osm_id;

        return `
            <div class="road-info-bottom-actions">
                <button class="btn-save-smoothness" id="save-smoothness-btn" ${disabledAttr} ${tooltipAttr}>
                    <i class="fas fa-save"></i>
                    Zapisz
                </button>
                <a href="https://www.openstreetmap.org/edit?way=${osmEditId}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn-edit-osm-compact"
                   title="Edytuj w edytorze OSM">
                    <i class="fas fa-external-link-alt"></i>
                    OSM
                </a>
            </div>
        `;
    }

    /**
     * Bind event handlers for the smoothness editor.
     * Must be called after render() + renderActions() HTML is in DOM.
     *
     * @param {Object} opts
     * @param {string|null}  opts.currentSmoothness - Initial value (pre-selects matching option)
     * @param {Array}        opts.selectedRoads     - Array of selected road objects from MapManager
     * @param {Object}       opts.osmApi            - OSMAPIClient instance
     * @param {Object}       opts.oauth             - OSMOAuth instance
     * @param {Function}     opts.onSaveSuccess     - Called with { updatedIds, newValue } after save
     */
    function init({ currentSmoothness, selectedRoads, osmApi, oauth, onSaveSuccess }) {
        _selectedValue = currentSmoothness || null;

        // Option click → update _selectedValue + toggle Save button
        const options = document.querySelectorAll('.smoothness-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                _selectedValue = option.dataset.value;

                const saveBtn = document.getElementById('save-smoothness-btn');
                if (saveBtn) {
                    const authed = oauth && oauth.isAuthenticated();
                    saveBtn.disabled = !authed;
                    saveBtn.title = authed ? '' : 'Zaloguj się do OSM, aby zapisać zmiany';
                }
            });
        });

        // Save button → run save flow
        const saveBtn = document.getElementById('save-smoothness-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                _doSave({ selectedRoads, osmApi, onSaveSuccess });
            });
        }
    }

    /**
     * Get a human-readable Polish label for a smoothness value.
     * @param {string} smoothness
     * @returns {string}
     */
    function getLabel(smoothness) {
        const option = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === smoothness);
        return option ? `${option.label} (${smoothness})` : smoothness;
    }

    /**
     * Pure function: split selected roads into those needing an update
     * and those already having the desired smoothness value.
     *
     * @param {Array}  selectedRoads - MapManager's selectedRoads array
     * @param {string} newSmoothness - Value chosen by the user
     * @returns {{ toUpdate: Array<{id, oldValue}>, unchangedIds: Array }}
     */
    function filterRoadsToUpdate(selectedRoads, newSmoothness) {
        const unchangedIds = [];
        const toUpdate = [];

        selectedRoads.forEach(road => {
            const props = road.feature.properties;
            if (props.smoothness === newSmoothness) {
                unchangedIds.push(props.osm_id);
            } else {
                toUpdate.push({ id: props.osm_id, oldValue: props.smoothness });
            }
        });

        return { toUpdate, unchangedIds };
    }

    /* ─────────────────────────────────────────
       PRIVATE
    ───────────────────────────────────────── */

    async function _doSave({ selectedRoads, osmApi, onSaveSuccess }) {
        if (!_selectedValue) {
            Toast.show('Proszę wybrać jakość nawierzchni', 'warning');
            return;
        }

        const isMulti = selectedRoads.length > 1;
        const { toUpdate, unchangedIds } = filterRoadsToUpdate(selectedRoads, _selectedValue);

        if (toUpdate.length === 0) {
            Toast.show('Wybrano tę samą wartość dla wszystkich zaznaczonych odcinków. Nie ma zmian do zapisania.', 'info');
            return;
        }

        // Determine display old value for the confirmation dialog
        const firstUpdate = toUpdate[0];
        let displayOldValue = firstUpdate.oldValue || 'brak danych';
        for (let i = 1; i < toUpdate.length; i++) {
            if (toUpdate[i].oldValue !== firstUpdate.oldValue) {
                displayOldValue = 'Różne wartości dla zaznaczonych dróg';
                break;
            }
        }

        const confirmed = await ConfirmationModal.show({
            wayId:        isMulti ? `Wiele odcinków (${toUpdate.length})` : toUpdate[0].id,
            oldValue:     displayOldValue,
            newValue:     _selectedValue,
            skippedCount: unchangedIds.length
        });

        if (!confirmed) return;

        const saveBtn = document.getElementById('save-smoothness-btn');
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<div class="btn-spinner"></div>Zapisywanie...';
            }

            const wayIds = toUpdate.map(u => u.id);
            const result = await osmApi.updateSmoothness(wayIds, _selectedValue);

            console.log('Smoothness updated successfully:', result);
            Toast.show(
                `✓ Jakość nawierzchni zaktualizowana! Changeset: ${result.changesetId}`,
                'success',
                6000
            );

            onSaveSuccess({ updatedIds: wayIds, newValue: _selectedValue });

        } catch (error) {
            console.error('Failed to save smoothness:', error);
            Toast.show(`Błąd podczas zapisywania: ${error.message}`, 'error', 6000);

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i>Zapisz';
            }
        }
    }

    /* ─────────────────────────────────────────
       EXPORT
    ───────────────────────────────────────── */
    return { render, renderActions, init, getLabel, filterRoadsToUpdate };
})();

// CommonJS export for unit tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmoothnessEditor };
}
