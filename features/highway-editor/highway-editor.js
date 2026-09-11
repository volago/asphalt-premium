/* ==========================================
   HIGHWAY-EDITOR.JS - Highway type editing UI and save logic
   Asfalt Premium
   ========================================== */

const HighwayEditor = (() => {
    let _selectedValue = null;

    /**
     * Build the highway options gallery HTML.
     * @param {string|null} currentHighway - Currently set highway value
     * @returns {string} HTML string
     */
    function render(currentHighway) {
        // We only support changing to 'unclassified' for now
        const options = [
            {
                value: 'unclassified',
                label: 'Droga niesklasyfikowana (czwartorzędowa)',
                description: 'Drogi łączące wioski o niższym priorytecie w sieci drogowej.'
            }
        ];

        let html = `
            <div class="highway-editor">
                <h4>
                    <i class="fas fa-road"></i>
                    Edycja kategorii drogi
                </h4>
                <div class="highway-editor-info">
                    Czy na pewno chcesz zmienić typ drogi z osiedlowej (residential) na niesklasyfikowaną (unclassified)?
                </div>
        `;

        html += '<div class="smoothness-gallery">';
        for (const option of options) {
            // Automatically select 'unclassified' since it's the only option
            const selected = 'selected';
            
            html += `
                <div class="smoothness-option ${selected}" data-value="${option.value}">
                    <div class="smoothness-option-content" style="padding-left: 10px;">
                        <div class="smoothness-option-label-wrapper">
                            <div class="smoothness-option-label">${option.label}</div>
                            <div class="smoothness-option-line intermediate"></div>
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
     * @param {Object} properties  - Road properties
     * @param {boolean} isAuthenticated
     * @returns {string} HTML string
     */
    function renderActions(properties, isAuthenticated) {
        const disabledAttr  = !isAuthenticated ? 'disabled' : '';
        const tooltipAttr   = !isAuthenticated ? 'title="Zaloguj się do OSM, aby zapisać zmiany"' : '';
        const osmEditId     = properties.firstOsmId || properties.osm_id;

        return `
            <div class="road-info-bottom-actions">
                <button class="btn-save-smoothness" id="save-highway-btn" ${disabledAttr} ${tooltipAttr}>
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
     * Bind event handlers for the highway editor.
     * @param {Object} opts
     */
    function init({ currentHighway, selectedRoads, osmApi, oauth, onSaveSuccess }) {
        _selectedValue = 'unclassified'; // Only option for now

        // Option click handler
        const options = document.querySelectorAll('.highway-editor .smoothness-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                _selectedValue = option.dataset.value;

                const saveBtn = document.getElementById('save-highway-btn');
                if (saveBtn) {
                    const authed = oauth && oauth.isAuthenticated();
                    saveBtn.disabled = !authed;
                    saveBtn.title = authed ? '' : 'Zaloguj się do OSM, aby zapisać zmiany';
                }
            });
        });

        // Save button
        const saveBtn = document.getElementById('save-highway-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                _doSave({ selectedRoads, osmApi, onSaveSuccess });
            });
        }
    }

    function filterRoadsToUpdate(selectedRoads, newHighway) {
        const unchangedIds = [];
        const toUpdate = [];

        selectedRoads.forEach(road => {
            const props = road.feature.properties;
            if (props.highway === newHighway) {
                unchangedIds.push(props.osm_id);
            } else {
                toUpdate.push({ id: props.osm_id, oldValue: props.highway });
            }
        });

        return { toUpdate, unchangedIds };
    }

    async function _doSave({ selectedRoads, osmApi, onSaveSuccess }) {
        if (!_selectedValue) {
            Toast.show('Proszę wybrać typ drogi', 'warning');
            return;
        }

        const isMulti = selectedRoads.length > 1;
        const { toUpdate, unchangedIds } = filterRoadsToUpdate(selectedRoads, _selectedValue);

        if (toUpdate.length === 0) {
            Toast.show('Wybrano tę samą wartość dla wszystkich zaznaczonych odcinków. Nie ma zmian do zapisania.', 'info');
            return;
        }

        let displayOldValue = toUpdate[0].oldValue || 'brak danych';
        for (let i = 1; i < toUpdate.length; i++) {
            if (toUpdate[i].oldValue !== toUpdate[0].oldValue) {
                displayOldValue = 'Różne wartości dla zaznaczonych dróg';
                break;
            }
        }

        const confirmed = await ConfirmationModal.show({
            wayId:        isMulti ? `Wiele odcinków (${toUpdate.length})` : toUpdate[0].id,
            oldValue:     displayOldValue,
            newValue:     _selectedValue,
            skippedCount: unchangedIds.length,
            tagType:      'highway'
        });

        if (!confirmed) return;

        const saveBtn = document.getElementById('save-highway-btn');
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<div class="btn-spinner"></div>Zapisywanie...';
            }

            const wayIds = toUpdate.map(u => u.id);
            const result = await osmApi.updateHighway(wayIds, _selectedValue);

            console.log('Highway updated successfully:', result);
            Toast.show(
                `✓ Typ drogi zaktualizowany! Changeset: ${result.changesetId}`,
                'success',
                6000
            );

            onSaveSuccess({ updatedIds: wayIds, newValue: _selectedValue });

        } catch (error) {
            console.error('Failed to save highway:', error);
            Toast.show(`Błąd podczas zapisywania: ${error.message}`, 'error', 6000);

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i>Zapisz';
            }
        }
    }

    return { render, renderActions, init, filterRoadsToUpdate };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HighwayEditor };
}
