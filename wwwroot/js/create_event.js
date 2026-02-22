function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

const plannerDaysContainer = document.getElementById('eventPlannerDays');
const plannerTotalAmount = document.getElementById('plannerTotalAmount');

// Google Maps initialization
let map;
const defaultLocation = { lat: 35.6762, lng: 139.6503 }; // Tokyo coordinates

function initializeMap() {
    const mapContainer = document.getElementById('eventMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    map = new google.maps.Map(mapContainer, {
        zoom: 12,
        center: defaultLocation,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
            {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#232C22' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry.fill',
                stylers: [{ color: '#d3d3d3' }]
            }
        ]
    });

    // Optional: Add a default marker
    new google.maps.Marker({
        position: defaultLocation,
        map: map,
        title: 'Tokyo'
    });
}

function createPlaceIcon(placeNumber = 1) {
    return `
        <svg class="place-icon" width="35" height="41" viewBox="0 0 35 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M35 17.5C35 29.214 22.9806 37.5053 18.8639 40.0015C18.0155 40.516 16.9845 40.516 16.1361 40.0015C12.0194 37.5053 0 29.214 0 17.5C0 7.83502 7.83502 0 17.5 0C27.165 0 35 7.83502 35 17.5Z" fill="#232C22"/>
            <circle cx="17.5" cy="16.5" r="9.5" fill="#E6E6E8"/>
            <text x="17.5" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="#232C22">${placeNumber}</text>
        </svg>
    `;
}

function createPlanRow(placeNumber = 1) {
    const planRow = document.createElement('div');
    planRow.className = 'place-item planner-item';
    planRow.dataset.placeNumber = String(placeNumber);
    planRow.innerHTML = `
        ${createPlaceIcon(placeNumber)}
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
            <div class="price-input planner-expense-wrap hidden">
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
    rowsContainer.appendChild(createPlanRow(1));
    plannerDaysContainer.appendChild(dayElement);
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
        const nextPlaceNumber = rows.length + 1;
        dayElement.querySelector('.planner-day-rows').appendChild(createPlanRow(nextPlaceNumber));
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

plannerDaysContainer.addEventListener('input', (event) => {
    const target = event.target;

    if (target.classList.contains('planner-place-input')) {
        const currentRow = target.closest('.planner-item');
        const currentDay = target.closest('.event-plan-day');
        if (!currentRow || !currentDay) {
            return;
        }

        const rows = getRows(currentDay);
        const isLastRow = rows[rows.length - 1] === currentRow;

        if (target.value.trim() !== '' && isLastRow) {
            ensureTrailingEmptyRow(currentDay);
        }

        ensureNextDay(currentDay);
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
        noteInput.classList.toggle('hidden');
        if (!noteInput.classList.contains('hidden')) {
            noteInput.focus();
            autoResize(noteInput);
        }
        return;
    }

    const expenseBtn = target.closest('.planner-expense-btn');
    if (expenseBtn) {
        const expenseWrap = rowElement.querySelector('.planner-expense-wrap');
        expenseWrap.classList.toggle('hidden');
        if (!expenseWrap.classList.contains('hidden')) {
            expenseWrap.querySelector('.planner-expense-input').focus();
        }
        return;
    }

    const deleteBtn = target.closest('.planner-delete-btn');
    if (deleteBtn) {
        const dayElement = rowElement.closest('.event-plan-day');
        const rows = getRows(dayElement);

        if (rows.length === 1) {
            rowElement.querySelector('.planner-place-input').value = '';
            rowElement.querySelector('.planner-note-input').value = '';
            rowElement.querySelector('.planner-note-input').classList.add('hidden');
            rowElement.querySelector('.planner-expense-input').value = '';
            rowElement.querySelector('.planner-expense-wrap').classList.add('hidden');
        } else {
            rowElement.remove();
        }

        ensureTrailingEmptyRow(dayElement);
        updateTotalExpenses();
    }
});

// Initialize planner with Day 1
document.addEventListener('DOMContentLoaded', () => {
    if (plannerDaysContainer) {
        createDay(1);
    }
});
