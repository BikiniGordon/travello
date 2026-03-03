
let loadAttendees; 

async function approveAttendee(attendeeId) {
    try {
        const response = await fetch('/Event/ApproveAttendee/' + attendeeId, {
            method: 'POST'
        });
        if (response.ok) {
            await loadAttendees();
        }
    } catch (error) {
        console.error(error);
    }
}

async function deleteAttendee(attendeeId) {
    try {
        const response = await fetch('/Event/DeleteAttendee/' + attendeeId, {
            method: 'POST'
        });
        if (response.ok) {
            await loadAttendees();
        }
    } catch (error) {
        console.error(error);
    }
}

async function rejectAttendee(attendeeId) {
    try {
        const response = await fetch('/Event/RejectAttendee/' + attendeeId, {
            method: 'POST'
        });
        if (response.ok) {
            await loadAttendees();
        }
    } catch (error) {
        console.error(error);
    }
}


(function () {

    const btn = document.getElementById('seeAllBtn');
    const modal = document.getElementById('attendeesModal');
    const closeBtn = document.getElementById('modalCloseBtn');
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
        btn.focus();
    }

    // loadAttendees = async function () {
    //     attendeeList.innerHTML = '<p>Loading...</p>';

    //     const eventId = document.getElementById('eventId').value;

    //     try {
    //         const response = await fetch('/Event/GetAttendees/' + eventId);

    //         if (!response.ok) {
    //             throw new Error('โหลดข้อมูลไม่สำเร็จ');
    //         }

    //         const data = await response.json();
    //         renderAttendees(data);

    //     } catch (error) {
    //         attendeeList.innerHTML = '<p>ไม่สามารถโหลดข้อมูลได้</p>';
    //         console.error(error);
    //     }
    // }
    loadAttendees = async function () {
    attendeeList.innerHTML = '<p>Loading...</p>';


    const data = {
        isOwner: true, //false
        attendees: [
            { id: 1, name: "Dearja",  profileImage: "/images/pic.png", isApproved: true  },
            { id: 2, name: "Tom",     profileImage: "/images/pic.png", isApproved: true  },
            { id: 3, name: "Robin",   profileImage: "/images/pic.png", isApproved: true  },
            { id: 4, name: "Sam",     profileImage: "/images/Ellipse 12.png", isApproved: false },
            { id: 5, name: "Alex",    profileImage: "/images/pic.png", isApproved: false }
        ]
    };

    renderAttendees(data);

    // const response = await fetch('/Event/GetAttendees/' + eventId);
    // const data = await response.json();
    // renderAttendees(data);
}

    function renderAttendees(data) {
        if (data.attendees.length === 0) {
            attendeeList.innerHTML = '<p>ยังไม่มีผู้เข้าร่วม</p>';
            return;
        }

        attendeeList.innerHTML = data.attendees.map(function (person) {

            let actions = '';

            if (data.isOwner) {
                if (person.isApproved) {
                    actions = '<a class="btn-view" href="/Profile/' + person.id + '">VIEW</a>' +
                              '<button class="btn-delete" onclick="deleteAttendee(' + person.id + ')">DELETE</button>';
                } else {
                    actions = '<a class="btn-view" href="/Profile/' + person.id + '">VIEW</a>' +
                              '<button class="btn-approve" onclick="approveAttendee(' + person.id + ')">APPROVE</button>' +
                              '<button class="btn-reject" onclick="rejectAttendee(' + person.id + ')">REJECT</button>';
                }
            } else {
                actions = '<a class="btn-view" href="/Profile/' + person.id + '">VIEW</a>';
            }

            return '<div class="attendee">' +
                       '<img src="' + person.profileImage + '" alt="' + person.name + '">' +
                       '<span>' + person.name + '</span>' +
                       '<div class="attendee-actions">' + actions + '</div>' +
                   '</div>';
        }).join('');
    }

    // Event Listeners
    if (btn && modal) {
        btn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) { // ESC close too
                closeModal();
            }
        });
    }

})();


function renderAttendeePhotos(attendees) {
    const container = document.getElementById('attendeePhotos');
    if (!container) return;

    const total = attendees.length;
    let html = '';

    attendees.slice(0, 2).forEach(person => {
        html += `
        <div class="layout">
            <div class="mix">
                <div class="photoo">
                    <img class="pic" src="${person.profileImage}" alt="${person.name}">
                    <p class="text-xs font-semibold">${person.name}</p>
                </div>
            </div>
        </div>`;
    });

    if (total > 2) {
        const rest = attendees.slice(2);
        const preview = rest.slice(0, 4);
        const moreCount = total - 2;
        const gridImgs = preview.map(p =>
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
