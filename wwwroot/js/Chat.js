let current_event_id = null;
let current_chat_room_id = null;
let current_chat_room_location = null;
let current_chat_room_start_date = null;
let current_chat_room_end_date = null;
let current_chat_room_event_image = null;
let chat_socket = null;
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


async function openChatRoom(event_id, chat_name, chat_room_id, chat_room_location = '', chat_room_event_image = '') {
    current_event_id = event_id;
    current_chat_room_id = chat_room_id;
    current_chat_room_location = chat_room_location;
    current_chat_room_event_image = chat_room_event_image;
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
    document.getElementById('files-and-links-room') && (document.getElementById('files-and-links-room').style.display = 'none');
    document.getElementById('chat-room').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    document.getElementById('chat-room-title').innerText = chat_name;
    document.getElementById('setting-event-title').innerText = chat_name;
    document.getElementById('setting-event-status').innerText = chat_room_location ? ('Location : ' + chat_room_location) : event_id;
    if (document.getElementById('event-image-setting') && chat_room_event_image) {
        document.getElementById('event-image-setting').src = chat_room_event_image;
    }

    if (chat_socket) {
        chat_socket.close();
    }

    chat_socket = new WebSocket(`ws://localhost:5123/ws?chat_room_id=${current_chat_room_id}`);

    chat_socket.onmessage = function (event) {
        if (event.data === "NEW_MSG") {
            loadChatMessages(); // สั่งให้ดึงแชทมาวาดใหม่ทันที!
            loadChatRooms();
        }
    };

    chat_socket.onopen = function () { console.log("WebSocket Connected"); };
    chat_socket.onerror = function (error) { console.error("WebSocket Error:", error); };

    await loadChatMessages();
    await loadChatRooms();
    if (typeof loadSettingImages === 'function') await loadSettingImages();

    setTimeout(() => {
        const chatBody = document.getElementById('chat-body');
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }, 100);
}
function openDetailPage() {
    if (current_event_id) {
        window.location.href = `/Event/Detail/${current_event_id}`;
    } else {
        console.error("No event ID found!");
    }
}

// await loadChatRooms();

async function openChatPage() {
    await loadChatRooms();
}

async function openChatRoom(event_id, chat_name, chat_room_id, chat_room_location, chat_room_start_date, chat_room_end_date, chat_room_event_image) {
    //เอา event_id ไปหา chat เพื่อดึง
    // เดี๋ยวเอา chat_name ออก แล้วไป map ใน database ดึงแทน
    current_event_id = event_id;
    current_chat_room_id = chat_room_id;
    current_chat_room_location = chat_room_location;
    current_chat_room_event_image = chat_room_event_image;
    current_chat_room_start_date = chat_room_start_date;
    current_chat_room_end_date = chat_room_end_date;

    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('files-and-links-room').style.display = 'none';
    document.getElementById('chat-room').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    document.getElementById('chat-room-title').innerText = chat_name;
    document.getElementById('setting-event-title').innerText = chat_name;
    document.getElementById('setting-event-location').innerText = 'Location : ' + current_chat_room_location;
    document.getElementById('setting-event-date').innerText = current_chat_room_start_date + ' - ' + current_chat_room_end_date
    document.getElementById('event-image-setting').src = current_chat_room_event_image;

    if (chat_socket) {
        chat_socket.close();
    }

    chat_socket = new WebSocket(`ws://localhost:5123/ws?chat_room_id=${current_chat_room_id}`);

    chat_socket.onmessage = function (event) {
        if (event.data === "NEW_MSG") {
            loadChatMessages();
            loadChatRooms();
        }
    };

    chat_socket.onopen = function () { console.log("WebSocket Connected"); };
    chat_socket.onerror = function (error) { console.error("WebSocket Error:", error); };

    await loadChatMessages();
    await loadChatRooms();
    await loadSettingImages();

    setTimeout(() => {
        const chatBody = document.getElementById('chat-body');
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }, 100);
}

function openDetailPage() {
    if (current_event_id) {
        window.location.href = `/Event/Detail/${current_event_id}`;
    } else {
        console.error("No event ID found!");
    }
}

function openSettingChatRoom() {
    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'flex';

    document.getElementById('setting-event-title').innerText = chat_name;
}

function backChatRoom() {

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

function backSettingRoom() {
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

    const errorDiv = document.getElementById('update-event-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    if (!canCurrentUserUpdateEventResult) {
        if (errorDiv) {
            errorDiv.textContent = 'Only the event owner can update into event.';
            errorDiv.style.display = 'block';
        } else {
            alert('Only the event owner can update into event.');
        }
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
            if (errorDiv) {
                errorDiv.textContent = result.error || 'Failed to update event result.';
                errorDiv.style.display = 'block';
            } else {
                alert(result.error || 'Failed to update event result.');
            }
        })
        .catch(err => {
            console.error('Update event result error:', err);
            if (errorDiv) {
                errorDiv.textContent = 'Failed to update event result.';
                errorDiv.style.display = 'block';
            } else {
                alert('Failed to update event result.');
            }
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

function openCreatePoll() {
    resetCreatePollForm();
    stopPollRoomAutoRefresh();
    stopPollDetailAutoRefresh();
    document.getElementById('all-poll-room').style.display = 'none';
    const createPollPage = document.getElementById('create-poll-page');
    createPollPage.style.display = 'flex';
    const createPollBody = document.getElementById('create-poll-body');
    animatePollSurface(createPollBody);
    setupPollTimeDropdowns();
    initializeAddOptionButton();

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
        <input type="text" class="poll-form-input text-md font-regular" placeholder="Option ${nextOptionNumber}">
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

function backAllPollRoom() {
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

    const fileInput = document.getElementById('image-input');
    const selectedFile = fileInput.files[0];

    const documentInput = document.getElementById('document-input');
    const selectedDoc = documentInput.files[0];

    if (!messageText && !selectedFile && !selectedDoc) return;

    const formData = new FormData();
    formData.append("chat_room_id", current_chat_room_id);
    formData.append("message_text", messageText);

    if (selectedFile) {
        formData.append("imageFile", selectedFile);
    }
    else if (selectedDoc) {
        formData.append("documentFile", selectedDoc);
    }

    let bubbleContent = "";

    if (messageText) {
        const safeText = escapeHTML(messageText);
        const formattedText = makeLinksClickable(safeText);
        bubbleContent += `<span>${formattedText}</span>`;
    }

    const chatBody = document.getElementById('chat-body');

    if (bubbleContent !== "") {
        const bubbleHtml = `
            <div class="message-row" style="display: flex; justify-content: flex-end; margin-bottom: 16px; font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif;">
                <div class="message-bubble text-sm font-regular" style="background-color: #CEE7E6; color: #000; padding: 12px 16px; border-radius: 20px; border-top-right-radius: 4px; max-width: 60%; word-wrap: break-word;">
                    ${bubbleContent}
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', bubbleHtml);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    cancelAttachment();
    inputField.value = "";

    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) fileNameDisplay.innerText = "";

    try {
        const response = await fetch('http://localhost:5123/ChatMessage/SendMessage', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            console.error("ERROR SAVE TO DB");
        } else {
            console.log("SAVE TO DB SUCCESS");
        }

    } catch (error) {
        console.error("ERROR TO CONNECT DB", error);
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}

function handleEnterPress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

async function loadChatMessages() {
    if (current_chat_room_id == null) return;

    try {
        const response = await fetch(`http://localhost:5123/ChatMessage/GetMessages?chat_room_id=${current_chat_room_id}`);
        const result = await response.json();

        if (result.success) {
            const chatBody = document.getElementById('chat-body');
            chatBody.scrollTop = chatBody.scrollHeight;

            chatBody.innerHTML = "";

            const currentUserDataElement = document.getElementById('current-user-data');
            const my_user_id = currentUserDataElement ? currentUserDataElement.getAttribute('data-user-id') : null;

            result.data.forEach(msg => {
                let bubbleHtml = "";
                let messageContent = "";

                if (msg.image_url && msg.image_url !== "") {
                    messageContent = `<img src="${msg.image_url}" onclick="window.open('${msg.image_url}', '_blank')" style="max-width: 100%; border-radius: 8px; margin-bottom: 4px; display: block; cursor: pointer" ;/>`;
                }

                if (msg.document_url && msg.document_url !== "") {
                    const fileName = msg.document_name ? msg.document_name : "Download File";
                    messageContent += `
                        <div onclick="window.open('${msg.document_url}', '_blank')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 4px; border: 1px solid #e2e8f0; cursor: pointer; width: 100%; box-sizing: border-box; transition: 0.2s;">
                            
                            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; pointer-events: none;">
                                <svg style="flex-shrink: 0;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="12" y1="18" x2="12" y2="12"></line>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>                        
                                
                                <span style="font-size: 14px; font-weight: bold; color: #0284c7; word-break: break-all;">
                                    ${fileName}
                                </span>
                            </div>
                            
                            <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </div>
                            
                        </div>
                    `;
                }

                if (msg.poll_id != null && msg.poll_data != null) {

                    // 🌟 1. ลอจิกคำนวณเวลาด้วย JS (ชัวร์ 100% ว่าขึ้นแน่นอน)
                    let timeLeftText = "";
                    let timeStyle = "color: #ef4444;"; // สีแดง
                    let deadlineStr = msg.poll_data.deadline || msg.poll_data.Deadline;
                    let isEnded = msg.poll_data.is_ended || msg.poll_data.IsEnded || msg.poll_data.time_left === "Ended";

                    if (isEnded) {
                        timeLeftText = "Poll ended";
                        timeStyle = "color: #888;"; // สีเทา
                    } else if (deadlineStr) {
                        let deadlineDate = new Date(deadlineStr);
                        let now = new Date();
                        let diffMs = deadlineDate - now;

                        if (diffMs <= 0) {
                            timeLeftText = "Poll ended";
                            timeStyle = "color: #888;";
                        } else {
                            let mins = Math.floor(diffMs / 60000);
                            let hours = Math.floor(mins / 60);
                            let days = Math.floor(hours / 24);

                            if (days > 0) {
                                timeLeftText = `Poll end up in ${days} day${days > 1 ? 's' : ''}`;
                            } else if (hours > 0) {
                                timeLeftText = `Poll end up in ${hours} hour${hours > 1 ? 's' : ''}`;
                            } else {
                                timeLeftText = `Poll end up in ${mins} minute${mins > 1 ? 's' : ''}`;
                            }
                        }
                    } else if (msg.poll_data.time_left) {
                        timeLeftText = `Poll end up in ${msg.poll_data.time_left}`;
                    } else {
                        timeLeftText = "Poll ends soon";
                    }

                    // 🌟 2. คำนวณ % คนโหวต
                    let totalVotes = 0;
                    if (msg.poll_data.options) {
                        msg.poll_data.options.forEach(opt => {
                            totalVotes += (opt.voters ? opt.voters.length : 0);
                        });
                    }

                    let pollOptionsHtml = "";
                    if (msg.poll_data.options) {
                        msg.poll_data.options.forEach((opt, index) => {
                            let voteCount = opt.voters ? opt.voters.length : 0;
                            let percent = totalVotes === 0 ? 0 : (voteCount / totalVotes) * 100;

                            let avatarsHtml = "";
                            let profiles = opt.voter_profiles || [];
                            
                            if (profiles.length > 0) {
                                let displayVoters = profiles.slice(0, 3);
                                displayVoters.forEach(profilePath => {
                                    avatarsHtml += `<img src="${profilePath}" class="voter-img" />`;
                                });
                            }

                            pollOptionsHtml += `
                                <div class="poll-option" onclick="votePoll('${msg.poll_id}', ${index})">
                                    <div class="poll-option-top">
                                        <div class="poll-radio-group">
                                            <div class="poll-radio"></div>
                                            <span class="poll-label text-sm font-semibold">${opt.text}</span>
                                        </div>
                                        <div class="poll-voter-avatars">
                                            ${avatarsHtml}
                                        </div>
                                    </div>
                                    <div class="poll-progress-bg">
                                        <div class="poll-progress-fill chat-poll-fill" data-percent="${percent}" style="width: 0%;"></div>
                                    </div>
                                </div>
                            `;
                        });
                    }

                    let deadlineRaw = msg.poll_data.deadline || msg.poll_data.Deadline;

                    bubbleHtml = `
                        <div class="message-row poll-message-row" style="display: flex; justify-content: center; width: 100%; margin-bottom: 24px; margin-top: 16px;">
                            <div class="poll-container">
                                <h4 class="poll-title text-lg font-regular">${msg.poll_data.question}</h4>
                                <p class="poll-timer text-sm font-regular live-poll-timer" data-deadline="${deadlineRaw}" style="${timeStyle}">${timeLeftText}</p>
                                ${pollOptionsHtml}
                            </div>
                        </div>
                    `;
                }
                else {
                    if (msg.message_text && msg.message_text !== "null" && msg.message_text.trim() !== "") {
                        const safeText = escapeHTML(msg.message_text);
                        messageContent += `<span>${makeLinksClickable(safeText)}</span>`;
                    }

                    if (msg.sender_id === my_user_id) {
                        bubbleHtml = `
                        <div class="message-row" style="display: flex; justify-content: flex-end; margin-bottom: 16px;  font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif;">
                            <div class="message-bubble text-sm font-regular" style="background-color: #CEE7E6; color: #000; padding: 12px 16px; border-radius: 20px; border-top-right-radius: 4px; max-width: 60%; word-wrap: break-word;">
                                ${messageContent}
                            </div>
                        </div>
                        `;
                    } else {
                        bubbleHtml = `
                            <div class="message-row other-message" style="display: flex; gap: 15px; margin-bottom: 16px; font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif;">
                                <img class="talker" src="${msg.sender_img}" style="width: 49px; height: 49px; border-radius: 50px; object-fit: cover; flex-shrink: 0;"/>
                                
                                <div class="message-column" style="display: flex; flex-direction: column; align-items: flex-start; max-width: 60%; min-width: 0;">
                                    <p class="sender_name font-regular" style="font-size: 14px; padding-bottom: 4px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${msg.sender_name}</p>
                                    
                                    <div class="message-bubble text-sm font-regular" style="background-color: #fff; border: 1px solid #e5e7eb; padding: 12px 20px; border-radius: 20px; border-top-left-radius: 4px; word-wrap: break-word; max-width: 100%;">
                                        ${messageContent}
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                }
                chatBody.insertAdjacentHTML('beforeend', bubbleHtml);
            });
            const allFills = chatBody.querySelectorAll('.chat-poll-fill');
            allFills.forEach((fill, idx) => {
                const targetPercent = fill.getAttribute('data-percent');
                animateProgressBar(fill, targetPercent, 100 + (idx * 50));
            });

            chatBody.scrollTop = chatBody.scrollHeight;
        }
    } catch (error) {
        console.error("error", error);
    }
}

function makeLinksClickable(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.replace(urlRegex, function (url) {
        return `<a href="${url}" target="_blank" class="chat-link">${url}</a>`;
    });
}

function showPreviewText() {
    const imageInput = document.getElementById('image-input');
    const documentInput = document.getElementById('document-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const messageInput = document.getElementById('message-input');

    let fileName = "";
    let fileIcon = "";

    if (imageInput.files && imageInput.files.length > 0) {
        fileName = imageInput.files[0].name;
        fileIcon = "Photo : ";
    }
    else if (documentInput.files && documentInput.files.length > 0) {
        fileName = documentInput.files[0].name;
        fileIcon = "File : ";
    }

    if (fileName !== "") {
        fileNameDisplay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; background-color: #D6D6D6; border-radius: 8px; width: 100%; box-sizing: border-box;">
                <span style="font-size: 18px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85%;">
                    ${fileIcon} ${fileName}
                </span>
                
                <svg onclick="cancelAttachment()" style="cursor: pointer; color: #ef4444; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
            </div>
        `;
        fileNameDisplay.style.display = "block";
        messageInput.style.display = "none";
    } else {
        cancelAttachment();
    }
}

function cancelAttachment() {
    const imageInput = document.getElementById('image-input');
    const documentInput = document.getElementById('document-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const messageInput = document.getElementById('message-input');

    imageInput.value = "";
    documentInput.value = "";

    fileNameDisplay.innerHTML = "";
    fileNameDisplay.style.display = "none";

    messageInput.style.display = "block";
    messageInput.disabled = false;
    messageInput.focus();
}

let currentStream = null;
async function openWebRTC() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        currentStream = stream;

        const videoElement = document.getElementById('camera-stream');
        videoElement.srcObject = stream;

        document.getElementById('camera-modal').style.display = 'flex';
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Unable to turn on camera Please allow the website to access your camera.");
    }
}

function closeCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('camera-modal').style.display = 'none';
}

function takePhoto() {
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const imageInput = document.getElementById('image-input');
        imageInput.files = dataTransfer.files;

        if (typeof showPreviewText === "function") {
            showPreviewText();
        }
        closeCamera();
    }, 'image/jpeg', 0.85);
}

async function loadFilesAndLinks() {
    if (current_chat_room_id == null) return;

    try {
        const response = await fetch(`http://localhost:5123/ChatMessage/GetMessages?chat_room_id=${current_chat_room_id}`);
        const result = await response.json();

        if (result.success) {
            const allMessages = result.data;
            let mediaItemsHTML = "";

            const filteredMessages = allMessages
                .filter(msg => {
                    const hasDoc = msg.document_url && msg.document_url !== "";
                    const hasLink = msg.message_text && /(https?:\/\/[^\s]+)/.test(msg.message_text);
                    return hasDoc || hasLink;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const emptyState = document.getElementById('empty-poll-files-links');
            const listContainer = document.getElementById('files-list-container');

            if (filteredMessages.length === 0) {
                emptyState.style.display = "flex";
                listContainer.style.display = "none";
            } else {
                emptyState.style.display = "none";
                listContainer.style.display = "flex";

                filteredMessages.forEach(msg => {
                    const timeString = new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    const senderName = msg.sender_name ? msg.sender_name : "Unknown";

                    if (msg.document_url && msg.document_url !== "") {
                        const docName = msg.document_name ? msg.document_name : "Document File";
                        mediaItemsHTML += `
                            <div onclick="window.open('${msg.document_url}', '_blank')" style="display: flex; gap: 12px; align-items: center; background-color: #f1f5f9; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; transition: 0.2s;">
                                <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background-color: #e2e8f0; border-radius: 6px; flex-shrink: 0;">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                </div>
                                <div style="display: flex; flex-direction: column; overflow: hidden; flex-grow: 1; justify-content: center;">
                                    <span class="text-sm font-semibold" style="color: #0284c7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${docName}</span>
                                    <span class="text-xs font-regular" style="color: #6b7280;">${senderName} • ${timeString}</span>
                                </div>
                            </div>
                        `;
                    }

                    if (msg.message_text && /(https?:\/\/[^\s]+)/.test(msg.message_text)) {
                        const urls = msg.message_text.match(/(https?:\/\/[^\s]+)/g);
                        urls.forEach(url => {
                            mediaItemsHTML += `
                                <div style="display: flex; gap: 12px; align-items: center; padding: 10px; background-color: #fff; border-radius: 8px; border: 1px solid #e5e7eb;">
                                    <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background-color: #e0f2fe; border-radius: 6px; flex-shrink: 0;">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; overflow: hidden; flex-grow: 1; justify-content: center;">
                                        <a href="${url}" target="_blank" class="text-sm font-semibold" style="color: #0284c7; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${url}</a>
                                        <span class="text-xs font-regular" style="color: #6b7280;">${senderName} • ${timeString}</span>
                                    </div>
                                </div>
                            `;
                        });
                    }
                });

                listContainer.innerHTML = mediaItemsHTML;
            }
        }
    } catch (error) {
        console.error("Error loading files and links:", error);
    }
}

async function loadSettingImages() {
    if (current_chat_room_id == null) return;

    try {
        const response = await fetch(`http://localhost:5123/ChatMessage/GetMessages?chat_room_id=${current_chat_room_id}`);
        const result = await response.json();

        if (result.success) {
            const allMessages = result.data;

            const imageMessages = allMessages
                .filter(msg => msg.image_url && msg.image_url !== "")
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const mediaGrid = document.getElementById('setting-media-grid');
            if (!mediaGrid) return;

            mediaGrid.innerHTML = "";

            imageMessages.forEach(msg => {
                mediaGrid.innerHTML += `
                    <div class="media-item" style="background-color: transparent; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        <img src="${msg.image_url}" onclick="window.open('${msg.image_url}', '_blank')" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: 0.2s;" />
                    </div>
                `;
            });

        }
    } catch (error) {
        console.error("Error loading images for settings:", error);
    }
}

async function loadChatRooms() {
    try {
        const response = await fetch('http://localhost:5123/Chat/GetMyChatRooms');
        const result = await response.json();

        if (result.success) {
            let cardsHtml = "";
            const chatListContainer = document.getElementById('chat-list');
            const chatBody = document.getElementById('chat-body');

            result.data.forEach(room => {
                let previewText = room.last_message_text ? room.last_message_text : "Start Chat!";
                previewText = escapeHTML(previewText);

                let time_string = "";
                if (room.last_message_time) {
                    const msgDate = new Date(room.last_message_time);
                    const timePart = msgDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    const datePart = `${msgDate.getDate()}/${msgDate.getMonth() + 1}/${msgDate.getFullYear()}`;
                    time_string = `${datePart} ${timePart}`;
                }
                let roomImg = room.event_img_path ? room.event_img_path : '/images/default_chat_icon.png';
                let locationName = room.event_location ? room.event_location : 'Unknown Location';
                const formatDate = (dateStr) => {
                    if (!dateStr) return "";
                    const d = new Date(dateStr);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                };
                let startDateStr = formatDate(room.start_date);
                let endDateStr = formatDate(room.end_date);
                let dateDisplay = (startDateStr && endDateStr) ? `${startDateStr} - ${endDateStr}` : 'ไม่มีกำหนดการ';
                cardsHtml += `
                    <div class="chat-card" onclick="openChatRoom('${room.event_id}', '${room.chat_name}', '${room.id}', '${room.event_location}', '${startDateStr}', '${endDateStr}', '${roomImg}')">
                        <img class="event-image" src="${roomImg}" />
                        <div class="chat-info">
                            <h4 class="chat-info-header text-sm font-semibold">${room.chat_name}</h4>
                            <div class="info-row">
                                <img class="locate-icon" src="/images/locate_icon.svg" />
                                <p class="chat-info-description text-sm font-semibold">${locationName}</p>
                            </div>
                            <div class="info-row">
                                <img class="date-icon" src="/images/date_icon.svg" />
                                <p class="chat-info-description text-xs font-semibold">${dateDisplay}</p>
                            </div>
                            <div class="info-row">
                                <img class="path-icon" src="/images/path_icon.svg" />
                                <p class="chat-info-description text-xs font-semibold" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%;">
                                    ${previewText}
                                </p>
                                <span class="text-xs font-semibold" style="flex-shrink: 0; margin: 0; padding: 8px;">-</span>
                                <p class="chat-info-description text-xs font-semibold" style="padding: 0px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">
                                    ${time_string}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            });
            if (chatListContainer) {
                chatListContainer.innerHTML = cardsHtml;
            }

            chatBody.scrollTop = chatBody.scrollHeight;
        }
    } catch (error) {
        console.error("Error loading chat rooms:", error);
    }
}

function escapeHTML(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 🌟 ฟังก์ชันนับเวลาถอยหลังแบบ Real-time ทำงานทุก 1 นาที
setInterval(() => {
    // หาโพลทุกอันในแชทที่มีคลาส live-poll-timer
    const timers = document.querySelectorAll('.live-poll-timer');

    timers.forEach(timer => {
        const deadlineStr = timer.getAttribute('data-deadline');
        if (!deadlineStr || deadlineStr === "undefined") return;

        const deadlineDate = new Date(deadlineStr);
        const now = new Date();
        const diffMs = deadlineDate - now;

        // ถ้าหมดเวลาแล้ว
        if (diffMs <= 0) {
            timer.textContent = "Poll ended";
            timer.style.color = "#888"; // เปลี่ยนเป็นสีเทา
            return;
        }

        // คำนวณเวลาที่เหลือใหม่
        let mins = Math.floor(diffMs / 60000);
        let hours = Math.floor(mins / 60);
        let days = Math.floor(hours / 24);

        if (days > 0) {
            timer.textContent = `Poll end up in ${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            timer.textContent = `Poll end up in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
            timer.textContent = `Poll end up in ${mins} minute${mins > 1 ? 's' : ''}`;
        }
    });
}, 60000); // 60000 มิลลิวินาที = 1 นาที (ถ้าอยากให้วิ่งทุกวินาทีเปลี่ยนเป็น 1000 ครับ)

