let current_event_id = null;
let current_chat_room_id = null;

function openChatRoom(event_id, chat_name, chat_room_id){
    //เอา event_id ไปหา chat เพื่อดึง
    // เดี๋ยวเอา chat_name ออก แล้วไป map ใน database ดึงแทน
    current_event_id = event_id;
    current_chat_room_id = chat_room_id;

    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('chat-room').style.display = 'flex';    

    document.getElementById('chat-room-title').innerText = chat_name;
    document.getElementById('setting-event-title').innerText = chat_name;
    document.getElementById('setting-event-status').innerText = event_id;

    loadChatMessages();

    if (chatPollingInterval) clearInterval(chatPollingInterval);

    chatPollingInterval = setInterval(loadChatMessages, 3000);
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

    // =======================================================
    // 📡 5. ส่วนดึงข้อมูล (เลือกใช้ Mock Data หรือ Fetch API จริง)
    // =======================================================
    
    /* // 🚀 โค้ดของจริง: เมื่อคุณทำ Controller ใน C# เสร็จแล้ว ให้เปิดคอมเมนต์โค้ดนี้
    fetch(`/Poll/GetPollsByEventId?event_id=${event_id}`)
        .then(response => response.json())
        .then(data => renderPollCards(data))
        .catch(error => console.error("Error fetching polls:", error));
    */

    // let mockData = [];
    
    // สมมติว่าถ้า event_id เป็น 1 หรือ "trip-01" จะมีโพลโชว์
    // if (event_id === 1) { 
    //     mockData = [
    //         { question: "What will we eat the morning of the trip?", winner: "Ramen", time_left: "5 hours", percent: 40 },
    //         { question: "Where should we stay on the second night?", winner: "Tent", time_left: "Ended", percent: 85 }
    //     ];
    // } 
    // ถ้าเป็น event_id อื่นๆ mockData จะว่างเปล่า [] และไปเข้าเงื่อนไขแสดง Empty แทน

    // renderPollCards(mockData); // ส่งข้อมูลไปให้ฟังก์ชันวาดการ์ด

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
function openPollCard(event_id, poll_id, questionText) {
    // สลับหน้าจอ
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('poll-select-card').style.display = 'flex';    

    // ใส่หัวข้อคำถาม (รับมาจากตอนกดการ์ด)
    document.getElementById('detail-poll-question').innerText = questionText || "What will we eat the morning of the trip?";

    // 🧪 ข้อมูลจำลองตัวเลือก (Mock Data)
    const mockOptions = [
        { text: "Ramen", percent: 60, votersCount: 2 },
        { text: "Sushi", percent: 40, votersCount: 2 },
        { text: "Burger", percent: 0, votersCount: 0 }
    ];

    const optionsContainer = document.getElementById('poll-options-container');
    const template = document.getElementById('poll-option-template');
    
    // ล้างข้อมูลเก่าก่อนวาดใหม่
    optionsContainer.innerHTML = '';

    // วนลูปวาดตัวเลือก
    mockOptions.forEach(opt => {
        const optionClone = template.content.cloneNode(true);
        
        optionClone.querySelector('.poll-option-text').textContent = opt.text;
        optionClone.querySelector('.progress-bar-fill').style.width = `${opt.percent}%`;
        
        // วาดรูปคนโหวตซ้อนๆ กัน
        const votersBox = optionClone.querySelector('.poll-voters');
        for(let i=0; i < opt.votersCount; i++){
            // สร้าง div รูปโปรไฟล์ (ของจริงสามารถใช้แท็ก <img> ใส่ src ได้เลย)
            const avatar = document.createElement('div');
            avatar.className = 'voter-avatar';
            votersBox.appendChild(avatar);
        }

        optionsContainer.appendChild(optionClone);
    });
}

function backToAllPolls() {
    document.getElementById('poll-select-card').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'flex';
}

function openCreatePoll(){
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('create-poll-page').style.display = 'flex';
    setupPollTimeDropdowns(); 

}

function backAllPollRoom(){
    document.getElementById('all-poll-room').style.display = 'flex';
    document.getElementById('create-poll-page').style.display = 'none';
}

function setupPollTimeDropdowns() {
    const hourSelect = document.getElementById('poll-hour-select');
    const minuteSelect = document.getElementById('poll-minute-select');

    for (let i = 0; i < 24; i++) {
        let hr = i.toString().padStart(2, '0');
        hourSelect.innerHTML += `<option value="${hr}">${hr}</option>`;
    }

    for (let i = 0; i < 60; i += 1) {
        let min = i.toString().padStart(2, '0');
        minuteSelect.innerHTML += `<option value="${min}">${min}</option>`;
    }
}

async function sendMessage() {
    const inputField = document.getElementById('message-input');
    const messageText = inputField.value.trim();

    const fileInput = document.getElementById('image-input'); 
    const selectedFile = fileInput.files[0]; 

    // 🌟 1. แก้เงื่อนไข: ถ้าไม่มีทั้งข้อความ และ ไม่มีทั้งไฟล์รูป ให้หยุดทำงาน
    if (!messageText && !selectedFile) return;

    // 🌟 2. แพ็คของใส่กล่อง FormData (ใช้ตัวนี้ตัวเดียวจบ ส่งได้ทั้งข้อความและรูป)
    const formData = new FormData();
    formData.append("chat_room_id", current_chat_room_id);
    formData.append("message_text", messageText);

    if (selectedFile) {
        formData.append("imageFile", selectedFile); 
    }

    let bubbleContent = "";
    
    if (selectedFile) {
        const tempImageUrl = URL.createObjectURL(selectedFile);
        bubbleContent += `<img src="${tempImageUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 4px; display: block;" />`;
    }

    if (messageText) {
        bubbleContent += `<span>${messageText}</span>`;
    }

    const bubbleHtml = `
        <div class="message-row" style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <div class="message-bubble text-sm font-regular" style="background-color: #CEE7E6; color: #000; padding: 12px 16px; border-radius: 20px; border-top-right-radius: 4px; max-width: 60%; word-wrap: break-word;">
                ${bubbleContent}
            </div>
        </div>
    `;

    const chatBody = document.getElementById('chat-body');
    chatBody.insertAdjacentHTML('beforeend', bubbleHtml);
    chatBody.scrollTop = chatBody.scrollHeight;

    // 🌟 4. เคลียร์ช่องพิมพ์และช่องไฟล์ทันที
    inputField.value = "";
    fileInput.value = "";
    
    // ถ้ามีตัวโชว์ชื่อไฟล์ ก็เคลียร์ทิ้งด้วย (ป้องกันบั๊กโชว์ค้าง)
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) fileNameDisplay.innerText = "";

    // 🌟 5. ยิงไปหา Backend (ทำแค่รอบเดียวพอ!)
    try {
        const response = await fetch('http://localhost:5123/ChatMessage/SendMessage', {
            method: 'POST',
            body: formData // โยน FormData ไปเลย ไม่ต้องตั้ง Content-Type
        });

        const result = await response.json();
        
        if (!result.success) {
            console.error("เซฟลง DB ไม่สำเร็จ!");
        } else {
            console.log("เซฟข้อความ/รูปลง DB เรียบร้อย!");
        }

    } catch (error) {
        console.error("เชื่อมต่อ Backend ไม่สำเร็จ:", error);
    }
}

function handleEnterPress(event) {
    // ถ้าผู้ใช้กดปุ่ม Enter
    if (event.key === "Enter") {
        event.preventDefault(); // 🌟 บล็อกไม่ให้หน้าเว็บ Refresh
        sendMessage(); // สั่งให้ยิงฟังก์ชันส่งข้อความ
    }
}

async function loadChatMessages() {
    if (current_chat_room_id == null) return;

    try {
        const response = await fetch(`http://localhost:5123/ChatMessage/GetMessages?chat_room_id=${current_chat_room_id}`);
        const result = await response.json();

        if (result.success) {
            const chatBody = document.getElementById('chat-body');
            
            chatBody.innerHTML = ""; 

            const my_user_id = "69a9afc35f16b10cdb2b5079";

            result.data.forEach(msg => {
                let bubbleHtml = "";
                let messageContent = "";

                if (msg.image_url && msg.image_url !== "") {
                    messageContent += `<img src="${msg.image_url}" style="max-width: 100%; border-radius: 8px; margin-bottom: 4px; display: block;" />`;
                }

                if (msg.message_text && msg.message_text !== "null" && msg.message_text.trim() !== "") {
                    messageContent += `<span>${msg.message_text}</span>`;
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
                        <div class="message-row other-message" style="display: flex; gap: 15px; margin-bottom: 16px;  font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif;">
                            <img class="talker" src=${msg.sender_img} style="width: 49px; height: 49px; border-radius: 50px; object-fit: cover"/>
                            <div class="message-bubble text-sm font-regular" style="background-color: #fff; border: 1px solid #e5e7eb; padding: 12px 20px; border-radius: 20px; border-top-left-radius: 4px; max-width: 60%; word-wrap: break-word;">
                                ${messageContent}
                            </div>
                        </div>
                    `;
                }
                
                chatBody.insertAdjacentHTML('beforeend', bubbleHtml);
            });

            chatBody.scrollTop = chatBody.scrollHeight;
        }
    } catch (error) {
        console.error("error", error);
    }
}

function showPreviewText() {
    const fileInput = document.getElementById('image-input');
    const displayArea = document.getElementById('file-name-display');
    document.getElementById("message-input").style.display = 'none';
    document.getElementById("file-name-display").style.display = 'flex';

    if (fileInput.files.length > 0) {
        displayArea.innerText = "Photo: " + fileInput.files[0].name;
    } else {
        // ถ้ากดยกเลิก ก็ซ่อนข้อความ
        displayArea.innerText = "";
    }
}