function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

let tagHandlersInitialized = false;

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

function initializePhotoUpload() {
    const uploadButton = document.getElementById('uploadPhotoButton');
    const uploadInput = document.getElementById('uploadPhotoInput');
    const photoPlaceholder = document.querySelector('.photo-placeholder');

    if (!uploadButton || !uploadInput || !photoPlaceholder) {
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

        const objectUrl = URL.createObjectURL(selectedFile);
        photoPlaceholder.style.backgroundImage = `url('${objectUrl}')`;
    });
}

const plannerDaysContainer = document.getElementById('eventPlannerDays');
const plannerTotalAmount = document.getElementById('plannerTotalAmount');
const importantPackRows = document.getElementById('importantPackRows');

// Drag and drop state
let draggedElement = null;
let draggedType = null; // 'plan' or 'pack'
let draggedSourceDay = null;

// Leaflet Map initialization
let map;
let placeMarkersLayer;
let defaultMapMarker;
const defaultLocation = { lat: 13.7298889, lng: 100.7756574 }; // KMITL

// Recalculate place numbers throughout the entire event
// Only number rows that have actual place data (not empty templates)
function recalculatePlaceNumbers() {
    const allRows = plannerDaysContainer.querySelectorAll('.planner-item');
    let placeNumber = 0;
    
    allRows.forEach((row) => {
        // Only number rows that have actual place data
        if (hasPlaceValue(row)) {
            placeNumber++;
            row.dataset.placeNumber = String(placeNumber);
            
            // Update the place icon SVG with new number
            const placeIcon = row.querySelector('.place-icon');
            if (placeIcon) {
                placeIcon.outerHTML = createPlaceIcon(placeNumber);
            }
        } else {
            // Empty template rows don't get numbered
            row.dataset.placeNumber = '0';
            
            // Update the place icon SVG to show placeholder (0)
            const placeIcon = row.querySelector('.place-icon');
            if (placeIcon) {
                placeIcon.outerHTML = createPlaceIcon(0);
            }
        }
    });

    syncMapMarkers();
    return placeNumber;
}

function syncMapMarkers() {
    if (!map || !placeMarkersLayer) {
        return;
    }

    placeMarkersLayer.clearLayers();
    let placeMarkerCount = 0;

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

        const markerLabel = row.dataset.markerName || row.querySelector('.planner-place-input')?.value?.trim() || 'Location';
        const customIcon = L.icon({
            iconUrl: getSVGDataURL(createMapMarkerSVG(placeNumber)),
            iconSize: [35, 41],
            iconAnchor: [17.5, 41],
            popupAnchor: [0, -41]
        });

        L.marker([lat, lng], { icon: customIcon })
            .bindPopup(markerLabel)
            .addTo(placeMarkersLayer);
        placeMarkerCount++;
    });

    if (defaultMapMarker) {
        if (placeMarkerCount > 0) {
            if (map.hasLayer(defaultMapMarker)) {
                map.removeLayer(defaultMapMarker);
            }
        } else if (!map.hasLayer(defaultMapMarker)) {
            defaultMapMarker.addTo(map);
        }
    }
}

function createMapMarkerSVG(placeNumber = null) {
    // SVG marker with optional number for map markers
    if (placeNumber !== null && placeNumber > 0) {
        return `
            <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
                <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
                <text x="17.5" y="21" text-anchor="middle" font-size="13" font-weight="bold" font-family="Segoe UI, sans-serif" fill="#232C22">${placeNumber}</text>
            </svg>
        `;
    }
    // Default marker without number for default location
    return `
        <svg width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
            <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
        </svg>
    `;
}

function getSVGDataURL(svgString) {
    const encoded = encodeURIComponent(svgString);
    return `data:image/svg+xml,${encoded}`;
}

function parseGoogleMapsURL(url) {
    try {
        // Extract place name from URL path
        // Format: /maps/place/PLACE_NAME/@coordinates
        const placeMatch = url.match(/\/maps\/place\/([^/@]+)/);
        let placeName = 'Unknown Location';
        
        if (placeMatch) {
            placeName = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
        }

        // Prefer the last !3d..!4d.. pair because URLs can contain multiple pairs.
        // The first pair is often the map viewport and can cause different places to share one coordinate.
        const coordPairs = Array.from(url.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g));

        let lat;
        let lng;

        if (coordPairs.length > 0) {
            const lastPair = coordPairs[coordPairs.length - 1];
            lat = Number.parseFloat(lastPair[1]);
            lng = Number.parseFloat(lastPair[2]);
        } else {
            // Fallback: links like .../@13.736,100.523,17z
            const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
            if (atMatch) {
                lat = Number.parseFloat(atMatch[1]);
                lng = Number.parseFloat(atMatch[2]);
            }
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        // Validate that coordinates are reasonable
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.warn('Invalid coordinates parsed from URL');
            return null;
        }

        console.log('Parsed location:', { lat, lng, name: placeName }); // Debug log
        return { lat, lng, name: placeName };
    } catch (error) {
        console.error('Error parsing Google Maps URL:', error);
        return null;
    }
}

function addMapMarker(lat, lng, name, placeNumber = null) {
    if (!map) return;

    const customIcon = L.icon({
        iconUrl: getSVGDataURL(createMapMarkerSVG(placeNumber)),
        iconSize: [35, 41],
        iconAnchor: [17.5, 41],
        popupAnchor: [0, -41]
    });

    L.marker([lat, lng], { icon: customIcon })
        .bindPopup(name)
        .addTo(map);

    // Pan to the new marker
    map.setView([lat, lng], 16);
}

function initializeMap() {
    const mapContainer = document.getElementById('eventMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    // Initialize Leaflet map
    map = L.map('eventMap').setView([defaultLocation.lat, defaultLocation.lng], 18);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Create custom marker icon
    const customIcon = L.icon({
        iconUrl: getSVGDataURL(createMapMarkerSVG()),
        iconSize: [35, 41],
        iconAnchor: [17.5, 41],
        popupAnchor: [0, -41]
    });

    // Add marker with custom icon
    defaultMapMarker = L.marker([defaultLocation.lat, defaultLocation.lng], { icon: customIcon })
        .bindPopup('KMITL, Bangkok, Thailand')
        .addTo(map);

    placeMarkersLayer = L.layerGroup().addTo(map);
}

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

function getRows(dayElement) {
    return Array.from(dayElement.querySelectorAll('.planner-item'));
}

function hasPlaceValue(rowElement) {
    const placeInput = rowElement.querySelector('.planner-place-input');
    return Boolean(placeInput && placeInput.value.trim() !== '');
}

function ensureTrailingEmptyRow(dayElement) {
    const rows = getRows(dayElement);
    const lastRow = rows[rows.length - 1];

    if (!lastRow || hasPlaceValue(lastRow)) {
        dayElement.querySelector('.planner-day-rows').appendChild(createPlanRow());
        recalculatePlaceNumbers(); // Recalculate all numbers after adding new row
    }
}

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

function getPackRows() {
    if (!importantPackRows) {
        return [];
    }

    return Array.from(importantPackRows.querySelectorAll('.pack-item'));
}

function hasPackValue(rowElement) {
    const packInput = rowElement.querySelector('.pack-input');
    return Boolean(packInput && packInput.value.trim() !== '');
}

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

plannerDaysContainer.addEventListener('input', (event) => {
    const target = event.target;

    if (target.classList.contains('planner-place-input')) {
        const currentRow = target.closest('.planner-item');
        const currentDay = target.closest('.event-plan-day');
        if (!currentRow || !currentDay) {
            return;
        }

        const inputValue = target.value.trim();

        if (inputValue.includes('google.com/maps')) {
            const location = parseGoogleMapsURL(inputValue);
            if (location) {
                currentRow.dataset.markerLat = String(location.lat);
                currentRow.dataset.markerLng = String(location.lng);
                currentRow.dataset.markerName = location.name;
                target.value = location.name;
                if (map) {
                    map.setView([location.lat, location.lng], 16);
                }
            }
        } else {
            const hasStoredMarker = currentRow.dataset.markerLat && currentRow.dataset.markerLng;
            const markerName = currentRow.dataset.markerName || '';
            if (hasStoredMarker && inputValue !== markerName) {
                delete currentRow.dataset.markerLat;
                delete currentRow.dataset.markerLng;
                delete currentRow.dataset.markerName;
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

// Drag and drop handlers
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

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const target = event.target.closest('.planner-item, .pack-item');
    if (!target || target === draggedElement) {
        return;
    }
    
    // Check if same type
    const targetType = target.classList.contains('planner-item') ? 'plan' : 'pack';
    if (targetType !== draggedType) {
        return;
    }
    
    // Allow dropping on the empty pack template row (we insert before it)
    
    target.classList.add('drag-over');
}

function handleDragLeave(event) {
    const target = event.target.closest('.planner-item, .pack-item');
    if (target) {
        target.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target.closest('.planner-item, .pack-item');
    if (!target || target === draggedElement) {
        return;
    }
    
    // Check if same type
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
        // Insert before the template row so it stays at the bottom.
        targetContainer.insertBefore(draggedElement, target);
    } else if (isPackTemplateTarget) {
        // Insert before the pack template row so it stays at the bottom.
        targetContainer.insertBefore(draggedElement, target);
    } else if (sameContainer) {
        // Reorder within the same container.
        const allItems = Array.from(targetContainer.children);
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(target);
        if (draggedIndex < targetIndex) {
            targetContainer.insertBefore(draggedElement, target.nextSibling);
        } else {
            targetContainer.insertBefore(draggedElement, target);
        }
    } else {
        // Move across days into the target container.
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

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedType = null;
    draggedSourceDay = null;
}

// Attach drag event listeners to plan rows container
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

// Attach drag event listeners to pack rows container
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

// Initialize planner with Day 1
document.addEventListener('DOMContentLoaded', () => {
    initializePhotoUpload();
    initializeTagButtons();

    if (plannerDaysContainer) {
        createDay(1);
    }
});
