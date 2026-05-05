/* ==========================================
   SURFACE-EDITOR.JS - Surface type editing UI and save logic
   Asfalt Premium
   ==========================================
   
   Usage (from MapManager.renderFullEditor when road has no surface):
   
     content.innerHTML = `
         <div class="road-info-scrollable">
             ${SurfaceEditor.render(surface)}
         </div>
         ${SurfaceEditor.renderActions(properties, isAuthenticated)}
     `;
     SurfaceEditor.init({
         currentSurface: surface,
         selectedRoads: this.selectedRoads,
         osmApi: this.osmApi,
         oauth: this.oauth,
         onSaveSuccess: ({ updatedIds, newValue }) => { ... }
     });
   ========================================== */

const SurfaceEditor = (() => {
    // Internal state — tracks what option the user has selected
    let _selectedValue = null;

    /* ─────────────────────────────────────────
       PUBLIC API
    ───────────────────────────────────────── */

    /**
     * Build the surface options gallery HTML.
     * @param {string|null} currentSurface - Currently set surface value
     * @returns {string} HTML string
     */
    function render(currentSurface) {
        const options = CONFIG.SURFACE_OPTIONS;

        let html = `
            <div class="surface-editor">
                <h4>
                    <i class="fas fa-road"></i>
                    Edycja rodzaju nawierzchni
                </h4>
                <div class="surface-editor-info">
                    Potwierdź, że ta droga jest asfaltowa. Zmiana zostanie zapisana w OpenStreetMap.
                </div>
        `;

        html += '<div class="smoothness-gallery">';
        for (const option of options) {
            const selected = option.value === currentSurface ? 'selected' : '';
            const imagePath = `assets/smoothness/${option.image}`;

            html += `
                <div class="smoothness-option ${selected}" data-value="${option.value}">
                    <div class="smoothness-option-image">
                        <img src="${imagePath}" alt="${option.label}"
                             onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i> ${option.labelEn}'">
                    </div>
                    <div class="smoothness-option-content">
                        <div class="smoothness-option-label-wrapper">
                            <div class="smoothness-option-label">${option.label}</div>
                            <div class="smoothness-option-line excellent"></div>
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
     * @param {Object} properties  - Road properties (osm_id, firstOsmId, isMulti)
     * @param {boolean} isAuthenticated
     * @returns {string} HTML string
     */
    function renderActions(properties, isAuthenticated) {
        const disabledAttr  = !isAuthenticated ? 'disabled' : '';
        const tooltipAttr   = !isAuthenticated ? 'title="Zaloguj się do OSM, aby zapisać zmiany"' : '';
        const osmEditId     = properties.firstOsmId || properties.osm_id;

        return `
            <div class="road-info-bottom-actions">
                <button class="btn-save-smoothness" id="save-surface-btn" ${disabledAttr} ${tooltipAttr}>
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
     * Bind event handlers for the surface editor.
     * Must be called after render() + renderActions() HTML is in DOM.
     *
     * @param {Object} opts
     * @param {string|null}  opts.currentSurface  - Initial value (pre-selects matching option)
     * @param {Array}        opts.selectedRoads   - Array of selected road objects from MapManager
     * @param {Object}       opts.osmApi          - OSMAPIClient instance
     * @param {Object}       opts.oauth           - OSMOAuth instance
     * @param {Function}     opts.onSaveSuccess   - Called with { updatedIds, newValue } after save
     */
    function init({ currentSurface, selectedRoads, osmApi, oauth, onSaveSuccess }) {
        _selectedValue = currentSurface || null;

        // Option click → update _selectedValue + toggle Save button
        const options = document.querySelectorAll('.surface-editor .smoothness-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                _selectedValue = option.dataset.value;

                const saveBtn = document.getElementById('save-surface-btn');
                if (saveBtn) {
                    const authed = oauth && oauth.isAuthenticated();
                    saveBtn.disabled = !authed;
                    saveBtn.title = authed ? '' : 'Zaloguj się do OSM, aby zapisać zmiany';
                }
            });
        });

        // Save button → run save flow
        const saveBtn = document.getElementById('save-surface-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                _doSave({ selectedRoads, osmApi, onSaveSuccess });
            });
        }
    }

    /**
     * Pure function: split selected roads into those needing an update
     * and those already having the desired surface value.
     *
     * @param {Array}  selectedRoads - MapManager's selectedRoads array
     * @param {string} newSurface    - Value chosen by the user
     * @returns {{ toUpdate: Array<{id, oldValue}>, unchangedIds: Array }}
     */
    function filterRoadsToUpdate(selectedRoads, newSurface) {
        const unchangedIds = [];
        const toUpdate = [];

        selectedRoads.forEach(road => {
            const props = road.feature.properties;
            if (props.surface === newSurface) {
                unchangedIds.push(props.osm_id);
            } else {
                toUpdate.push({ id: props.osm_id, oldValue: props.surface });
            }
        });

        return { toUpdate, unchangedIds };
    }

    /* ─────────────────────────────────────────
       PRIVATE
    ───────────────────────────────────────── */

    async function _doSave({ selectedRoads, osmApi, onSaveSuccess }) {
        if (!_selectedValue) {
            Toast.show('Proszę wybrać rodzaj nawierzchni', 'warning');
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
            skippedCount: unchangedIds.length,
            tagType:      'surface'
        });

        if (!confirmed) return;

        const saveBtn = document.getElementById('save-surface-btn');
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<div class="btn-spinner"></div>Zapisywanie...';
            }

            const wayIds = toUpdate.map(u => u.id);
            const result = await osmApi.updateSurface(wayIds, _selectedValue);

            console.log('Surface updated successfully:', result);
            Toast.show(
                `✓ Rodzaj nawierzchni zaktualizowany! Changeset: ${result.changesetId}`,
                'success',
                6000
            );

            onSaveSuccess({ updatedIds: wayIds, newValue: _selectedValue });

        } catch (error) {
            console.error('Failed to save surface:', error);
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
    return { render, renderActions, init, filterRoadsToUpdate };
})();

// CommonJS export for unit tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SurfaceEditor };
}
