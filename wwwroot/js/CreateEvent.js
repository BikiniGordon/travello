// Auto-resizes a textarea to fit its content.
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

let tagHandlersInitialized = false;

// Returns the normalized tag value from a tag button.
function getTagButtonValue(tagButton) {
    const explicitValue = tagButton.dataset.tagValue;
    if (explicitValue) {
        return explicitValue.trim().toLowerCase();
    }

    const labelElement = tagButton.querySelector('.tag-label');
    if (labelElement) {
        return labelElement.textContent.trim().toLowerCase();
    }

    return tagButton.textContent.trim().toLowerCase();
}

// Creates a removable tag button for a custom tag.
function createCustomTagButton(tagText) {
    const tagButton = document.createElement('button');
    tagButton.type = 'button';
    tagButton.className = 'tag-btn small removable text-sm font-regular default-font';
    tagButton.dataset.tagValue = tagText;
    tagButton.innerHTML = `
        <span class="tag-label">${tagText}</span>
        <span class="tag-remove-btn" role="button" aria-label="Remove tag" title="Remove tag">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <path d="M6.47643 6.47635L11.1905 11.1904M6.47643 11.1904L11.1905 6.47635M14.726 2.94082C17.9804 6.19519 17.9804 11.4716 14.726 14.7259C11.4716 17.9803 6.19527 17.9803 2.9409 14.7259C-0.313473 11.4716 -0.313473 6.19519 2.9409 2.94082C6.19527 -0.313551 11.4716 -0.313551 14.726 2.94082Z" stroke="#1E1E1E" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
    `;
    return tagButton;
}

// Opens the inline input used to add a custom tag.
function openTagInput(addButton) {
    const tagContainer = addButton.closest('.tags-container');
    if (!tagContainer || tagContainer.querySelector('.tag-input-wrapper')) {
        return;
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'tag-input-wrapper';
    inputWrapper.innerHTML = `
        <input type="text" class="tag-input-field text-sm font-regular default-font" placeholder="Add tag" maxlength="30" aria-label="Tag name">
        <button type="button" class="tag-input-confirm text-sm font-regular default-font">Add</button>
    `;

    const inputField = inputWrapper.querySelector('.tag-input-field');
    const confirmButton = inputWrapper.querySelector('.tag-input-confirm');

    const closeInput = () => {
        inputWrapper.remove();
        addButton.style.display = 'flex';
        addButton.focus();
    };

    const submitTag = () => {
        const tagName = inputField.value.trim();

        if (!tagName) {
            closeInput();
            return;
        }

        const normalizedTagName = tagName.toLowerCase();
        const duplicatedTag = Array.from(tagContainer.querySelectorAll('.tag-btn:not(.add-btn)')).some((tagButton) => {
            return getTagButtonValue(tagButton) === normalizedTagName;
        });

        if (!duplicatedTag) {
            const customTagButton = createCustomTagButton(tagName);
            tagContainer.insertBefore(customTagButton, addButton);
        }

        closeInput();
    };

    confirmButton.addEventListener('click', submitTag);
    inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitTag();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeInput();
        }
    });

    inputField.addEventListener('blur', () => {
        setTimeout(() => {
            if (!inputWrapper.contains(document.activeElement)) {
                closeInput();
            }
        }, 0);
    });

    addButton.style.display = 'none';
    tagContainer.insertBefore(inputWrapper, addButton);
    inputField.focus();
}

// Wires click handlers for category/tag add, remove, and selection.
function initializeTagButtons() {
    if (tagHandlersInitialized) {
        return;
    }

    document.addEventListener('click', (event) => {
        const addButton = event.target.closest('.tag-btn.add-btn');
        if (addButton) {
            event.preventDefault();
            openTagInput(addButton);
            return;
        }

        const removeButton = event.target.closest('.tag-remove-btn');
        if (removeButton) {
            event.preventDefault();
            const removableTagButton = removeButton.closest('.tag-btn.removable');
            if (removableTagButton) {
                removableTagButton.remove();
            }
            return;
        }

        const tagButton = event.target.closest('.tag-btn:not(.add-btn)');
        if (!tagButton) {
            return;
        }

        event.preventDefault();
        tagButton.classList.toggle('is-selected');
    });

    tagHandlersInitialized = true;
}

// Connects the photo upload trigger and preview behavior.
function initializePhotoUpload() {
    const form = document.getElementById('createEventForm');
    const isLimitedEditMode = form?.dataset?.editMode === 'limited';
    const uploadButton = document.getElementById('uploadPhotoButton');
    const uploadInput = document.getElementById('uploadPhotoInput');
    const photoPlaceholder = document.querySelector('.photo-placeholder');
    const photoLinkToggleButton = document.getElementById('photoLinkToggleButton');
    const photoLinkSection = document.getElementById('photoLinkSection');
    const photoLinkInput = document.getElementById('photoLinkInput');
    const initialPhotoUrlSeed = document.getElementById('initialPhotoUrlSeed');

    if (!uploadButton || !uploadInput || !photoPlaceholder) {
        return;
    }

    const showPreview = (imageUrl) => {
        photoPlaceholder.style.backgroundImage = `url('${imageUrl}')`;
        photoPlaceholder.style.backgroundSize = 'cover';
        photoPlaceholder.style.backgroundPosition = 'center';
        photoPlaceholder.classList.add('has-preview');

        if (uploadButton) {
            uploadButton.style.display = 'flex';
        }
        
    };

    const initialPhotoUrl = initialPhotoUrlSeed?.value?.trim();
    if (initialPhotoUrl) {
        showPreview(initialPhotoUrl);
    }

    if (isLimitedEditMode) {
        return;
    }

    uploadButton.addEventListener('click', () => {
        uploadInput.click();
    });

    uploadButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            uploadInput.click();
        }
    });

    uploadInput.addEventListener('change', (event) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        if (photoLinkInput) {
            photoLinkInput.value = '';
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        showPreview(objectUrl);
    });

    if (photoLinkToggleButton && photoLinkSection) {
        photoLinkToggleButton.addEventListener('click', () => {
            photoLinkSection.classList.toggle('hidden');
            if (!photoLinkSection.classList.contains('hidden') && photoLinkInput) {
                photoLinkInput.focus();
            }
        });
    }

    if (photoLinkInput) {
        photoLinkInput.addEventListener('input', () => {
            const rawValue = photoLinkInput.value.trim();
            if (!rawValue) {
                return;
            }

            try {
                const parsedUrl = new URL(rawValue);
                if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                    if (uploadInput.value) {
                        uploadInput.value = '';
                    }

                    showPreview(parsedUrl.href);
                }
            } catch {
                // Ignore invalid URL while typing.
            }
        });
    }
}

// Parses JSON seed data rendered into a script tag.
function readJsonSeed(scriptElementId, fallbackValue) {
    const scriptElement = document.getElementById(scriptElementId);
    if (!scriptElement) {
        return fallbackValue;
    }

    const rawJson = scriptElement.textContent?.trim();
    if (!rawJson) {
        return fallbackValue;
    }

    try {
        return JSON.parse(rawJson);
    } catch {
        return fallbackValue;
    }
}

// Applies preselected category and custom tags when editing.
function applyInitialCategoryAndTags() {
    const categorySeed = document.getElementById('initialCategorySeed')?.value?.trim();
    const tagsSeed = document.getElementById('initialTagsSeed')?.value?.trim();

    if (categorySeed) {
        const categoryButtons = document.querySelectorAll('.catagory-section .tags-container:first-of-type .tag-btn');
        const normalizedCategory = categorySeed.toLowerCase();

        Array.from(categoryButtons).forEach((button) => {
            if (getTagButtonValue(button) === normalizedCategory) {
                button.classList.add('is-selected');
            }
        });
    }

    if (tagsSeed) {
        const customTags = tagsSeed
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        const customTagContainer = document.querySelector('.catagory-section .tags-container:last-of-type');
        const addButton = customTagContainer?.querySelector('.tag-btn.add-btn');

        if (!customTagContainer || !addButton) {
            return;
        }

        customTags.forEach((tag) => {
            const duplicatedTag = Array.from(customTagContainer.querySelectorAll('.tag-btn:not(.add-btn)')).some((button) => {
                return getTagButtonValue(button) === tag.toLowerCase();
            });

            if (!duplicatedTag) {
                const customTagButton = createCustomTagButton(tag);
                customTagButton.classList.add('is-selected');
                customTagContainer.insertBefore(customTagButton, addButton);
            }
        });
    }
}

// Applies initial packing list rows in edit mode.
function applyInitialPackingList() {
    if (!importantPackRows) {
        return;
    }

    const initialPackingItems = readJsonSeed('initialPackingListJsonSeed', []);
    if (!Array.isArray(initialPackingItems) || initialPackingItems.length === 0) {
        ensureTrailingEmptyPackRow();
        return;
    }

    importantPackRows.innerHTML = '';

    initialPackingItems.forEach((item) => {
        const packRow = createPackRow();
        const packInput = packRow.querySelector('.pack-input');
        if (packInput) {
            packInput.value = String(item ?? '').trim();
        }
        importantPackRows.appendChild(packRow);
    });

    ensureTrailingEmptyPackRow();
}

// Applies initial planner rows in edit mode.
function applyInitialPlannerRows() {
    if (!plannerDaysContainer) {
        return;
    }

    const initialPlannerRows = readJsonSeed('initialPlannerJsonSeed', []);
    if (!Array.isArray(initialPlannerRows) || initialPlannerRows.length === 0) {
        createDay(1);
        return;
    }

    plannerDaysContainer.innerHTML = '';

    const dayMap = new Map();
    initialPlannerRows.forEach((row) => {
        const dayIndex = Number.isFinite(Number.parseInt(String(row?.dayIndex), 10))
            ? Number.parseInt(String(row.dayIndex), 10)
            : 1;

        if (!dayMap.has(dayIndex)) {
            dayMap.set(dayIndex, []);
        }

        dayMap.get(dayIndex).push(row);
    });

    const sortedDays = Array.from(dayMap.keys()).sort((left, right) => left - right);
    sortedDays.forEach((dayNumber) => {
        const dayElement = createDay(dayNumber);
        const dayDateInput = dayElement.querySelector('.day-date-input');
        const dayRows = dayMap.get(dayNumber) || [];
        const rowsContainer = dayElement.querySelector('.planner-day-rows');
        rowsContainer.innerHTML = '';

        dayRows
            .sort((left, right) => {
                const leftPlace = Number.parseInt(String(left?.placeIndex ?? Number.MAX_SAFE_INTEGER), 10);
                const rightPlace = Number.parseInt(String(right?.placeIndex ?? Number.MAX_SAFE_INTEGER), 10);
                return leftPlace - rightPlace;
            })
            .forEach((row) => {
                const planRow = createPlanRow();
                const placeInput = planRow.querySelector('.planner-place-input');
                const noteInput = planRow.querySelector('.planner-note-input');
                const expenseWrap = planRow.querySelector('.planner-expense-wrap');

                if (dayDateInput && row?.dayDate) {
                    dayDateInput.value = row.dayDate;
                }

                if (placeInput) {
                    placeInput.value = String(row?.placeName ?? '').trim();
                }

                if (row?.googleMapUrl) {
                    planRow.dataset.googleMapUrl = String(row.googleMapUrl);
                }

                if (row?.latitude !== null && row?.latitude !== undefined && row?.longitude !== null && row?.longitude !== undefined) {
                    planRow.dataset.markerLat = String(row.latitude);
                    planRow.dataset.markerLng = String(row.longitude);
                    planRow.dataset.markerName = String(row?.placeName ?? 'Location').trim();
                }

                const noteValue = String(row?.note ?? '').trim();
                if (noteInput && noteValue) {
                    noteInput.classList.remove('hidden');
                    noteInput.value = noteValue;
                    autoResize(noteInput);
                }

                const expenses = Array.isArray(row?.expenses) ? row.expenses : [];
                if (expenseWrap && expenses.length > 0) {
                    expenseWrap.classList.remove('hidden');
                    expenses.forEach((expense) => {
                        const expenseRow = createExpenseRow();
                        const expenseNameInput = expenseRow.querySelector('.planner-expense-name-input');
                        const expenseAmountInput = expenseRow.querySelector('.planner-expense-input');

                        if (expenseNameInput) {
                            expenseNameInput.value = String(expense?.name ?? '').trim();
                        }

                        if (expenseAmountInput && expense?.amount !== null && expense?.amount !== undefined) {
                            expenseAmountInput.value = String(expense.amount);
                        }

                        expenseWrap.appendChild(expenseRow);
                    });
                }

                rowsContainer.appendChild(planRow);
            });

        ensureTrailingEmptyRow(dayElement);
    });

    const lastDay = plannerDaysContainer.querySelector('.event-plan-day:last-of-type');
    if (lastDay) {
        ensureNextDay(lastDay);
    }

    recalculatePlaceNumbers();
    updateTotalExpenses();
}

const plannerDaysContainer = document.getElementById('eventPlannerDays');
const plannerTotalAmount = document.getElementById('plannerTotalAmount');
const importantPackRows = document.getElementById('importantPackRows');

let draggedElement = null;
let draggedType = null;
let draggedSourceDay = null;

// Static map preview state
let mapContainerElement;
let staticMapCanvasElement;
let staticMapCaptionElement;
let staticMapMarkerElement;
let staticMapMarkerIconElement;
let staticMapMarkerLabelElement;
let staticMapRenderVersion = 0;
const mapTileCache = new Map();
const defaultLocation = { lat: 13.7298889, lng: 100.7756574 }; // KMITL
const STATIC_MAP_ZOOM = 13;
const STATIC_MAP_FALLBACK_WIDTH = 900;
const STATIC_MAP_FALLBACK_HEIGHT = 560;
// External places array (used by pages without planner DOM)
window.externalMapPlaces = window.externalMapPlaces || [];

// Recalculates sequential place numbers across all planner rows.
function recalculatePlaceNumbers() {
    const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
    let placeNumber = 0;
    
    allRows.forEach((row) => {
        if (hasPlaceValue(row)) {
            placeNumber++;
            row.dataset.placeNumber = String(placeNumber);

            const placeIcon = row.querySelector('.place-icon');
            if (placeIcon) {
                placeIcon.outerHTML = createPlaceIcon(placeNumber);
            }
        } else {
            row.dataset.placeNumber = '0';

            const placeIcon = row.querySelector('.place-icon');
            if (placeIcon) {
                placeIcon.outerHTML = createPlaceIcon(0);
            }
        }
    });

    syncMapMarkers();
    return placeNumber;
}

// Rebuilds map markers so they match planner rows and order.
function syncMapMarkers(zoomToFirst = false) {
    if (!mapContainerElement) {
        return;
    }
    let latestMarker = null;
    let placeMarkerCount = 0;

    if (plannerDaysContainer) {
        const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
        allRows.forEach((row) => {
            if (!hasPlaceValue(row)) {
                return;
            }

            const lat = Number.parseFloat(row.dataset.markerLat);
            const lng = Number.parseFloat(row.dataset.markerLng);
            const placeNumber = Number.parseInt(row.dataset.placeNumber, 10);

            if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(placeNumber) || placeNumber <= 0) {
                return;
            }

            latestMarker = {
                lat,
                lng,
                name: row.dataset.markerName || row.querySelector('.planner-place-input')?.value?.trim() || 'Location',
                placeNumber
            };

            placeMarkerCount++;
        });
    } else if (Array.isArray(window.externalMapPlaces) && window.externalMapPlaces.length > 0) {
        placeMarkerCount = window.externalMapPlaces.length;
        const last = window.externalMapPlaces[window.externalMapPlaces.length - 1];
        if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
            latestMarker = {
                lat: Number(last.lat),
                lng: Number(last.lng),
                name: last.name || 'Location',
                placeNumber: window.externalMapPlaces.length
            };
        }
    }

    if (latestMarker) {
        renderStaticMapPreview(latestMarker.lat, latestMarker.lng, latestMarker.name, placeMarkerCount, latestMarker.placeNumber);
    } else {
        renderStaticMapPreview(defaultLocation.lat, defaultLocation.lng, 'KMITL, Bangkok, Thailand', 0, 0);
    }

    // If interactive Leaflet map is active, refresh its markers too
    try {
        if (typeof updateLeafletMarkers === 'function' && isInteractiveMap) {
            updateLeafletMarkers();
        }
    } catch (e) {
        // ignore
    }
}

function convertLatLngToWorldPixels(lat, lng, zoom) {
    const latRad = (lat * Math.PI) / 180;
    const scale = (2 ** zoom) * 256;

    return {
        worldX: ((lng + 180) / 360) * scale,
        worldY: ((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2) * scale
    };
}

function buildTileUrl(zoom, tileX, tileY) {
    const tileCount = 2 ** zoom;
    if (tileY < 0 || tileY >= tileCount) {
        return null;
    }

    const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
    return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`;
}

function loadTileImage(tileUrl) {
    if (mapTileCache.has(tileUrl)) {
        return mapTileCache.get(tileUrl);
    }

    const tilePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = tileUrl;
    });

    mapTileCache.set(tileUrl, tilePromise);
    return tilePromise;
}

async function renderMapTilesToCanvas(lat, lng, zoom = STATIC_MAP_ZOOM) {
    if (!staticMapCanvasElement) {
        return;
    }

    const renderVersion = ++staticMapRenderVersion;
    const canvas = staticMapCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }

    const cssWidth = Math.max(1, Math.round(canvas.clientWidth || STATIC_MAP_FALLBACK_WIDTH));
    const cssHeight = Math.max(1, Math.round(canvas.clientHeight || STATIC_MAP_FALLBACK_HEIGHT));
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    context.fillStyle = '#f2f2f2';
    context.fillRect(0, 0, cssWidth, cssHeight);

    const { worldX, worldY } = convertLatLngToWorldPixels(lat, lng, zoom);
    const viewportStartX = worldX - cssWidth / 2;
    const viewportStartY = worldY - cssHeight / 2;
    const tileSize = 256;

    const minTileX = Math.floor(viewportStartX / tileSize);
    const maxTileX = Math.floor((viewportStartX + cssWidth - 1) / tileSize);
    const minTileY = Math.floor(viewportStartY / tileSize);
    const maxTileY = Math.floor((viewportStartY + cssHeight - 1) / tileSize);

    const drawTasks = [];

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
            const tileUrl = buildTileUrl(zoom, tileX, tileY);
            if (!tileUrl) {
                continue;
            }

            const destinationX = Math.round(tileX * tileSize - viewportStartX);
            const destinationY = Math.round(tileY * tileSize - viewportStartY);

            drawTasks.push(
                loadTileImage(tileUrl)
                    .then((image) => ({ image, destinationX, destinationY }))
                    .catch(() => null)
            );
        }
    }

    const resolvedTiles = await Promise.all(drawTasks);
    if (renderVersion !== staticMapRenderVersion) {
        return;
    }

    let drawnCount = 0;
    resolvedTiles.forEach((tile) => {
        if (!tile) {
            return;
        }

        context.drawImage(tile.image, tile.destinationX, tile.destinationY, tileSize, tileSize);
        drawnCount += 1;
    });

    if (drawnCount === 0) {
        context.fillStyle = '#5f5f5f';
        context.font = '600 20px Segoe UI';
        context.textAlign = 'center';
        context.fillText('Map preview unavailable', cssWidth / 2, cssHeight / 2);
    }

    // After tiles are drawn, render numbered markers for all places (planner rows or externalMapPlaces)
    const places = [];
    if (plannerDaysContainer) {
        const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
        allRows.forEach((row) => {
            const lat = Number.parseFloat(row.dataset.markerLat);
            const lng = Number.parseFloat(row.dataset.markerLng);
            const placeNumber = Number.parseInt(row.dataset.placeNumber, 10);
            const name = row.dataset.markerName || row.querySelector('.planner-place-input')?.value?.trim() || 'Location';
            if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(placeNumber) && placeNumber > 0) {
                places.push({ lat, lng, name, placeNumber });
            }
        });
    } else if (Array.isArray(window.externalMapPlaces) && window.externalMapPlaces.length > 0) {
        window.externalMapPlaces.forEach((p, idx) => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                places.push({ lat, lng, name: p.name || 'Location', placeNumber: idx + 1 });
            }
        });
    }

    if (places.length > 0) {
        // Load marker SVG images as data URLs and draw them on the canvas at correct pixel positions
        const markerWidth = 35;
        const markerHeight = 41;
        const markerLoadTasks = places.map((pl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ img, place: pl });
                img.onerror = () => resolve(null);
                img.crossOrigin = 'anonymous';
                img.src = getSVGDataURL(createMapMarkerSVG(pl.placeNumber));
            });
        });

        const resolved = await Promise.all(markerLoadTasks);
        resolved.forEach((entry) => {
            if (!entry) return;
            const { img, place } = entry;
            const { worldX, worldY } = convertLatLngToWorldPixels(place.lat, place.lng, zoom);
            const px = Math.round(worldX - viewportStartX);
            const py = Math.round(worldY - viewportStartY);
            const drawX = px - Math.round(markerWidth / 2);
            const drawY = py - markerHeight;
            context.drawImage(img, drawX, drawY, markerWidth, markerHeight);
        });
    }
}

function buildGoogleMapsLink(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function renderStaticMapPreview(lat, lng, markerName, markerCount, markerNumber = 0) {
    if (!staticMapCanvasElement) {
        return;
    }

    // Determine places list (planner rows or externalMapPlaces)
    const places = [];
    if (plannerDaysContainer) {
        const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
        allRows.forEach((row) => {
            const plat = Number.parseFloat(row.dataset.markerLat);
            const plong = Number.parseFloat(row.dataset.markerLng);
            const pnum = Number.parseInt(row.dataset.placeNumber, 10);
            const pname = row.dataset.markerName || row.querySelector('.planner-place-input')?.value?.trim() || 'Location';
            if (Number.isFinite(plat) && Number.isFinite(plong) && Number.isFinite(pnum) && pnum > 0) {
                places.push({ lat: plat, lng: plong, name: pname, placeNumber: pnum });
            }
        });
    } else if (Array.isArray(window.externalMapPlaces) && window.externalMapPlaces.length > 0) {
        window.externalMapPlaces.forEach((p, idx) => {
            const plat = Number(p.lat);
            const plong = Number(p.lng);
            if (Number.isFinite(plat) && Number.isFinite(plong)) {
                places.push({ lat: plat, lng: plong, name: p.name || 'Location', placeNumber: idx + 1 });
            }
        });
    }

    // If we have multiple places, compute center and zoom to fit all
    if (places.length > 0) {
        const latitudes = places.map(p => p.lat);
        const longitudes = places.map(p => p.lng);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const canvasCssWidth = Math.max(1, Math.round(staticMapCanvasElement.clientWidth || STATIC_MAP_FALLBACK_WIDTH));
        const canvasCssHeight = Math.max(1, Math.round(staticMapCanvasElement.clientHeight || STATIC_MAP_FALLBACK_HEIGHT));
        const padding = 60; // pixels padding around markers

        // Find highest zoom where all markers fit within canvas with padding
        let chosenZoom = Math.min(STATIC_MAP_ZOOM, 16);
        for (let z = 16; z >= 1; z--) {
            const nw = convertLatLngToWorldPixels(maxLat, minLng, z);
            const se = convertLatLngToWorldPixels(minLat, maxLng, z);
            const spanX = Math.abs(se.worldX - nw.worldX);
            const spanY = Math.abs(se.worldY - nw.worldY);
            if (spanX <= (canvasCssWidth - padding * 2) && spanY <= (canvasCssHeight - padding * 2)) {
                chosenZoom = z;
                break;
            }
        }

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        void renderMapTilesToCanvas(centerLat, centerLng, chosenZoom);
    } else {
        void renderMapTilesToCanvas(lat, lng, STATIC_MAP_ZOOM);
    }

    const safeMarkerName = markerName || 'Selected location';
    if (staticMapMarkerIconElement) {
        staticMapMarkerIconElement.innerHTML = createMapMarkerSVG(markerNumber);
    }

    if (staticMapMarkerElement) {
        staticMapMarkerElement.title = safeMarkerName;
        staticMapMarkerElement.setAttribute('aria-label', safeMarkerName);
        // If multiple markers are present, hide the DOM overlay marker (we render markers into canvas)
        staticMapMarkerElement.style.display = markerCount > 1 ? 'none' : '';
    }

    if (staticMapMarkerLabelElement) {
        staticMapMarkerLabelElement.textContent = safeMarkerName;
        staticMapMarkerLabelElement.style.display = markerCount > 1 ? 'none' : '';
    }

    if (staticMapCaptionElement) {
        if (markerCount > 1) {
            staticMapCaptionElement.textContent = `${markerName} + ${markerCount - 1} more location(s)`;
        } else {
            staticMapCaptionElement.textContent = markerName || 'Selected location';
        }
    }
}

// Builds marker SVG markup, optionally including a place number.
function createMapMarkerSVG(placeNumber = null) {
    if (placeNumber !== null && placeNumber > 0) {
        return `
            <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
                <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
                <text x="17.5" y="21" text-anchor="middle" font-size="13" font-weight="bold" font-family="Segoe UI, sans-serif" fill="#232C22">${placeNumber}</text>
            </svg>
        `;
    }
    return `
        <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
            <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
        </svg>
    `;
}

// Converts an SVG string to a data URL for marker icons.
function getSVGDataURL(svgString) {
    const encoded = encodeURIComponent(svgString);
    return `data:image/svg+xml,${encoded}`;
}

// Parses a Google Maps URL into place name and coordinates.
function parseGoogleMapsURL(url) {
    try {
        const placeMatch = url.match(/\/maps\/place\/([^/@]+)/);
        let placeName = 'Unknown Location';
        
        if (placeMatch) {
            placeName = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
        }

        const coordPairs = Array.from(url.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g));

        let lat;
        let lng;

        if (coordPairs.length > 0) {
            const lastPair = coordPairs[coordPairs.length - 1];
            lat = Number.parseFloat(lastPair[1]);
            lng = Number.parseFloat(lastPair[2]);
        } else {
            const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
            if (atMatch) {
                lat = Number.parseFloat(atMatch[1]);
                lng = Number.parseFloat(atMatch[2]);
            }
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.warn('Invalid coordinates parsed from URL');
            return null;
        }

        return { lat, lng, name: placeName };
    } catch (error) {
        console.error('Error parsing Google Maps URL:', error);
        return null;
    }
}

// Validates that a URL is a full Google Maps link and includes coordinates.
function isValidFullGoogleMapsLink(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
        return false;
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        const protocol = parsedUrl.protocol.toLowerCase();
        if (protocol !== 'http:' && protocol !== 'https:') {
            return false;
        }

        const host = parsedUrl.hostname.toLowerCase();
        const isGoogleDomain = host === 'google.com' || host.endsWith('.google.com');
        if (!isGoogleDomain) {
            return false;
        }

        const path = parsedUrl.pathname.toLowerCase();
        if (!path.includes('/maps')) {
            return false;
        }

        return parseGoogleMapsURL(trimmedUrl) !== null;
    } catch {
        return false;
    }
}

// Adds a marker to the map and centers the viewport on it.
function addMapMarker(lat, lng, name, placeNumber = null) {
    renderStaticMapPreview(lat, lng, name, 1);
    try {
        if (typeof updateLeafletMarkers === 'function' && isInteractiveMap) {
            updateLeafletMarkers();
        }
    } catch (e) {
        // ignore
    }
}

// Handles create-event form validation and payload serialization.
function bindCreateEventFormSubmit() {
    const form = document.getElementById('createEventForm');
    if (!form) {
        return;
    }
    const isLimitedEditMode = form.dataset.editMode === 'limited';

    const categoryInput = document.getElementById('selectedCategoryInput');
    const tagsInput = document.getElementById('selectedTagsInput');
    const plannerInput = document.getElementById('plannerJsonInput');
    const packingListInput = document.getElementById('packingListJsonInput');
    const uploadPhotoButton = document.getElementById('uploadPhotoButton');
    const photoLinkInput = form.querySelector('input[name="PhotoLink"]');
    const attendeesLimitInput = form.querySelector('input[name="AttendeesLimit"]');
    const startDateInput = form.querySelector('input[name="StartDate"]');
    const startTimeInput = form.querySelector('input[name="StartTime"]');
    const endDateInput = form.querySelector('input[name="EndDate"]');
    const endTimeInput = form.querySelector('input[name="EndTime"]');
    const openDateInput = form.querySelector('input[name="OpenDate"]');

    const requiredFieldConfigs = (isLimitedEditMode
        ? [
            { name: 'Detail', selector: 'textarea[name="Detail"]', message: 'Detail is required.' }
        ]
        : [
            { name: 'EventTitle', selector: 'input[name="EventTitle"]', message: 'Event title is required.' },
            { name: 'Detail', selector: 'textarea[name="Detail"]', message: 'Detail is required.' },
            // Category selection is validated separately because the hidden input is populated during submit
            { name: 'AttendeesLimit', selector: 'input[name="AttendeesLimit"]', message: 'Maximum number of attendees is required.' },
            { name: 'StartDate', selector: 'input[name="StartDate"]', message: 'Start date is required.' },
            { name: 'StartTime', selector: 'input[name="StartTime"]', message: 'Start time is required.' },
            { name: 'EndDate', selector: 'input[name="EndDate"]', message: 'End date is required.' },
            { name: 'EndTime', selector: 'input[name="EndTime"]', message: 'End time is required.' },
            { name: 'OpenDate', selector: 'input[name="OpenDate"]', message: 'Registration close date is required.' },
            { name: 'LocationName', selector: 'input[name="LocationName"]', message: 'Location is required.' }
        ])
        .map((config) => ({
            ...config,
            input: form.querySelector(config.selector)
        }))
        .filter((config) => Boolean(config.input));

    function getValidationMessageElement(fieldName) {
        return form.querySelector(`.field-validation-message[data-valmsg-for="${fieldName}"]`);
    }

    function setValidationMessage(fieldName, message) {
        const messageElement = getValidationMessageElement(fieldName);
        if (!messageElement) {
            return;
        }

        messageElement.textContent = message;
    }

    function isInputFilled(inputElement) {
        if (!inputElement) {
            return false;
        }

        if (inputElement.type === 'file') {
            return Boolean(inputElement.files && inputElement.files.length > 0);
        }

        if (inputElement.type === 'number') {
            return inputElement.value !== '';
        }

        return inputElement.value.trim() !== '';
    }

    function validateRequiredField(config) {
        const hasValue = isInputFilled(config.input);
        setValidationMessage(config.name, hasValue ? '' : config.message);
        return hasValue;
    }

    function validateAllRequiredFields() {
        let allValid = true;

        requiredFieldConfigs.forEach((config) => {
            const isValid = validateRequiredField(config);
            if (!isValid && allValid) {
                config.input.focus();
                allValid = false;
            } else if (!isValid) {
                allValid = false;
            }
        });

        return allValid;
    }

    function parseDateTimeValue(dateValue, timeValue) {
        if (!dateValue || !timeValue) {
            return null;
        }

        const parsedDateTime = new Date(`${dateValue}T${timeValue}`);
        if (Number.isNaN(parsedDateTime.getTime())) {
            return null;
        }

        return parsedDateTime;
    }

    function parseDateValue(dateValue) {
        if (!dateValue) {
            return null;
        }

        const parsedDate = new Date(`${dateValue}T00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return null;
        }

        return parsedDate;
    }

    function validateAttendeesLimitFormat() {
        if (isLimitedEditMode) {
            return true;
        }

        if (!attendeesLimitInput) {
            return true;
        }

        const rawValue = attendeesLimitInput.value.trim();
        if (rawValue === '') {
            return true;
        }

        if (!/^\d+$/.test(rawValue)) {
            setValidationMessage('AttendeesLimit', 'Maximum number of attendees must be a valid number.');
            return false;
        }

        setValidationMessage('AttendeesLimit', '');
        return true;
    }

    function validateDateOrdering() {
        if (isLimitedEditMode) {
            return true;
        }

        let isValid = true;

        if (startDateInput && startTimeInput && endDateInput && endTimeInput) {
            const startDateTime = parseDateTimeValue(startDateInput.value, startTimeInput.value);
            const endDateTime = parseDateTimeValue(endDateInput.value, endTimeInput.value);

            if (startDateTime && endDateTime && startDateTime >= endDateTime) {
                setValidationMessage('EndDate', 'End date and time must be after start date and time.');
                isValid = false;
            } else {
                setValidationMessage('EndDate', '');
            }
        }

        if (openDateInput && startDateInput) {
            const openDate = parseDateValue(openDateInput.value);
            const startDate = parseDateValue(startDateInput.value);

            if (openDate && startDate && openDate >= startDate) {
                setValidationMessage('OpenDate', 'Registration close date must be before the start date.');
                isValid = false;
            } else {
                setValidationMessage('OpenDate', '');
            }
        }

        return isValid;
    }

    function validatePhotoLinkFormat() {
        if (isLimitedEditMode) {
            return true;
        }

        if (!photoLinkInput) {
            return true;
        }

        const rawValue = photoLinkInput.value.trim();
        if (rawValue === '') {
            setValidationMessage('PhotoLink', '');
            return true;
        }

        try {
            const parsedUrl = new URL(rawValue);
            const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';

            if (!isHttp) {
                setValidationMessage('PhotoLink', 'Photo link must start with http:// or https://.');
                return false;
            }

            setValidationMessage('PhotoLink', '');
            return true;
        } catch {
            setValidationMessage('PhotoLink', 'Photo link must be a valid URL.');
            return false;
        }
    }

    function validatePlannerGoogleMapLinks() {
        setValidationMessage('PlannerJson', '');

        const dayElements = document.querySelectorAll('.event-plan-day');
        for (const dayElement of dayElements) {
            const rowElements = dayElement.querySelectorAll('.planner-item');

            for (const rowElement of rowElements) {
                const placeInput = rowElement.querySelector('.planner-place-input');
                const placeName = placeInput?.value?.trim() || '';

                if (!placeName) {
                    continue;
                }

                const googleMapUrl = (rowElement.dataset.googleMapUrl || '').trim();
                if (!isValidFullGoogleMapsLink(googleMapUrl)) {
                    setValidationMessage('PlannerJson', 'Each itinerary place must use a full Google Maps link (with coordinates).');
                    if (placeInput) {
                        placeInput.focus();
                    }
                    return false;
                }
            }
        }

        return true;
    }

    function validateCategorySelected() {
        // Check if a category button is selected (first tags-container)
        const categoryButtons = document.querySelectorAll('.catagory-section .tags-container:first-of-type .tag-btn');
        const selected = Array.from(categoryButtons).some((b) => b.classList.contains('is-selected'));
        if (!selected) {
            setValidationMessage('Category', 'Please select a category.');
            // focus first category button to draw attention
            const firstBtn = categoryButtons[0];
            if (firstBtn && typeof firstBtn.focus === 'function') firstBtn.focus();
            return false;
        }
        setValidationMessage('Category', '');
        return true;
    }

    function validatePlannerExpenses() {
        setValidationMessage('PlannerJson', '');

        const dayElements = document.querySelectorAll('.event-plan-day');
        for (const dayElement of dayElements) {
            const rowElements = dayElement.querySelectorAll('.planner-item');

            for (const rowElement of rowElements) {
                const expenseRows = rowElement.querySelectorAll('.planner-expense-row');
                for (const expenseRow of expenseRows) {
                    const expenseName = expenseRow.querySelector('.planner-expense-name-input')?.value?.trim() || '';
                    const amountRaw = expenseRow.querySelector('.planner-expense-input')?.value;
                    if (!expenseName) {
                        continue;
                    }

                    const amount = Number.parseFloat(amountRaw || '0');
                    if (!Number.isFinite(amount) || amount <= 0) {
                        setValidationMessage('PlannerJson', 'Each expense amount must be greater than 0.');
                        return false;
                    }
                }
            }
        }

        return true;
    }

    requiredFieldConfigs.forEach((config) => {
        const eventName = config.input.type === 'date' || config.input.type === 'time' || config.input.type === 'file' ? 'change' : 'input';
        config.input.addEventListener('blur', () => {
            validateRequiredField(config);
        });
        config.input.addEventListener(eventName, () => {
            validateRequiredField(config);
        });
    });

    const uploadPhotoConfig = requiredFieldConfigs.find((config) => config.name === 'UploadPhoto');
    let uploadDialogWasOpened = false;

    if (uploadPhotoButton && uploadPhotoConfig) {
        uploadPhotoButton.addEventListener('click', () => {
            uploadDialogWasOpened = true;
        });

        window.addEventListener('focus', () => {
            if (!uploadDialogWasOpened) {
                return;
            }

            uploadDialogWasOpened = false;
            setTimeout(() => {
                validateRequiredField(uploadPhotoConfig);
            }, 0);
        });
    }

    form.addEventListener('submit', (event) => {
        const requiredValid = validateAllRequiredFields();
        const attendeesValid = validateAttendeesLimitFormat();
        const dateOrderingValid = validateDateOrdering();
        const photoLinkValid = validatePhotoLinkFormat();
        const plannerLinksValid = validatePlannerGoogleMapLinks();
        const plannerExpensesValid = validatePlannerExpenses();
        const categoryValid = isLimitedEditMode ? true : validateCategorySelected();
        const isValid = requiredValid && attendeesValid && dateOrderingValid && photoLinkValid && plannerLinksValid && plannerExpensesValid && categoryValid;

        if (!isValid) {
            event.preventDefault();

            if (!requiredValid) {
                return;
            }

            if (!attendeesValid && attendeesLimitInput) {
                attendeesLimitInput.focus();
                return;
            }

            if (!dateOrderingValid) {
                if (openDateInput && openDateInput.value.trim() !== '' && getValidationMessageElement('OpenDate')?.textContent) {
                    openDateInput.focus();
                    return;
                }

                if (endDateInput && getValidationMessageElement('EndDate')?.textContent) {
                    endDateInput.focus();
                }
            }

            if (!photoLinkValid && photoLinkInput) {
                photoLinkInput.focus();
            }

            if (!plannerLinksValid) {
                return;
            }

            return;
        }

        if (!isLimitedEditMode) {
            const categoryButtons = document.querySelectorAll('.catagory-section .tags-container:first-of-type .tag-btn');
            const selectedCategoryButton = Array.from(categoryButtons).find((button) => button.classList.contains('is-selected'));
            if (categoryInput) {
                categoryInput.value = selectedCategoryButton ? getTagButtonValue(selectedCategoryButton) : '';
            }

            const customTagButtons = document.querySelectorAll('.catagory-section .tags-container:last-of-type .tag-btn:not(.add-btn)');
            const tags = Array.from(customTagButtons)
                .map((button) => getTagButtonValue(button))
                .filter((tagValue, index, array) => tagValue && array.indexOf(tagValue) === index);

            if (tagsInput) {
                tagsInput.value = tags.join(',');
            }
        }

        const plannerRows = [];
        const dayElements = document.querySelectorAll('.event-plan-day');

        dayElements.forEach((dayElement, dayArrayIndex) => {
            const dayIndex = dayArrayIndex + 1;
            const dayLabel = `DAY ${dayIndex}`;
            const dayDate = dayElement.querySelector('.day-date-input')?.value || '';
            const rowElements = dayElement.querySelectorAll('.planner-item');

            rowElements.forEach((rowElement, rowArrayIndex) => {
                const placeIndex = rowArrayIndex + 1;
                const placeInput = rowElement.querySelector('.planner-place-input');
                const placeName = placeInput?.value?.trim() || '';
                if (!placeName) {
                    return;
                }

                const noteInput = rowElement.querySelector('.planner-note-input');
                const note = noteInput?.value?.trim() || '';

                const expenseRows = rowElement.querySelectorAll('.planner-expense-row');
                const expenses = [];
                expenseRows.forEach((expenseRow) => {
                    const expenseName = expenseRow.querySelector('.planner-expense-name-input')?.value?.trim() || '';
                    const amountRaw = expenseRow.querySelector('.planner-expense-input')?.value;
                    const amount = Number.parseFloat(amountRaw || '0');

                    if (!expenseName && (!Number.isFinite(amount) || amount <= 0)) {
                        return;
                    }

                    expenses.push({
                        name: expenseName,
                        amount: Number.isFinite(amount) ? amount : 0
                    });
                });

                const latitude = rowElement.dataset.markerLat ? Number.parseFloat(rowElement.dataset.markerLat) : null;
                const longitude = rowElement.dataset.markerLng ? Number.parseFloat(rowElement.dataset.markerLng) : null;

                plannerRows.push({
                    dayIndex,
                    dayLabel,
                    placeIndex,
                    placeName,
                    dayDate,
                    note,
                    googleMapUrl: rowElement.dataset.googleMapUrl || '',
                    latitude: Number.isFinite(latitude) ? latitude : null,
                    longitude: Number.isFinite(longitude) ? longitude : null,
                    expenses
                });
            });
        });

        if (plannerInput) {
            plannerInput.value = JSON.stringify(plannerRows);
        }

        const packingList = Array.from(document.querySelectorAll('.pack-input'))
            .map((input) => input.value.trim())
            .filter((value) => value.length > 0);

        if (packingListInput) {
            packingListInput.value = JSON.stringify(packingList);
        }
    });

    if (!isLimitedEditMode && attendeesLimitInput) {
        attendeesLimitInput.addEventListener('input', validateAttendeesLimitFormat);
        attendeesLimitInput.addEventListener('blur', validateAttendeesLimitFormat);
    }

    if (!isLimitedEditMode) {
        [startDateInput, startTimeInput, endDateInput, endTimeInput, openDateInput]
            .filter((input) => Boolean(input))
            .forEach((input) => {
                input.addEventListener('change', validateDateOrdering);
                input.addEventListener('blur', validateDateOrdering);
            });
    }

    if (!isLimitedEditMode && photoLinkInput) {
        photoLinkInput.addEventListener('input', validatePhotoLinkFormat);
        photoLinkInput.addEventListener('blur', validatePhotoLinkFormat);
    }
}

// Initializes static map preview container.
function initializeMap() {
    mapContainerElement = document.getElementById('eventMap');
    if (!mapContainerElement) {
        console.error('Map container not found');
        return;
    }

    mapContainerElement.innerHTML = `
        <div class="map-top-controls" style="display:flex; justify-content:flex-end; padding:10px 12px;">
            <button id="toggleMapModeBtn" type="button" class="btn-toggle-map text-sm font-regular">Switch to Interactive Map</button>
        </div>
        <div class="static-map-preview" style="display:flex; flex-direction:column; gap:10px; width:100%; flex:1;">
            <div style="position:relative; width:100%; flex:1; min-height:300px; border-radius:14px; border:1px solid #d6d6d6; overflow:hidden; background:#f3f3f3;">
                <canvas id="eventStaticMapCanvas" aria-label="Event map preview" style="display:block; width:100%; height:100%;"></canvas>
                <button id="eventStaticMarker" type="button" style="position:absolute; left:50%; top:50%; transform:translate(-50%, -100%); background:transparent; border:none; padding:0; margin:0; cursor:pointer;">
                    <span id="eventStaticMarkerLabel" style="display:none; position:absolute; left:50%; bottom:46px; transform:translateX(-50%); background:rgba(30,30,30,0.9); color:#fff; border-radius:999px; padding:6px 10px; font:500 13px 'Segoe UI',sans-serif; white-space:nowrap;"></span>
                    <span id="eventStaticMarkerIcon" style="display:block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));"></span>
                </button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span id="eventStaticMapCaption" class="text-sm font-regular" style="color:#4b4b4b; padding:10px;">Map preview</span>
            </div>
        </div>
    `;

    staticMapCanvasElement = document.getElementById('eventStaticMapCanvas');
    staticMapCaptionElement = document.getElementById('eventStaticMapCaption');
    staticMapMarkerElement = document.getElementById('eventStaticMarker');
    staticMapMarkerIconElement = document.getElementById('eventStaticMarkerIcon');
    staticMapMarkerLabelElement = document.getElementById('eventStaticMarkerLabel');

    // Attach toggle button handler created inside the map container
    const toggleBtn = document.getElementById('toggleMapModeBtn');
    if (toggleBtn) {
        toggleBtn.textContent = isInteractiveMap ? 'Switch to Static Map' : 'Switch to Interactive Map';
        toggleBtn.addEventListener('click', () => {
            if (isInteractiveMap) {
                showStaticMap();
            } else {
                showLeafletMap();
            }
        });
    }

    if (staticMapMarkerElement && staticMapMarkerLabelElement) {
        const showMarkerLabel = () => {
            staticMapMarkerLabelElement.style.display = 'block';
        };

        const hideMarkerLabel = () => {
            staticMapMarkerLabelElement.style.display = 'none';
        };

        staticMapMarkerElement.addEventListener('mouseenter', showMarkerLabel);
        staticMapMarkerElement.addEventListener('focus', showMarkerLabel);
        staticMapMarkerElement.addEventListener('mouseleave', hideMarkerLabel);
        staticMapMarkerElement.addEventListener('blur', hideMarkerLabel);
    }

    renderStaticMapPreview(defaultLocation.lat, defaultLocation.lng, 'KMITL, Bangkok, Thailand', 0, 0);
}

// Builds planner place icon markup, with or without a number.
function createPlaceIcon(placeNumber = 1) {
    // For empty template rows (placeNumber === 0), show empty shield without number
    if (placeNumber === 0) {
        return `
            <svg class="place-icon" width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
                <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
            </svg>
        `;
    }
    // For numbered places, show shield with number
    return `
        <svg class="place-icon" width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
            <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
            <text x="17.5" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="#232C22">${placeNumber}</text>
        </svg>
    `;
}

// Creates one expense row for the planner.
function createExpenseRow() {
    const expenseRow = document.createElement('div');
    expenseRow.className = 'planner-expense-row';
    expenseRow.innerHTML = `
        <input 
            type="text" 
            class="input-field section-placeholder planner-expense-name-input" 
            placeholder="Expense name" 
            data-text-size="sm" 
            data-font-weight="regular"
        >
        <div class="price-input">
            <input 
                type="number" 
                class="input-field section-placeholder planner-expense-input" 
                placeholder="0" 
                min="0" 
                step="0.01" 
                data-text-size="sm" 
                data-font-weight="regular"
            >
            <span>$</span>
        </div>
        <button type="button" class="action-btn planner-expense-delete-btn" title="Delete expense" aria-label="Delete expense">✕</button>
    `;

    return expenseRow;
}

// Creates one draggable planner row.
function createPlanRow() {
    const planRow = document.createElement('div');
    planRow.className = 'place-item planner-item';
    planRow.dataset.placeNumber = '0'; // Placeholder, will be recalculated
    planRow.draggable = true;
    planRow.innerHTML = `
        <button type="button" class="drag-handle" aria-label="Drag to reorder" title="Drag to reorder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="3" r="1.5" fill="#666"/>
                <circle cx="10" cy="3" r="1.5" fill="#666"/>
                <circle cx="6" cy="8" r="1.5" fill="#666"/>
                <circle cx="10" cy="8" r="1.5" fill="#666"/>
                <circle cx="6" cy="13" r="1.5" fill="#666"/>
                <circle cx="10" cy="13" r="1.5" fill="#666"/>
            </svg>
        </button>
        ${createPlaceIcon(0)}
        <input 
            type="text" 
            class="input-field section-placeholder planner-place-input"
            placeholder="Add place"
            data-text-size="sm"
            data-font-weight="regular"
        >
        <div class="place-actions">
            <button type="button" class="action-btn planner-note-btn" title="Toggle note" aria-label="Toggle note">
                <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M11.4583 2.08331H9.37492C4.16659 2.08331 2.08325 4.16665 2.08325 9.37498V15.625C2.08325 20.8333 4.16659 22.9166 9.37492 22.9166H15.6249C20.8333 22.9166 22.9166 20.8333 22.9166 15.625V13.5416" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16.7085 3.14585L8.50012 11.3542C8.18762 11.6667 7.87512 12.2813 7.81262 12.7292L7.3647 15.8646C7.19803 17 8.00012 17.7917 9.13553 17.6354L12.271 17.1875C12.7085 17.125 13.323 16.8125 13.646 16.5L21.8543 8.29169C23.271 6.87502 23.9376 5.22919 21.8543 3.14585C19.771 1.06252 18.1251 1.72919 16.7085 3.14585Z" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15.5312 4.32294C16.2292 6.81252 18.1771 8.76044 20.6771 9.46877" stroke="black" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button type="button" class="action-btn planner-expense-btn" title="Toggle expense" aria-label="Toggle expense">
                <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M19.6978 15.3047C19.6978 16.6485 20.8019 17.7422 22.1457 17.7422C22.1457 21.6485 21.1665 22.6276 17.2603 22.6276H7.48942C3.58317 22.6276 2.604 21.6485 2.604 17.7422V17.263C3.94775 17.263 5.05192 16.1589 5.05192 14.8151C5.05192 13.4714 3.94775 12.3672 2.604 12.3672V11.888C2.61442 7.98179 3.58317 7.00262 7.48942 7.00262H17.2498C21.1561 7.00262 22.1353 7.98179 22.1353 11.888V12.8672C20.7915 12.8672 19.6978 13.9505 19.6978 15.3047Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16.8867 7.00265H7.41797L10.4701 3.95056C12.9596 1.46098 14.2096 1.46098 16.6992 3.95056L17.3242 4.57556C16.668 5.23181 16.5117 6.20056 16.8867 7.00265Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10.2905 7.00281L10.2905 22.6278" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 5"/>
                </svg>
            </button>
            <button type="button" class="action-btn planner-delete-btn" title="Delete plan" aria-label="Delete plan">
                <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M12.5 2.08331C10.6727 2.08331 9.15123 3.44864 8.89585 5.20831H5.33242C5.28806 5.20072 5.24314 5.19698 5.19814 5.19712C5.15926 5.19796 5.1205 5.2017 5.08217 5.20831H3.38539C3.28187 5.20685 3.17909 5.22597 3.08302 5.26458C2.98695 5.30318 2.89951 5.3605 2.82578 5.43319C2.75206 5.50588 2.69351 5.5925 2.65355 5.68801C2.6136 5.78352 2.59302 5.88603 2.59302 5.98956C2.59302 6.0931 2.6136 6.1956 2.65355 6.29111C2.69351 6.38663 2.75206 6.47325 2.82578 6.54594C2.89951 6.61863 2.98695 6.67594 3.08302 6.71455C3.17909 6.75315 3.28187 6.77228 3.38539 6.77081H4.49929L5.81052 20.3277C5.95171 21.7895 7.19361 22.9166 8.66188 22.9166H16.3371C17.8054 22.9166 19.0473 21.7896 19.1884 20.3277L20.5007 6.77081H21.6146C21.7181 6.77228 21.8209 6.75315 21.9169 6.71455C22.013 6.67594 22.1004 6.61863 22.1742 6.54594C22.2479 6.47325 22.3064 6.38663 22.3464 6.29111C22.3864 6.1956 22.4069 6.0931 22.4069 5.98956C22.4069 5.88603 22.3864 5.78352 22.3464 5.68801C22.3064 5.5925 22.2479 5.50588 22.1742 5.43319C22.1004 5.3605 22.013 5.30318 21.9169 5.26458C21.8209 5.22597 21.7181 5.20685 21.6146 5.20831H19.9188C19.8359 5.19487 19.7514 5.19487 19.6686 5.20831H16.1041C15.8487 3.44864 14.3272 2.08331 12.5 2.08331ZM12.5 3.64581C13.4787 3.64581 14.2816 4.30631 14.5111 5.20831H10.4889C10.7183 4.30631 11.5213 3.64581 12.5 3.64581ZM6.06789 6.77081H18.931L17.633 20.1772C17.5679 20.8517 17.0145 21.3541 16.3371 21.3541H8.66188C7.98536 21.3541 7.43097 20.8508 7.3659 20.1772L6.06789 6.77081ZM10.6649 9.36379C10.4578 9.36702 10.2606 9.4523 10.1164 9.60088C9.97217 9.74946 9.89284 9.9492 9.89581 10.1562V17.9687C9.89435 18.0723 9.91347 18.175 9.95208 18.2711C9.99068 18.3672 10.048 18.4546 10.1207 18.5283C10.1934 18.6021 10.28 18.6606 10.3755 18.7006C10.471 18.7405 10.5735 18.7611 10.6771 18.7611C10.7806 18.7611 10.8831 18.7405 10.9786 18.7006C11.0741 18.6606 11.1607 18.6021 11.2334 18.5283C11.3061 18.4546 11.3634 18.3672 11.402 18.2711C11.4406 18.175 11.4598 18.0723 11.4583 17.9687V10.1562C11.4598 10.0517 11.4403 9.94786 11.4009 9.85097C11.3616 9.75409 11.3032 9.66608 11.2292 9.59219C11.1552 9.51829 11.0671 9.45999 10.9702 9.42076C10.8732 9.38153 10.7694 9.36216 10.6649 9.36379ZM14.3107 9.36379C14.1037 9.36702 13.9064 9.4523 13.7622 9.60088C13.618 9.74946 13.5387 9.9492 13.5416 10.1562V17.9687C13.5402 18.0723 13.5593 18.175 13.5979 18.2711C13.6365 18.3672 13.6938 18.4546 13.7665 18.5283C13.8392 18.6021 13.9258 18.6606 14.0213 18.7006C14.1169 18.7405 14.2194 18.7611 14.3229 18.7611C14.4264 18.7611 14.5289 18.7405 14.6244 18.7006C14.72 18.6606 14.8066 18.6021 14.8793 18.5283C14.952 18.4546 15.0093 18.3672 15.0479 18.2711C15.0865 18.175 15.1056 18.0723 15.1041 17.9687V10.1562C15.1056 10.0517 15.0861 9.94786 15.0468 9.85097C15.0074 9.75409 14.949 9.66608 14.875 9.59219C14.801 9.51829 14.713 9.45999 14.616 9.42076C14.5191 9.38153 14.4153 9.36216 14.3107 9.36379Z" fill="black"/>
                </svg>
            </button>
        </div>
        <div class="planner-details">
            <textarea 
                class="textarea-field auto-resize section-placeholder planner-note-input hidden" 
                rows="1"
                placeholder="Add note"
                data-text-size="sm"
                data-font-weight="regular"
                oninput="autoResize(this)"
            ></textarea>
            <div class="planner-expense-wrap hidden"></div>
        </div>
    `;

    return planRow;
}

// Creates a day section with an initial empty planner row.
function createDay(dayNumber) {
    const dayElement = document.createElement('div');
    dayElement.className = 'event-plan-day';
    dayElement.dataset.day = String(dayNumber);
    dayElement.innerHTML = `
        <div class="event-plan-day-header">
            <label class="text-lg font-semibold text-dark">DAY ${dayNumber}</label>
            <input type="date" class="input-field day-date-input" data-text-size="sm" data-font-weight="regular">
        </div>
        <div class="planner-day-rows"></div>
    `;

    const rowsContainer = dayElement.querySelector('.planner-day-rows');
    rowsContainer.appendChild(createPlanRow());
    plannerDaysContainer.appendChild(dayElement);
    recalculatePlaceNumbers(); // Recalculate all numbers after adding new day
    return dayElement;
}

// Returns planner rows for a given day.
function getRows(dayElement) {
    return Array.from(dayElement.querySelectorAll('.planner-item'));
}

// Checks whether a planner row has a place value.
function hasPlaceValue(rowElement) {
    const placeInput = rowElement.querySelector('.planner-place-input');
    return Boolean(placeInput && placeInput.value.trim() !== '');
}

// Ensures a day ends with one empty planner row.
function ensureTrailingEmptyRow(dayElement) {
    const rows = getRows(dayElement);
    const lastRow = rows[rows.length - 1];

    if (!lastRow || hasPlaceValue(lastRow)) {
        dayElement.querySelector('.planner-day-rows').appendChild(createPlanRow());
        recalculatePlaceNumbers(); // Recalculate all numbers after adding new row
    }
}

// Creates the next day when the current day has content.
function ensureNextDay(currentDayElement) {
    const dayNumber = Number(currentDayElement.dataset.day);
    if (!Number.isFinite(dayNumber)) {
        return;
    }

    const hasValueInCurrentDay = getRows(currentDayElement).some(hasPlaceValue);
    if (!hasValueInCurrentDay) {
        return;
    }

    const nextDay = plannerDaysContainer.querySelector(`.event-plan-day[data-day="${dayNumber + 1}"]`);
    if (!nextDay) {
        createDay(dayNumber + 1);
    }
}

// Recalculates and renders the planner expense total.
function updateTotalExpenses() {
    const expenseInputs = plannerDaysContainer.querySelectorAll('.planner-expense-input');
    let total = 0;

    expenseInputs.forEach((input) => {
        const amount = Number.parseFloat(input.value);
        if (Number.isFinite(amount) && amount > 0) {
            total += amount;
        }
    });

    plannerTotalAmount.textContent = `$ ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Returns all packing list rows.
function getPackRows() {
    if (!importantPackRows) {
        return [];
    }

    return Array.from(importantPackRows.querySelectorAll('.pack-item'));
}

// Checks whether a packing row has text.
function hasPackValue(rowElement) {
    const packInput = rowElement.querySelector('.pack-input');
    return Boolean(packInput && packInput.value.trim() !== '');
}

// Creates one draggable packing row.
function createPackRow() {
    const packRow = document.createElement('div');
    packRow.className = 'checkbox-item pack-item';
    packRow.draggable = true;
    packRow.innerHTML = `
        <button type="button" class="drag-handle" aria-label="Drag to reorder" title="Drag to reorder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="3" r="1.5" fill="#666"/>
                <circle cx="10" cy="3" r="1.5" fill="#666"/>
                <circle cx="6" cy="8" r="1.5" fill="#666"/>
                <circle cx="10" cy="8" r="1.5" fill="#666"/>
                <circle cx="6" cy="13" r="1.5" fill="#666"/>
                <circle cx="10" cy="13" r="1.5" fill="#666"/>
            </svg>
        </button>
        <input type="checkbox" class="pack-checkbox" name="pack">
        <input type="text" class="input-field pack-input" placeholder="Add some items" data-text-size="md" data-font-weight="regular">
    `;

    return packRow;
}

// Ensures the packing list ends with one empty row.
function ensureTrailingEmptyPackRow() {
    if (!importantPackRows) {
        return;
    }

    const rows = getPackRows();
    const lastRow = rows[rows.length - 1];

    if (!lastRow || hasPackValue(lastRow)) {
        importantPackRows.appendChild(createPackRow());
    }
}

if (plannerDaysContainer) {
    plannerDaysContainer.addEventListener('input', (event) => {
    const target = event.target;

    if (target.classList.contains('planner-place-input')) {
        const currentRow = target.closest('.planner-item');
        const currentDay = target.closest('.event-plan-day');
        if (!currentRow || !currentDay) {
            return;
        }

        const inputValue = target.value.trim();

        const plannerValidationMessage = document.querySelector('.field-validation-message[data-valmsg-for="PlannerJson"]');
        if (plannerValidationMessage && plannerValidationMessage.textContent) {
            plannerValidationMessage.textContent = '';
        }

        if (inputValue.includes('google.com/maps')) {
            const location = parseGoogleMapsURL(inputValue);
            if (location) {
                currentRow.dataset.markerLat = String(location.lat);
                currentRow.dataset.markerLng = String(location.lng);
                currentRow.dataset.markerName = location.name;
                currentRow.dataset.googleMapUrl = inputValue;
                target.value = location.name;
                addMapMarker(location.lat, location.lng, location.name);
            }
        } else {
            const hasStoredMarker = currentRow.dataset.markerLat && currentRow.dataset.markerLng;
            const markerName = currentRow.dataset.markerName || '';
            if (hasStoredMarker && inputValue !== markerName) {
                delete currentRow.dataset.markerLat;
                delete currentRow.dataset.markerLng;
                delete currentRow.dataset.markerName;
                delete currentRow.dataset.googleMapUrl;
            }
        }

        const normalizedInputValue = target.value.trim();

        const rows = getRows(currentDay);
        const isLastRow = rows[rows.length - 1] === currentRow;

        if (normalizedInputValue !== '' && isLastRow) {
            ensureTrailingEmptyRow(currentDay);
        }

        ensureNextDay(currentDay);
        recalculatePlaceNumbers();
    }

    if (target.classList.contains('planner-expense-input')) {
        updateTotalExpenses();
    }
    });

    plannerDaysContainer.addEventListener('click', (event) => {
    const target = event.target;
    const rowElement = target.closest('.planner-item');

    if (!rowElement) {
        return;
    }

    const noteBtn = target.closest('.planner-note-btn');
    if (noteBtn) {
        const noteInput = rowElement.querySelector('.planner-note-input');
        if (noteInput.classList.contains('hidden')) {
            noteInput.classList.remove('hidden');
            noteInput.focus();
            autoResize(noteInput);
        }
        return;
    }

    const expenseBtn = target.closest('.planner-expense-btn');
    if (expenseBtn) {
        const expenseWrap = rowElement.querySelector('.planner-expense-wrap');
        expenseWrap.classList.remove('hidden');
        const newExpenseRow = createExpenseRow();
        expenseWrap.appendChild(newExpenseRow);
        newExpenseRow.querySelector('.planner-expense-name-input').focus();
        updateTotalExpenses();
        return;
    }

    const expenseDeleteBtn = target.closest('.planner-expense-delete-btn');
    if (expenseDeleteBtn) {
        const expenseRow = expenseDeleteBtn.closest('.planner-expense-row');
        const expenseWrap = expenseDeleteBtn.closest('.planner-expense-wrap');

        if (expenseRow) {
            expenseRow.remove();
        }

        if (expenseWrap && expenseWrap.querySelectorAll('.planner-expense-row').length === 0) {
            expenseWrap.classList.add('hidden');
        }

        updateTotalExpenses();
        return;
    }

    const deleteBtn = target.closest('.planner-delete-btn');
    if (deleteBtn) {
        const dayElement = rowElement.closest('.event-plan-day');
        const rows = getRows(dayElement);

        if (rows.length === 1) {
            rowElement.querySelector('.planner-place-input').value = '';
            delete rowElement.dataset.markerLat;
            delete rowElement.dataset.markerLng;
            delete rowElement.dataset.markerName;
            delete rowElement.dataset.googleMapUrl;
            rowElement.querySelector('.planner-note-input').value = '';
            rowElement.querySelector('.planner-note-input').classList.add('hidden');
            const expenseWrap = rowElement.querySelector('.planner-expense-wrap');
            expenseWrap.innerHTML = '';
            expenseWrap.classList.add('hidden');
        } else {
            rowElement.remove();
        }

        ensureTrailingEmptyRow(dayElement);
        recalculatePlaceNumbers(); // Recalculate all numbers after deletion
        updateTotalExpenses();
    }
    });
}

if (importantPackRows) {
    importantPackRows.addEventListener('input', (event) => {
        const target = event.target;
        if (!target.classList.contains('pack-input')) {
            return;
        }

        const currentRow = target.closest('.pack-item');
        if (!currentRow) {
            return;
        }

        const rows = getPackRows();
        const isLastRow = rows[rows.length - 1] === currentRow;

        if (target.value.trim() !== '' && isLastRow) {
            ensureTrailingEmptyPackRow();
        }
    });

    ensureTrailingEmptyPackRow();
}

// Starts drag state for planner and packing rows.
function handleDragStart(event) {
    draggedElement = event.target;
    draggedType = draggedElement.classList.contains('planner-item') ? 'plan' : 'pack';
    draggedSourceDay = draggedType === 'plan' ? draggedElement.closest('.event-plan-day') : null;
    
    // Don't allow dragging empty template rows
    if (draggedType === 'plan' && !hasPlaceValue(draggedElement)) {
        event.preventDefault();
        return;
    }
    if (draggedType === 'pack' && !hasPackValue(draggedElement)) {
        event.preventDefault();
        return;
    }
    
    draggedElement.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

// Maintains drag-over state and validates compatible drop targets.
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const target = event.target.closest('.planner-item, .pack-item');
    if (!target || target === draggedElement) {
        return;
    }

    const targetType = target.classList.contains('planner-item') ? 'plan' : 'pack';
    if (targetType !== draggedType) {
        return;
    }

    target.classList.add('drag-over');
}

// Removes drag-over styling when leaving a row.
function handleDragLeave(event) {
    const target = event.target.closest('.planner-item, .pack-item');
    if (target) {
        target.classList.remove('drag-over');
    }
}

// Moves dragged rows and re-syncs planner numbering state.
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target.closest('.planner-item, .pack-item');
    if (!target || target === draggedElement) {
        return;
    }
    
    const targetType = target.classList.contains('planner-item') ? 'plan' : 'pack';
    if (targetType !== draggedType) {
        return;
    }
    
    target.classList.remove('drag-over');
    
    const isPlanTemplateTarget = draggedType === 'plan' && !hasPlaceValue(target);
    const isPackTemplateTarget = draggedType === 'pack' && !hasPackValue(target);

    const targetContainer = target.parentNode;
    const sameContainer = targetContainer === draggedElement.parentNode;

    if (isPlanTemplateTarget) {
        targetContainer.insertBefore(draggedElement, target);
    } else if (isPackTemplateTarget) {
        targetContainer.insertBefore(draggedElement, target);
    } else if (sameContainer) {
        const allItems = Array.from(targetContainer.children);
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(target);
        if (draggedIndex < targetIndex) {
            targetContainer.insertBefore(draggedElement, target.nextSibling);
        } else {
            targetContainer.insertBefore(draggedElement, target);
        }
    } else {
        targetContainer.insertBefore(draggedElement, target);
    }

    if (draggedType === 'plan') {
        if (draggedSourceDay) {
            ensureTrailingEmptyRow(draggedSourceDay);
        }
        const targetDay = draggedElement.closest('.event-plan-day');
        if (targetDay) {
            ensureTrailingEmptyRow(targetDay);
        }
        recalculatePlaceNumbers();
    }
}

// Clears drag state and temporary drag-over classes.
function handleDragEnd(event) {
    event.target.classList.remove('dragging');

    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedType = null;
    draggedSourceDay = null;
}

if (plannerDaysContainer) {
    plannerDaysContainer.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('planner-item')) {
            handleDragStart(event);
        }
    });
    
    plannerDaysContainer.addEventListener('dragover', handleDragOver);
    plannerDaysContainer.addEventListener('dragleave', handleDragLeave);
    plannerDaysContainer.addEventListener('drop', handleDrop);
    plannerDaysContainer.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('planner-item')) {
            handleDragEnd(event);
        }
    });
}

if (importantPackRows) {
    importantPackRows.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('pack-item')) {
            handleDragStart(event);
        }
    });
    
    importantPackRows.addEventListener('dragover', handleDragOver);
    importantPackRows.addEventListener('dragleave', handleDragLeave);
    importantPackRows.addEventListener('drop', handleDrop);
    importantPackRows.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('pack-item')) {
            handleDragEnd(event);
        }
    });
}

// Initializes create-event page behavior on DOM ready.

let leafletMap = null;
let leafletMarkers = [];
let leafletDefaultMarker = null;
let isInteractiveMap = false;

function showStaticMap() {
    const staticPreview = document.getElementById('eventMap').querySelector('.static-map-preview');
    if (staticPreview) staticPreview.style.display = '';
    const leafletDiv = document.getElementById('leafletMapContainer');
    if (leafletDiv) leafletDiv.style.display = 'none';
    const btn = document.getElementById('toggleMapModeBtn');
    if (btn) btn.textContent = 'Switch to Interactive Map';
    isInteractiveMap = false;
}


function createLeafletMarkerIcon(placeNumber = null) {
    // Use the same SVG as createMapMarkerSVG
    let svgString;
    if (placeNumber !== null && placeNumber > 0) {
        svgString = `
            <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
                <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
                <text x="17.5" y="21" text-anchor="middle" font-size="13" font-weight="bold" font-family="Segoe UI, sans-serif" fill="#232C22">${placeNumber}</text>
            </svg>
        `;
    } else {
        svgString = `
            <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
                <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
            </svg>
        `;
    }
    return L.divIcon({
        className: '',
        html: svgString,
        iconSize: [35, 41],
        iconAnchor: [17, 41],
        popupAnchor: [0, -41]
    });
}

function updateLeafletMarkers() {
    if (!leafletMap) return;
    // Remove old markers
    if (leafletMarkers && leafletMarkers.length) {
        leafletMarkers.forEach(m => leafletMap.removeLayer(m));
    }
    leafletMarkers = [];
    if (leafletDefaultMarker) {
        leafletMap.removeLayer(leafletDefaultMarker);
        leafletDefaultMarker = null;
    }

    // Gather all places from planner rows or externalMapPlaces
    let places = [];
    if (plannerDaysContainer) {
        const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
        allRows.forEach((row) => {
            const lat = Number.parseFloat(row.dataset.markerLat);
            const lng = Number.parseFloat(row.dataset.markerLng);
            const placeNumber = Number.parseInt(row.dataset.placeNumber, 10);
            const name = row.dataset.markerName || row.querySelector('.planner-place-input')?.value?.trim() || 'Location';
            if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(placeNumber) && placeNumber > 0) {
                places.push({ lat, lng, name, placeNumber });
            }
        });
    } else if (Array.isArray(window.externalMapPlaces) && window.externalMapPlaces.length > 0) {
        window.externalMapPlaces.forEach((p, idx) => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                places.push({ lat, lng, name: p.name || 'Location', placeNumber: idx + 1 });
            }
        });
    }

    let bounds = [];
    if (places.length > 0) {
        places.forEach((pl) => {
            const marker = L.marker([pl.lat, pl.lng], { icon: createLeafletMarkerIcon(pl.placeNumber) });
            marker.bindTooltip(pl.name, { permanent: false, direction: 'top', className: 'leaflet-marker-tooltip', offset: L.point(0, -45) });
            marker.addTo(leafletMap);
            leafletMarkers.push(marker);
            bounds.push([pl.lat, pl.lng]);
        });
        leafletMap.fitBounds(bounds, { padding: [30, 30] });
    } else {
        // Show default marker at default location using same marker SVG but without number
        leafletDefaultMarker = L.marker([defaultLocation.lat, defaultLocation.lng], {
            icon: createLeafletMarkerIcon(null)
        }).addTo(leafletMap);
        leafletDefaultMarker.bindTooltip('KMITL, Bangkok, Thailand', { permanent: false, direction: 'top', className: 'leaflet-marker-tooltip', offset: L.point(0, -45) });
        leafletMap.setView([defaultLocation.lat, defaultLocation.lng], STATIC_MAP_ZOOM);
    }
}

function showLeafletMap() {
    let leafletDiv = document.getElementById('leafletMapContainer');
    if (!leafletDiv) {
        leafletDiv = document.createElement('div');
        leafletDiv.id = 'leafletMapContainer';
        leafletDiv.className = 'map-content';
        document.getElementById('eventMap').appendChild(leafletDiv);
    }
    leafletDiv.style.display = '';
    const staticPreview = document.getElementById('eventMap').querySelector('.static-map-preview');
    if (staticPreview) staticPreview.style.display = 'none';
    const btn = document.getElementById('toggleMapModeBtn');
    if (btn) btn.textContent = 'Switch to Static Map';
    isInteractiveMap = true;

    // Initialize Leaflet map if not already
    if (!leafletMap) {
        leafletMap = L.map('leafletMapContainer').setView([defaultLocation.lat, defaultLocation.lng], STATIC_MAP_ZOOM);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap);
    }
    leafletMap.invalidateSize();
    updateLeafletMarkers();
}

document.addEventListener('DOMContentLoaded', () => {
    initializePhotoUpload();
    initializeTagButtons();
    bindCreateEventFormSubmit();
    applyInitialCategoryAndTags();
    applyInitialPackingList();

    if (plannerDaysContainer) {
        applyInitialPlannerRows();
        // Update markers when itinerary changes
        const refreshMarkers = () => { if (isInteractiveMap) updateLeafletMarkers(); };
        plannerDaysContainer.addEventListener('input', refreshMarkers);
        plannerDaysContainer.addEventListener('click', refreshMarkers);
        plannerDaysContainer.addEventListener('change', refreshMarkers);
        plannerDaysContainer.addEventListener('DOMSubtreeModified', refreshMarkers);
    }

    // Map toggle button logic
    const toggleBtn = document.getElementById('toggleMapModeBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (isInteractiveMap) {
                showStaticMap();
            } else {
                showLeafletMap();
            }
        });
    }
});
