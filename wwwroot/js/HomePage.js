async function changePage(pageNumber) {
    const page = parseInt(pageNumber);
    if (!page || page < 1) return;

    // 1. Get current text search values
    const loc = document.getElementById('LocationSearch').value;
    const date = document.getElementById('DateSearch').value;

    // 2. Build the tag query string from your activeTags array
    const tagQuery = activeTags.map(t => `selectedTags=${encodeURIComponent(t)}`).join('&');

    try {
        // 3. Construct the full URL including tags
        const url = `/Home/Index?page=${page}&searchLocation=${encodeURIComponent(loc)}&searchDate=${date}${tagQuery ? '&' + tagQuery : ''}`;
        
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Extract content from targets
            const newEvents = tempDiv.querySelector('#EventTarget').innerHTML;
            const newPagination = tempDiv.querySelector('#PaginationTarget').innerHTML;

            // Inject into the DOM
            document.querySelector('.EventRow').innerHTML = newEvents;
            document.querySelector('.Pagination').innerHTML = newPagination;

            // Update browser history and scroll
            window.history.pushState(null, '', url);
            document.getElementById('DataPart').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("AJAX Error:", err);
    }
}

async function updateGallery(page, loc, date, tagQuery = "") {
    // Build URL ensuring tagQuery only adds '&' if it has content
    const url = `/Home/Index?page=${page}&searchLocation=${encodeURIComponent(loc)}&searchDate=${date}${tagQuery ? '&' + tagQuery : ''}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (response.ok) {
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Injecting the new data
            const newEvents = tempDiv.querySelector('#EventTarget').innerHTML;
            const newPagination = tempDiv.querySelector('#PaginationTarget').innerHTML;

            document.querySelector('.EventRow').innerHTML = newEvents;
            document.querySelector('.Pagination').innerHTML = newPagination;
            
            window.history.pushState(null, '', url);
        }
    } catch (err) {
        console.error("Search failed:", err);
    }
}

let activeTags = []; // Global tracker

function toggleTag(element) {
    const tag = element.getAttribute('data-tag');
    
    // Toggle the visual class
    element.classList.toggle('active-tag-style');

    // Update the array
    if (activeTags.includes(tag)) {
        activeTags = activeTags.filter(t => t !== tag);
    } else {
        activeTags.push(tag);
    }

    // Force an immediate search at Page 1
    liveSearch(); 
}

let searchTimeout; 

function liveSearch() {
    const loc = document.getElementById('LocationSearch').value;
    const date = document.getElementById('DateSearch').value;
    
    // Create the tag string
    const tagQuery = activeTags.map(t => `selectedTags=${encodeURIComponent(t)}`).join('&');

    // CLEAR existing timeout to keep it "Instant" but stable
    clearTimeout(searchTimeout);

    // 300ms is the "sweet spot" for feeling instant without lagging the server
    searchTimeout = setTimeout(() => {
        updateGallery(1, loc, date, tagQuery); 
    }, 300);
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // If there's a search or a page in the URL, reset it all
    if (urlParams.toString() !== "") {
        
        // 1. Clear Inputs
        if(document.getElementById('LocationSearch')) document.getElementById('LocationSearch').value = '';
        if(document.getElementById('DateSearch')) document.getElementById('DateSearch').value = '';

        // 2. Clear Tags visually
        document.querySelectorAll('.Tag').forEach(tag => {
            tag.classList.remove('active-tag-style');
        });
        
        // 3. Reset the global array
        activeTags = [];

        // 4. Clean URL and jump to top
        window.history.replaceState({}, document.title, window.location.pathname);
        window.scrollTo(0, 0);

        // 5. Reload the "Fresh" data (No filters)
        updateGallery(1, '', '', '');
    }
};