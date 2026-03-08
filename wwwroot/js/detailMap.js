const DETAIL_MAP_FALLBACK_WIDTH = 1200;
const DETAIL_MAP_FALLBACK_HEIGHT = 540;
const DETAIL_MAP_MIN_ZOOM = 3;
const DETAIL_MAP_MAX_ZOOM = 15;
const DETAIL_MAP_PADDING = 90;
const detailTileCache = new Map();

function getCanvasCssSize(canvasElement) {
    return {
        width: Math.max(1, Math.round(canvasElement.clientWidth || DETAIL_MAP_FALLBACK_WIDTH)),
        height: Math.max(1, Math.round(canvasElement.clientHeight || DETAIL_MAP_FALLBACK_HEIGHT))
    };
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
    if (detailTileCache.has(tileUrl)) {
        return detailTileCache.get(tileUrl);
    }

    const tilePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = tileUrl;
    });

    detailTileCache.set(tileUrl, tilePromise);
    return tilePromise;
}

function buildMapPoints(locations) {
    return locations.map((location, index) => {
        const markerNumberRaw = Number(location.placeIndex);
        const markerNumber = Number.isFinite(markerNumberRaw) && markerNumberRaw > 0
            ? markerNumberRaw
            : index + 1;

        return {
            lat: Number(location.lat),
            lng: Number(location.lng),
            name: (location.name || 'Location').toString(),
            markerNumber
        };
    });
}

function createViewportForZoom(mapPoints, zoom) {
    const projectedPoints = mapPoints.map((point) => {
        const world = convertLatLngToWorldPixels(point.lat, point.lng, zoom);
        return {
            ...point,
            worldX: world.worldX,
            worldY: world.worldY
        };
    });

    const worldXValues = projectedPoints.map((point) => point.worldX);
    const worldYValues = projectedPoints.map((point) => point.worldY);

    const minWorldX = Math.min(...worldXValues);
    const maxWorldX = Math.max(...worldXValues);
    const minWorldY = Math.min(...worldYValues);
    const maxWorldY = Math.max(...worldYValues);

    return {
        zoom,
        points: projectedPoints,
        centerWorldX: (minWorldX + maxWorldX) / 2,
        centerWorldY: (minWorldY + maxWorldY) / 2,
        boundsWidth: maxWorldX - minWorldX,
        boundsHeight: maxWorldY - minWorldY
    };
}

function calculateBestViewport(mapPoints, viewportWidth, viewportHeight) {
    const maxAvailableWidth = viewportWidth - (DETAIL_MAP_PADDING * 2);
    const maxAvailableHeight = viewportHeight - (DETAIL_MAP_PADDING * 2);

    let fallbackViewport = createViewportForZoom(mapPoints, DETAIL_MAP_MIN_ZOOM);

    for (let zoom = DETAIL_MAP_MAX_ZOOM; zoom >= DETAIL_MAP_MIN_ZOOM; zoom -= 1) {
        const viewport = createViewportForZoom(mapPoints, zoom);
        fallbackViewport = viewport;

        if (viewport.boundsWidth <= maxAvailableWidth && viewport.boundsHeight <= maxAvailableHeight) {
            return viewport;
        }
    }

    return fallbackViewport;
}

function drawMarkerOnCanvas(context, x, y, markerNumber) {
    const bodyRadius = 14;
    const headY = y - 20;

    context.beginPath();
    context.moveTo(x, y + 10);
    context.lineTo(x - 8, y - 2);
    context.lineTo(x + 8, y - 2);
    context.closePath();
    context.fillStyle = '#232C22';
    context.fill();

    context.beginPath();
    context.arc(x, headY, bodyRadius, 0, Math.PI * 2);
    context.fillStyle = '#232C22';
    context.fill();

    context.beginPath();
    context.arc(x, headY, 8.5, 0, Math.PI * 2);
    context.fillStyle = '#E6E6E8';
    context.fill();

    if (Number.isFinite(markerNumber) && markerNumber > 0) {
        context.fillStyle = '#232C22';
        context.font = '700 11px Segoe UI';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(markerNumber), x, headY + 0.5);
    }
}

function projectMarkers(points, viewportStartX, viewportStartY) {
    return points.map((point) => {
        const markerX = Math.round(point.worldX - viewportStartX);
        const markerY = Math.round(point.worldY - viewportStartY);
        return {
            x: markerX,
            y: markerY,
            headX: markerX,
            headY: markerY - 20,
            markerNumber: point.markerNumber,
            name: point.name
        };
    });
}

function drawMarkersOnCanvas(context, projectedMarkers) {
    projectedMarkers.forEach((marker) => {
        drawMarkerOnCanvas(context, marker.x, marker.y, marker.markerNumber);
    });
}

function setupMarkerHover(canvasElement, projectedMarkers) {
    const wrapper = document.getElementById('detailMapCanvasWrap');
    const tooltip = document.getElementById('detailMarkerTooltip');
    if (!wrapper || !tooltip) {
        return;
    }

    const hitRadius = 16;

    const hideTooltip = () => {
        tooltip.style.display = 'none';
        canvasElement.style.cursor = 'default';
    };

    canvasElement.addEventListener('mousemove', (event) => {
        const rect = canvasElement.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;

        const hoveredMarker = projectedMarkers.find((marker) => {
            const dx = pointerX - marker.headX;
            const dy = pointerY - marker.headY;
            return (dx * dx) + (dy * dy) <= hitRadius * hitRadius;
        });

        if (!hoveredMarker) {
            hideTooltip();
            return;
        }

        tooltip.textContent = hoveredMarker.name;
        tooltip.style.display = 'block';
        tooltip.style.left = `${hoveredMarker.headX}px`;
        tooltip.style.top = `${Math.max(14, hoveredMarker.headY - 26)}px`;
        canvasElement.style.cursor = 'pointer';
    });

    canvasElement.addEventListener('mouseleave', hideTooltip);
}

async function renderMapTilesToCanvas(canvasElement, viewport, viewportWidth, viewportHeight) {
    const context = canvasElement.getContext('2d');
    if (!context) {
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvasElement.width = Math.max(1, Math.round(viewportWidth * pixelRatio));
    canvasElement.height = Math.max(1, Math.round(viewportHeight * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    context.fillStyle = '#f2f2f2';
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    const viewportStartX = viewport.centerWorldX - viewportWidth / 2;
    const viewportStartY = viewport.centerWorldY - viewportHeight / 2;
    const tileSize = 256;

    const minTileX = Math.floor(viewportStartX / tileSize);
    const maxTileX = Math.floor((viewportStartX + viewportWidth - 1) / tileSize);
    const minTileY = Math.floor(viewportStartY / tileSize);
    const maxTileY = Math.floor((viewportStartY + viewportHeight - 1) / tileSize);

    const drawTasks = [];

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
            const tileUrl = buildTileUrl(viewport.zoom, tileX, tileY);
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
        context.fillText('Map preview unavailable', viewportWidth / 2, viewportHeight / 2);
        return [];
    }

    const projectedMarkers = projectMarkers(viewport.points, viewportStartX, viewportStartY);
    drawMarkersOnCanvas(context, projectedMarkers);
    return projectedMarkers;
}

function buildGoogleMapsLink(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function initializeDetailMap() {
    const mapContainer = document.getElementById('detailMap');
    if (!mapContainer || typeof itineraryData === 'undefined') {
        return;
    }

    const validLocations = Array.isArray(itineraryData)
        ? itineraryData.filter((place) => Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng)))
        : [];

    if (validLocations.length === 0) {
        mapContainer.innerHTML = `
            <div class="text-sm font-regular" style="padding: 16px; color: #666;">
                No map location available for this event.
            </div>
        `;
        return;
    }

    const mapPoints = buildMapPoints(validLocations);
    mapContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; width:100%; height:100%;">
            <div id="detailMapCanvasWrap" style="position:relative; width:100%; height:100%; min-height:360px; border-radius:14px; border:1px solid #d6d6d6; overflow:hidden; background:#f3f3f3;">
                <canvas id="detailStaticMapCanvas" aria-label="Event detail map preview" style="display:block; width:100%; height:100%;"></canvas>
                <span id="detailMarkerTooltip" style="display:none; position:absolute; transform:translate(-50%, -100%); background:rgba(30,30,30,0.9); color:#fff; border-radius:999px; padding:6px 10px; font:500 13px 'Segoe UI',sans-serif; white-space:nowrap; pointer-events:none;"></span>
            </div>
        </div>
    `;

    const detailStaticMapCanvas = document.getElementById('detailStaticMapCanvas');

    if (detailStaticMapCanvas) {
        const canvasSize = getCanvasCssSize(detailStaticMapCanvas);
        const viewport = calculateBestViewport(mapPoints, canvasSize.width, canvasSize.height);
        void renderMapTilesToCanvas(detailStaticMapCanvas, viewport, canvasSize.width, canvasSize.height)
            .then((projectedMarkers) => {
                setupMarkerHover(detailStaticMapCanvas, projectedMarkers);
            });
    }
}

document.addEventListener('DOMContentLoaded', initializeDetailMap);