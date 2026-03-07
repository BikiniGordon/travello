let current_event_id = "";
let current_chat_room_id = "";
let currentPollId = ""; // Track which poll detail is open
let pollDetailRequestSeq = 0; // Guards against out-of-order poll detail responses
let canCurrentUserUpdateEventResult = false;

// SignalR connection for real-time poll updates
const pollConnection = new signalR.HubConnectionBuilder()
    .withUrl("/pollHub")
    .withAutomaticReconnect()
    .build();

pollConnection.on("PollUpdated", function (pollId) {
    if (currentPollId === pollId) {
        openPollCard(pollId);
    }

    const pollRoom = document.getElementById('all-poll-room');
    if (pollRoom && pollRoom.style.display !== 'none') {
        openPollRoom();
    }
});

pollConnection.on("PollCreated", function (pollId) {
    const pollRoom = document.getElementById('all-poll-room');
    if (pollRoom && pollRoom.style.display !== 'none') {
        openPollRoom();
    }
});

pollConnection.start().catch(err => console.error("PollHub connection error:", err));

function openChatRoom(event_id, chat_name, chat_room_id){
    current_event_id = event_id;
    current_chat_room_id = chat_room_id;

    pollConnection.invoke("JoinEventPolls", event_id).catch(err => console.error(err));

    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('chat-room').style.display = 'flex';    

    document.getElementById('chat-room-title').innerText = chat_name;
    document.getElementById('setting-event-title').innerText = chat_name;
    document.getElementById('setting-event-status').innerText = event_id;
}

function openSettingChatRoom(){

    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'flex';

    document.getElementById('setting-event-title').innerText = chat_name;
}

function backChatRoom(){

    document.getElementById('chat-room').style.display = 'flex';
    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';

    document.getElementById('chat-room-title').innerText = chat_name;
}

function openPollRoom() {

    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';
    
    document.getElementById('all-poll-room').style.display = 'flex';

    const emptyPollBox = document.getElementById('empty-poll');
    const pollBodyBox = document.getElementById('poll-body');
    const template = document.getElementById('poll-card-template');

    // 🌟 4. ขึ้นข้อความ Loading รอระหว่างดึงข้อมูล (UX ที่ดี)
    emptyPollBox.style.display = 'none';
    pollBodyBox.style.display = 'flex';
    pollBodyBox.innerHTML = '';

    // Fetch polls from API
    fetch(`/Poll/GetPollsByEventId?event_id=${current_event_id}`)
        .then(response => response.json())
        .then(data => renderPollCards(data))
        .catch(error => console.error("Error fetching polls:", error));

    // =======================================================
    // 🎨 6. ฟังก์ชันซ้อน (Helper) สำหรับวาดการ์ดโพลลงจอ
    // =======================================================
    function renderPollCards(data) {

        if (!data || data.length === 0) {
            // กรณีไม่มีโพล: โชว์กล่อง Empty
            emptyPollBox.style.display = 'flex';
            pollBodyBox.style.display = 'none';
        } else {
            // กรณีมีโพล: โชว์กล่องรายการ วนลูปวาดการ์ด
            emptyPollBox.style.display = 'none';
            pollBodyBox.style.display = 'flex';

            data.forEach(poll => {
                const cardClone = template.content.cloneNode(true);

                // ยัดข้อความ
                cardClone.querySelector('.poll-question').textContent = poll.question;
                cardClone.querySelector('.number-one').textContent = poll.winner;
                
                // Wire up click to open detail with real poll ID
                const card = cardClone.querySelector('.poll-card');
                card.setAttribute('onclick', `openPollCard('${poll.id}')`);
                
                // ตกแต่งเรื่องเวลา (ถ้าหมดเวลาแล้วให้เป็นสีเทา)
                const timeElem = cardClone.querySelector('.poll-timeout');
                if (poll.time_left === "Ended") {
                    timeElem.textContent = "Poll ended";
                    timeElem.style.color = "#888"; // สีเทา
                } else {
                    timeElem.textContent = `Poll end up in ${poll.time_left}`;
                }

                // ยัดตัวเลขและขยับหลอดเปอร์เซ็นต์
                cardClone.querySelector('.poll-percent').textContent = `${poll.percent}%`;
                cardClone.querySelector('.progress-bar-fill').style.width = `${poll.percent}%`;

                // แปะลงเว็บ
                pollBodyBox.appendChild(cardClone);
            });
        }
    }
}

function closeChatRoomMobile() {
    document.getElementById('chat-room').style.display = 'none';
}

function backSettingRoom(){
    document.getElementById('setting-room').style.display = 'flex';
    document.getElementById('all-poll-room').style.display = 'none';
}

// 🌟 1. ฟังก์ชันเปิดหน้ารายละเอียดโพล
function openPollCard(poll_id) {
    currentPollId = poll_id;
    const requestSeq = ++pollDetailRequestSeq;
    // สลับหน้าจอ
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('poll-select-card').style.display = 'flex';    

    const optionsContainer = document.getElementById('poll-options-container');
    const template = document.getElementById('poll-option-template');
    const questionElement = document.getElementById('detail-poll-question');
    const statusElem = document.getElementById('detail-poll-status');
    const updateEventButton = document.getElementById('update-event-btn');

    // Reset immediately so old poll content does not flash while loading a new poll.
    optionsContainer.innerHTML = '';
    questionElement.innerText = 'Loading poll...';
    statusElem.textContent = '';
    statusElem.style.color = '';
    canCurrentUserUpdateEventResult = false;
    if (updateEventButton) {
        updateEventButton.textContent = 'Update Event';
    }

    fetch(`/Poll/GetPollDetail?poll_id=${poll_id}`)
        .then(response => response.json())
        .then(poll => {
            // Ignore stale responses if user already clicked another poll.
            if (requestSeq !== pollDetailRequestSeq || currentPollId !== poll_id) {
                return;
            }

            // Clear inside callback to prevent race condition duplicates
            optionsContainer.innerHTML = '';
            questionElement.innerText = poll.question;
            canCurrentUserUpdateEventResult = Boolean(poll.can_update_event_result);
            if (updateEventButton) {
                updateEventButton.textContent = "Update Event";
            }
            
            if (poll.is_ended) {
                statusElem.textContent = "Ended";
                statusElem.style.color = "#888";
            } else {
                statusElem.textContent = `Ends in ${poll.time_left}`;
                statusElem.style.color = "";
            }

            poll.options.forEach((opt, index) => {
                const optionClone = template.content.cloneNode(true);
                
                optionClone.querySelector('.poll-option-text').textContent = opt.text;
                optionClone.querySelector('.progress-bar-fill').style.width = `${opt.percent}%`;
                
                // Highlight if user voted for this option
                const optionItem = optionClone.querySelector('.poll-option-item');
                if (opt.voted) {
                    optionItem.querySelector('.poll-radio-circle').style.background = '#00B4D8';
                }

                // Click to vote (only if poll is not ended)
                if (!poll.is_ended) {
                    optionItem.style.cursor = 'pointer';
                    optionItem.addEventListener('click', () => votePoll(poll_id, index));
                }
                
                // วาดรูปคนโหวตซ้อนๆ กัน
                const votersBox = optionClone.querySelector('.poll-voters');
                const isAnonymousPoll = poll.anonymous === true || poll.anonymous === 'true';
                if (isAnonymousPoll) {
                    const voteCountBadge = document.createElement('span');
                    voteCountBadge.className = 'poll-voter-count text-xs font-semibold';
                    const voteCount = Number(opt.voters_count) || 0;
                    voteCountBadge.textContent = `${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}`;
                    votersBox.appendChild(voteCountBadge);
                } else {
                    const voterProfiles = Array.isArray(opt.voter_profiles) ? opt.voter_profiles : [];

                    voterProfiles.forEach((profilePath) => {
                        const avatar = document.createElement('div');
                        avatar.className = 'voter-avatar';
                        avatar.style.backgroundImage = `url('${profilePath || '/images/pic.png'}')`;
                        avatar.style.backgroundSize = 'cover';
                        avatar.style.backgroundPosition = 'center';
                        votersBox.appendChild(avatar);
                    });
                }

                optionsContainer.appendChild(optionClone);
            });
        })
        .catch(error => console.error("Error fetching poll detail:", error));
}

// Vote on a poll option
function votePoll(pollId, optionIndex) {
    fetch('/Poll/Vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: pollId, optionIndex: optionIndex })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            openPollCard(pollId); // Refresh the detail view
        }
    })
    .catch(err => console.error("Vote error:", err));
}

function updateEventResultFromPoll() {
    if (!currentPollId) {
        return;
    }

    if (!canCurrentUserUpdateEventResult) {
        alert('Only the event owner can update into event.');
        return;
    }

    fetch('/Poll/UpdateEventResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: currentPollId })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            const eventId = result.event_id || current_event_id;
            if (eventId) {
                window.location.href = `/Event/Detail/${eventId}`;
                return;
            }

            return;
        }

        alert(result.error || 'Failed to update event result.');
    })
    .catch(err => {
        console.error('Update event result error:', err);
        alert('Failed to update event result.');
    });
}

function backToAllPolls() {
    currentPollId = "";
    document.getElementById('poll-select-card').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'flex';
    openPollRoom();
}

function openCreatePoll(){
    resetCreatePollForm();
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('create-poll-page').style.display = 'flex';
    setupPollTimeDropdowns(); 

}

function resetCreatePollForm() {
    const questionInput = document.getElementById('poll-question-input');
    if (questionInput) {
        questionInput.value = '';
    }

    const optionsGroup = document.getElementById('poll-options-group');
    if (optionsGroup) {
        const optionWrappers = optionsGroup.querySelectorAll('.poll-option-input-wrapper');

        optionWrappers.forEach((wrapper, index) => {
            if (index >= 2) {
                wrapper.remove();
                return;
            }

            const input = wrapper.querySelector('input');
            if (input) {
                input.value = '';
                input.placeholder = `Option ${index + 1}`;
            }
        });
    }

    const dateInput = document.querySelector('#create-poll-body .date-input');
    if (dateInput) {
        dateInput.value = '';
    }

    const hourSelect = document.getElementById('poll-hour-select');
    if (hourSelect) {
        hourSelect.value = '';
    }

    const minuteSelect = document.getElementById('poll-minute-select');
    if (minuteSelect) {
        minuteSelect.value = '';
    }

    const checkboxes = document.querySelectorAll('#create-poll-body .hidden-checkbox');
    checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
    });
}

function addPollOptionInput() {
    const optionsGroup = document.getElementById('poll-options-group');
    const addOptionButton = document.getElementById('add-option-btn');
    if (!optionsGroup || !addOptionButton) {
        return;
    }

    const existingOptionCount = optionsGroup.querySelectorAll('.poll-option-input-wrapper').length;
    const nextOptionNumber = existingOptionCount + 1;

    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'poll-option-input-wrapper';
    optionWrapper.innerHTML = `
        <input type="text" class="poll-form-input text-md font-semibold" placeholder="Option ${nextOptionNumber}">
    `;

    optionsGroup.insertBefore(optionWrapper, addOptionButton);
    optionWrapper.querySelector('input')?.focus();
}

function initializeAddOptionButton() {
    const addOptionButton = document.getElementById('add-option-btn');
    if (!addOptionButton || addOptionButton.dataset.bound === 'true') {
        return;
    }

    addOptionButton.addEventListener('click', addPollOptionInput);
    addOptionButton.dataset.bound = 'true';
}

function backAllPollRoom(){
    document.getElementById('all-poll-room').style.display = 'flex';
    document.getElementById('create-poll-page').style.display = 'none';
}

function setupPollTimeDropdowns() {
    const hourSelect = document.getElementById('poll-hour-select');
    const minuteSelect = document.getElementById('poll-minute-select');

    if (!hourSelect || !minuteSelect) {
        return;
    }

    // Prevent duplicate options when the create poll panel is opened repeatedly.
    if (hourSelect.options.length > 1 && minuteSelect.options.length > 1) {
        return;
    }

    for (let i = 0; i < 24; i++) {
        let hr = i.toString().padStart(2, '0');
        hourSelect.innerHTML += `<option value="${hr}">${hr}</option>`;
    }

    for (let i = 0; i < 60; i += 1) {
        let min = i.toString().padStart(2, '0');
        minuteSelect.innerHTML += `<option value="${min}">${min}</option>`;
    }
}

function submitCreatePoll() {
    const question = document.getElementById('poll-question-input').value.trim();
    if (!question) { alert('Please enter a poll question'); return; }

    const optionInputs = document.querySelectorAll('#poll-options-group .poll-option-input-wrapper input');
    const options = [];
    optionInputs.forEach(input => {
        const val = input.value.trim();
        if (val) options.push(val);
    });
    if (options.length < 2) { alert('Please add at least 2 options'); return; }

    const dateVal = document.querySelector('#create-poll-body .date-input').value;
    const hourVal = document.getElementById('poll-hour-select').value;
    const minVal = document.getElementById('poll-minute-select').value;
    if (!dateVal || !hourVal || !minVal) { alert('Please set a closing time'); return; }

    const deadline = new Date(`${dateVal}T${hourVal}:${minVal}:00`).toISOString();

    const checkboxes = document.querySelectorAll('#create-poll-body .hidden-checkbox');
    const allowMultiple = checkboxes[0]?.checked || false;
    const anonymous = checkboxes[1]?.checked || false;

    fetch('/Poll/Create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventId: current_event_id,
            question: question,
            options: options,
            deadline: deadline,
            allowMultiple: allowMultiple,
            anonymous: anonymous
        })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            document.getElementById('create-poll-page').style.display = 'none';
            openPollRoom();
        } else {
            alert(result.error || 'Failed to create poll');
        }
    })
    .catch(err => console.error("Create poll error:", err));
}

async function sendMessage() {
    const inputField = document.getElementById('message-input');
    const messageText = inputField.value.trim();

    if (messageText === "") return;

    const bubbleHtml = `
        <div class="message-row" style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <div class="message-bubble text-sm font-regular" style="background-color: #CEE7E6; color: #000; padding: 12px 16px; border-radius: 20px; border-top-right-radius: 4px; max-width: 60%; word-wrap: break-word;">
                ${messageText}
            </div>
        </div>
    `;

    const chatBody = document.getElementById('chat-body');
    chatBody.insertAdjacentHTML('beforeend', bubbleHtml);

    inputField.value = "";

    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch('http://localhost:5123/ChatMessage/SendMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // บอก Backend ว่าส่ง JSON ไปนะ
            },
            body: JSON.stringify({
                chat_room_id: current_chat_room_id, 
                sender_id: '69a9afc35f16b10cdb2b5079',
                message_text: messageText
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            console.error("เซฟลง DB ไม่สำเร็จ!");
            // เผื่ออนาคตอยากทำ UI โชว์เครื่องหมายตกใจสีแดงข้างๆ ข้อความที่ส่งไม่ผ่าน
        } else {
            console.log("เซฟข้อความลง DB เรียบร้อย!");
        }

    } catch (error) {
        console.error("เชื่อมต่อ Backend ไม่สำเร็จ:", error);
    }
}

function handleEnterPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAddOptionButton();

    const updateEventButton = document.getElementById('update-event-btn');
    if (updateEventButton && updateEventButton.dataset.bound !== 'true') {
        updateEventButton.addEventListener('click', updateEventResultFromPoll);
        updateEventButton.dataset.bound = 'true';
    }
});