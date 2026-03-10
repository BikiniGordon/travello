async function changePage(pageNumber) {
    const page = parseInt(pageNumber);
    if (!page || page < 1) return;

    const loc = document.getElementById('LocationSearch').value;
    const date = document.getElementById('DateSearch').value;

    const tagQuery = activeTags.map(t => `selectedTags=${encodeURIComponent(t)}`).join('&');

    try {
        const url = `/Home/Index?page=${page}&searchLocation=${encodeURIComponent(loc)}&searchDate=${date}${tagQuery ? '&' + tagQuery : ''}`;
        
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const newEvents = tempDiv.querySelector('#EventTarget').innerHTML;
            const newPagination = tempDiv.querySelector('#PaginationTarget').innerHTML;

            document.querySelector('.EventRow').innerHTML = newEvents;
            document.querySelector('.Pagination').innerHTML = newPagination;

            window.history.pushState(null, '', url);
            document.getElementById('DataPart').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("AJAX Error:", err);
    }
}

async function updateGallery(page, loc, date, tagQuery = "") {
    const url = `/Home/Index?page=${page}&searchLocation=${encodeURIComponent(loc)}&searchDate=${date}${tagQuery ? '&' + tagQuery : ''}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (response.ok) {
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

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

let activeTags = [];

function toggleTag(element) {
    const tag = element.getAttribute('data-tag');
    
    element.classList.toggle('active-tag-style');

    if (activeTags.includes(tag)) {
        activeTags = activeTags.filter(t => t !== tag);
    } else {
        activeTags.push(tag);
    }

    liveSearch(); 
}

let searchTimeout; 

function liveSearch() {
    const loc = document.getElementById('LocationSearch').value;
    const date = document.getElementById('DateSearch').value;
    
    const tagQuery = activeTags.map(t => `selectedTags=${encodeURIComponent(t)}`).join('&');

    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        updateGallery(1, loc, date, tagQuery); 
    }, 300);
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.toString() !== "") {
        if(document.getElementById('LocationSearch')) 
            document.getElementById('LocationSearch').value = urlParams.get('searchLocation') || '';
        if(document.getElementById('DateSearch')) 
            document.getElementById('DateSearch').value = urlParams.get('searchDate') || '';

        activeTags = urlParams.getAll('selectedTags');

        document.querySelectorAll('.Tag').forEach(tag => {
            const tagName = tag.getAttribute('data-tag');
            if (activeTags.includes(tagName)) {
                tag.classList.add('active-tag-style');
            }
        });
    }
};

window.onpopstate = function (event) {
    const url = window.location.pathname + window.location.search;
    syncContentFromUrl(url);
};

async function syncContentFromUrl(url) {
    try {
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (response.ok) {
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            document.querySelector('.EventRow').innerHTML = tempDiv.querySelector('#EventTarget').innerHTML;
            document.querySelector('.Pagination').innerHTML = tempDiv.querySelector('#PaginationTarget').innerHTML;
            
            const params = new URLSearchParams(window.location.search);
            
            document.getElementById('LocationSearch').value = params.get('searchLocation') || '';
            document.getElementById('DateSearch').value = params.get('searchDate') || '';
            
            activeTags = params.getAll('selectedTags');
            document.querySelectorAll('.Tag').forEach(tagEl => {
                const tagValue = tagEl.getAttribute('data-tag');
                if (activeTags.includes(tagValue)) {
                    tagEl.classList.add('active-tag-style');
                } else {
                    tagEl.classList.remove('active-tag-style');
                }
            });
        }
    } catch (err) {
        console.error("Back navigation sync failed:", err);
    }
}