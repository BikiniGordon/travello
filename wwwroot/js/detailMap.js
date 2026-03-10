function createMapMarkerSVG(placeNumber) {
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

function getSVGDataURL(svgString) {
    return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
}

function initializeDetailMap() {
    const mapContainer = document.getElementById('detailMap');
    if (!mapContainer || typeof itineraryData === 'undefined') return;

    const map = L.map('detailMap').setView([13.7563, 100.5018], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    let firstMarker = true;

    itineraryData.forEach((place, index) => {
        if (!place.lat || !place.lng) return;

        const placeNumber = index + 1;

        const customIcon = L.icon({
            iconUrl: getSVGDataURL(createMapMarkerSVG(placeNumber)),
            iconSize: [35, 41],
            iconAnchor: [17.5, 41],
            popupAnchor: [0, -41]
        });

        L.marker([place.lat, place.lng], { icon: customIcon })
            .bindPopup(`${place.name}</b>`)
            .addTo(map);

        if (firstMarker) {
            map.setView([place.lat, place.lng], 13);
            firstMarker = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeDetailMap);