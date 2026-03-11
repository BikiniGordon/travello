let loadAttendees;

async function approveAttendee(participantId) {
    try {
        const res = await fetch('/Event/ApproveAttendee/' + participantId, { method: 'POST' });
        if (res.ok) {
            await loadAttendees(); // reload modal
        } else {
            alert('Error Tryagain');
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteAttendee(participantId) {
    try {
        const res = await fetch('/Event/DeleteAttendee/' + participantId, { method: 'POST' });
        if (res.ok) {
            await loadAttendees();
        } else {
            alert('Error Tryagain');
        }
    } catch (err) {
        console.error(err);
    }
}

async function rejectAttendee(participantId) {
    try {
        const res = await fetch('/Event/RejectAttendee/' + participantId, { method: 'POST' });
        if (res.ok) {
            await loadAttendees();
        } else {
            alert('Error Tryagain');
        }
    } catch (err) {
        console.error(err);
    }
}

// ATTENDEES MODAL

(function () {
    const seeAllBtn   = document.getElementById('seeAllBtn');
    const modal       = document.getElementById('attendeesModal');
    const closeBtn    = document.getElementById('modalCloseBtn');
    const attendeeList = document.getElementById('attendeeList');

    async function openModal() {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        closeBtn.focus();
        await loadAttendees();
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        seeAllBtn.focus();
        window.location.reload();
    }

    loadAttendees = async function () {
        attendeeList.innerHTML = '<p>Loading...</p>';
        const eventId = document.getElementById('eventId').value;

        try {
            const response = await fetch('/Event/GetAttendees/' + eventId);
            if (!response.ok) throw new Error('Failed to load data');
            const data = await response.json();
            renderAttendees(data);


        } catch (err) {
            attendeeList.innerHTML = '<p>Failed to load data</p>';
            console.error(err);
        }
    };

    function renderAttendees(data) {
        if (!data.attendees || data.attendees.length === 0) {
            attendeeList.innerHTML = '<p>No attendee yet</p>';
            return;
        }
        const approvedCount = data.attendees.filter(a => a.isApproved).length;
        const isFull = data.attendees_limit > 0 && approvedCount >= data.attendees_limit;
        
        const sorted = [...data.attendees].sort((a, b) => {
            if (!a.isApproved && b.isApproved) return -1;
            if (a.isApproved && !b.isApproved) return 1;
            return 0;
        });

        attendeeList.innerHTML = sorted.map(function (person) {
            let actions = '';
            if (data.isOwner) {
                if (person.isApproved) {
                    actions = `<a class="btn-view" href="/Home/UserProfile/${person.userId}">VIEW</a>
                            <button class="btn-delete" onclick="deleteAttendee('${person.id}')">DELETE</button>`;
                } else {
                    if (isFull) {
                    actions = `<a class="btn-view" href="/Home/UserProfile/${person.userId}">VIEW</a>
                            <button class="btn-approve" disabled style="opacity:0.4; cursor:not-allowed;">APPROVE</button>
                            <button class="btn-reject" onclick="rejectAttendee('${person.id}')">REJECT</button>`;
                } else {
                    actions = `<a class="btn-view" href="/Home/UserProfile/${person.userId}">VIEW</a>
                            <button class="btn-approve" onclick="approveAttendee('${person.id}')">APPROVE</button>
                            <button class="btn-reject" onclick="rejectAttendee('${person.id}')">REJECT</button>`;
                }
                }
            } else {
                actions = `<a class="btn-view" href="/Home/UserProfile/${person.userId}">VIEW</a>`;
                
            }

            const hasAnswer = person.recruitAnswer && person.recruitAnswer.trim() !== '';

            return `<div class="attendee ${hasAnswer ? 'attendee-clickable' : ''}" 
                        onclick="${hasAnswer ? `toggleAnswer(this)` : ''}">
                        <div class="attendee-main">
                            <img src="${person.profileImage}" alt="${person.name}">
                            <span>${person.name}</span>
                            ${hasAnswer ? `<span class="attendee-chevron">▾</span>` : ''}
                            <div class="attendee-actions">${actions}</div>
                        </div>
                        ${hasAnswer 
                            ? `<div class="attendee-answer-box" style="display:none;">
                                <p class="attendee-answer-text">${person.recruitAnswer}</p>
                            </div>` 
                            : ''}
                    </div>`;
        }).join('');
    }

    if (seeAllBtn && modal) {
        seeAllBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
        });
    }
})();

// ATTENDEE PHOTOS 

function renderAttendeePhotos(attendees) {
    const container = document.getElementById('attendeePhotos');
    if (!container) return;

    const total = attendees.length;
    let html = '';

    attendees.slice(0, 2).forEach(person => {
        html += `
        <div class="layout">
        <a href="/Home/UserProfile/${person.userId}" style="text-decoration:none; color:inherit; width:100%; height:100%;">
            <div class="mix">
                <div class="photoo">
                    <img class="pic" src="${person.profileImage}" alt="${person.name}">
                    <p class="text-xs font-semibold">${person.name}</p>
                </div>
            </div>
            </a>
        </div>`;
    });

    if (total > 2) {
        const rest      = attendees.slice(2);
        const preview   = rest.slice(0, 4);
        const moreCount = total - 2;
        const gridImgs  = preview.map(p =>
            `<img class="mini-pic" src="${p.profileImage}" alt="${p.name}">`
        ).join('');

        html += `
        <div class="layout">
            <div class="mix">
                <div class="photoo">
                    <div class="mini-grid">${gridImgs}</div>
                    <p class="text-xs font-semibold">+${moreCount} more</p>
                </div>
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

function toggleAnswer(el) {
    const box      = el.querySelector('.attendee-answer-box');
    const chevron  = el.querySelector('.attendee-chevron');
    if (!box) return;
    const isOpen = box.style.display !== 'none';
    box.style.display  = isOpen ? 'none' : 'block';
    chevron.textContent = isOpen ? '▾' : '▴';
}