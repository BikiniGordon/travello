let current_event_id = "";
let current_chat_room_id = "";

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