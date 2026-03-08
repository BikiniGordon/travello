let current_event_id = "";
let current_chat_room_id = "";
let currentPollId = ""; // Track which poll detail is open
let pollDetailRequestSeq = 0; // Guards against out-of-order poll detail responses
let canCurrentUserUpdateEventResult = false;
let pollRoomRefreshTimer = null;
let pollDetailRefreshTimer = null;
let lastPollListSignature = '';
let lastPollListEventId = '';
let lastPollDetailSignature = '';
let lastPollDetailId = '';
const POLL_ROOM_REFRESH_MS = 12000;
const POLL_DETAIL_REFRESH_MS = 5000;

function animatePollSurface(element) {
    if (!element) {
        return;
    }

    element.classList.remove('poll-surface-enter');
    void element.offsetWidth;
    element.classList.add('poll-surface-enter');
}

function animateProgressBar(fillElement, targetPercent, delayMs = 0) {
    if (!fillElement) {
        return;
    }

    const safePercent = Math.max(0, Math.min(100, Number(targetPercent) || 0));
    fillElement.style.width = '0%';

    const applyTargetWidth = () => {
        requestAnimationFrame(() => {
            fillElement.style.width = `${safePercent}%`;
        });
    };

    if (delayMs > 0) {
        setTimeout(applyTargetWidth, delayMs);
        return;
    }

    applyTargetWidth();
}

function stopPollRoomAutoRefresh() {
    if (pollRoomRefreshTimer !== null) {
        clearInterval(pollRoomRefreshTimer);
        pollRoomRefreshTimer = null;
    }
}

function stopPollDetailAutoRefresh() {
    if (pollDetailRefreshTimer !== null) {
        clearInterval(pollDetailRefreshTimer);
        pollDetailRefreshTimer = null;
    }
}

function buildPollListSignature(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '[]';
    }

    return JSON.stringify(data.map(poll => ({
        id: poll.id,
        question: poll.question,
        winner: poll.winner,
        percent: poll.percent,
        time_left: poll.time_left,
        is_ended: poll.is_ended
    })));
}

function buildPollDetailSignature(poll) {
    if (!poll) {
        return '';
    }

    return JSON.stringify({
        id: poll.id,
        question: poll.question,
        is_ended: poll.is_ended,
        time_left: poll.time_left,
        anonymous: poll.anonymous,
        can_update_event_result: poll.can_update_event_result,
        options: Array.isArray(poll.options)
            ? poll.options.map(option => ({
                text: option.text,
                percent: option.percent,
                voters_count: option.voters_count,
                voted: option.voted,
                voter_profiles: option.voter_profiles
            }))
            : []
    });
}

function renderPollCards(data, pollBodyBox, emptyPollBox, template) {
    if (!data || data.length === 0) {
        emptyPollBox.style.display = 'flex';
        pollBodyBox.style.display = 'none';
        return;
    }

    emptyPollBox.style.display = 'none';
    pollBodyBox.style.display = 'flex';

    data.forEach((poll, index) => {
        const cardClone = template.content.cloneNode(true);

        cardClone.querySelector('.poll-question').textContent = poll.question;
        cardClone.querySelector('.number-one').textContent = poll.winner;

        const card = cardClone.querySelector('.poll-card');
        card.setAttribute('onclick', `openPollCard('${poll.id}')`);
        card.classList.add('poll-card-reveal');
        card.style.animationDelay = `${Math.min(index * 70, 420)}ms`;

        const timeElem = cardClone.querySelector('.poll-timeout');
        if (poll.time_left === "Ended") {
            timeElem.textContent = "Poll ended";
            timeElem.style.color = "#888";
        } else {
            timeElem.textContent = `Poll end up in ${poll.time_left}`;
        }

        cardClone.querySelector('.poll-percent').textContent = `${poll.percent}%`;
        const progressFill = cardClone.querySelector('.progress-bar-fill');
        animateProgressBar(progressFill, poll.percent, 100 + Math.min(index * 70, 420));

        pollBodyBox.appendChild(cardClone);
    });
}

function fetchAndRenderPollList(showLoading = false) {
    const allPollRoom = document.getElementById('all-poll-room');
    if (!allPollRoom || allPollRoom.style.display === 'none' || !current_event_id) {
        return;
    }

    const emptyPollBox = document.getElementById('empty-poll');
    const pollBodyBox = document.getElementById('poll-body');
    const template = document.getElementById('poll-card-template');

    if (!emptyPollBox || !pollBodyBox || !template) {
        return;
    }

    if (showLoading) {
        emptyPollBox.style.display = 'none';
        pollBodyBox.style.display = 'flex';
        pollBodyBox.innerHTML = '';
        animatePollSurface(pollBodyBox);
    }

    fetch(`/Poll/GetPollsByEventId?event_id=${current_event_id}`)
        .then(response => response.json())
        .then(data => {
            const signature = buildPollListSignature(data);
            const isSameEvent = lastPollListEventId === current_event_id;

            if (!showLoading && isSameEvent && signature === lastPollListSignature) {
                return;
            }

            lastPollListEventId = current_event_id;
            lastPollListSignature = signature;
            pollBodyBox.innerHTML = '';
            renderPollCards(data, pollBodyBox, emptyPollBox, template);
        })
        .catch(error => console.error("Error fetching polls:", error));
}

function startPollRoomAutoRefresh() {
    stopPollRoomAutoRefresh();
    pollRoomRefreshTimer = setInterval(() => {
        fetchAndRenderPollList();
    }, POLL_ROOM_REFRESH_MS);
}

function fetchAndRenderPollDetail(poll_id, animate = false, showLoading = true) {
    const requestSeq = ++pollDetailRequestSeq;
    const optionsContainer = document.getElementById('poll-options-container');
    const template = document.getElementById('poll-option-template');
    const questionElement = document.getElementById('detail-poll-question');
    const statusElem = document.getElementById('detail-poll-status');
    const updateEventButton = document.getElementById('update-event-btn');
    const pollSelectCard = document.getElementById('poll-select-card');

    if (!optionsContainer || !template || !questionElement || !statusElem || !pollSelectCard) {
        return;
    }

    if (animate) {
        animatePollSurface(document.getElementById('poll-detail-body'));
    }

    if (showLoading) {
        optionsContainer.innerHTML = '';
        questionElement.innerText = 'Loading poll...';
        statusElem.textContent = '';
        statusElem.style.color = '';
        canCurrentUserUpdateEventResult = false;
        if (updateEventButton) {
            updateEventButton.textContent = 'Update Event';
        }
    }

    fetch(`/Poll/GetPollDetail?poll_id=${poll_id}`)
        .then(response => response.json())
        .then(poll => {
            if (pollSelectCard.style.display === 'none') {
                return;
            }

            if (requestSeq !== pollDetailRequestSeq || currentPollId !== poll_id) {
                return;
            }

            const detailSignature = buildPollDetailSignature(poll);
            if (!showLoading && lastPollDetailId === poll_id && detailSignature === lastPollDetailSignature) {
                return;
            }

            lastPollDetailId = poll_id;
            lastPollDetailSignature = detailSignature;

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
                const progressFill = optionClone.querySelector('.progress-bar-fill');
                animateProgressBar(progressFill, opt.percent, 120 + Math.min(index * 70, 280));

                const optionItem = optionClone.querySelector('.poll-option-item');
                optionItem.classList.add('poll-option-reveal');
                optionItem.style.animationDelay = `${Math.min(index * 65, 260)}ms`;
                if (opt.voted) {
                    optionItem.querySelector('.poll-radio-circle').style.background = '#00B4D8';
                }

                if (!poll.is_ended) {
                    optionItem.style.cursor = 'pointer';
                    optionItem.addEventListener('click', () => votePoll(poll_id, index));
                }

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

function startPollDetailAutoRefresh() {
    stopPollDetailAutoRefresh();
    pollDetailRefreshTimer = setInterval(() => {
        if (!currentPollId) {
            return;
        }

        const pollSelectCard = document.getElementById('poll-select-card');
        if (!pollSelectCard || pollSelectCard.style.display === 'none') {
            return;
        }

        fetchAndRenderPollDetail(currentPollId, false, false);
    }, POLL_DETAIL_REFRESH_MS);
}

function openChatRoom(event_id, chat_name, chat_room_id){
    current_event_id = event_id;
    current_chat_room_id = chat_room_id;
    currentPollId = "";
    lastPollListEventId = '';
    lastPollListSignature = '';
    lastPollDetailId = '';
    lastPollDetailSignature = '';
    stopPollRoomAutoRefresh();
    stopPollDetailAutoRefresh();

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
    
    const allPollRoom = document.getElementById('all-poll-room');
    allPollRoom.style.display = 'flex';

    stopPollDetailAutoRefresh();
    fetchAndRenderPollList(true);
    startPollRoomAutoRefresh();
}

function closeChatRoomMobile() {
    document.getElementById('chat-room').style.display = 'none';
}

function backSettingRoom(){
    document.getElementById('setting-room').style.display = 'flex';
    document.getElementById('all-poll-room').style.display = 'none';
    stopPollRoomAutoRefresh();
}

// 🌟 1. ฟังก์ชันเปิดหน้ารายละเอียดโพล
function openPollCard(poll_id) {
    currentPollId = poll_id;
    if (lastPollDetailId !== poll_id) {
        lastPollDetailSignature = '';
    }
    stopPollRoomAutoRefresh();
    // สลับหน้าจอ
    document.getElementById('all-poll-room').style.display = 'none';
    const pollSelectCard = document.getElementById('poll-select-card');
    pollSelectCard.style.display = 'flex';
    fetchAndRenderPollDetail(poll_id, true);
    startPollDetailAutoRefresh();
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
            fetchAndRenderPollDetail(pollId, false, false); // Refresh immediately after local vote
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
    lastPollDetailId = '';
    lastPollDetailSignature = '';
    stopPollDetailAutoRefresh();
    document.getElementById('poll-select-card').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'flex';
    fetchAndRenderPollList(true);
    startPollRoomAutoRefresh();
}

function openCreatePoll(){
    resetCreatePollForm();
    stopPollRoomAutoRefresh();
    stopPollDetailAutoRefresh();
    document.getElementById('all-poll-room').style.display = 'none';
    const createPollPage = document.getElementById('create-poll-page');
    createPollPage.style.display = 'flex';
    const createPollBody = document.getElementById('create-poll-body');
    animatePollSurface(createPollBody);
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
    fetchAndRenderPollList(true);
    startPollRoomAutoRefresh();
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