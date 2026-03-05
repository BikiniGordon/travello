const currentEventId = "trip-01"; 
const currentUserId = "Me"; 

function openChatRoom(event_id, chat_name){
    //เอา event_id ไปหา chat เพื่อดึง
    // เดี๋ยวเอา chat_name ออก แล้วไป map ใน database ดึงแทน
    curr_room_id = event_id;

    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('chat-room').style.display = 'flex';    

    document.getElementById('chat-room-title').innerText = chat_name;
    document.getElementById('setting-event-title').innerText = chat_name;
    document.getElementById('setting-event-status').innerText = event_id;
}

function openSettingChatRoom(event_id){
    curr_room_id = event_id;

    document.getElementById('chat-room').style.display = 'none';
    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'flex';

    document.getElementById('setting-event-title').innerText = chat_name;
}

function backChatRoom(event_id){
    curr_room_id = event_id;

    document.getElementById('chat-room').style.display = 'flex';
    document.getElementById('empty-room').style.display = 'none';
    document.getElementById('setting-room').style.display = 'none';

    document.getElementById('chat-room-title').innerText = chat_name;
}

function openPollRoom(event_id) {
    currentPollEventId = event_id;

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

    let mockData = [];
    
    // สมมติว่าถ้า event_id เป็น 1 หรือ "trip-01" จะมีโพลโชว์
    if (event_id === 1) { 
        mockData = [
            { question: "What will we eat the morning of the trip?", winner: "Ramen", time_left: "5 hours", percent: 40 },
            { question: "Where should we stay on the second night?", winner: "Tent", time_left: "Ended", percent: 85 }
        ];
    } 
    // ถ้าเป็น event_id อื่นๆ mockData จะว่างเปล่า [] และไปเข้าเงื่อนไขแสดง Empty แทน

    renderPollCards(mockData); // ส่งข้อมูลไปให้ฟังก์ชันวาดการ์ด

    // =======================================================
    // 🎨 6. ฟังก์ชันซ้อน (Helper) สำหรับวาดการ์ดโพลลงจอ
    // =======================================================
    function renderPollCards(data) {
        pollBodyBox.innerHTML = ''; // ล้างคำว่า "กำลังโหลด..." ทิ้ง

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

function backSettingRoom(event_id){
    curr_room_id = event_id

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

// 🌟 2. ฟังก์ชันกดย้อนกลับไปหน้ารวมโพล
function backToAllPolls(event_id) {
    document.getElementById('poll-select-card').style.display = 'none';
    document.getElementById('all-poll-room').style.display = 'flex';
}

function openCreatePoll(event_id){
    document.getElementById('all-poll-room').style.display = 'none';
    document.getElementById('create-poll-page').style.display = 'flex';
    setupPollTimeDropdowns(); 

}

function backAllPollRoom(event_id){
    document.getElementById('all-poll-room').style.display = 'flex';
    document.getElementById('create-poll-page').style.display = 'none';
}

function setupPollTimeDropdowns() {
    const hourSelect = document.getElementById('poll-hour-select');
    const minuteSelect = document.getElementById('poll-minute-select');

    // วนลูปสร้าง ชั่วโมง 00 ถึง 23
    for (let i = 0; i < 24; i++) {
        // padStart(2, '0') คือการเติมเลข 0 ข้างหน้าถ้าเป็นเลขหลักเดียว (เช่น 01, 02)
        let hr = i.toString().padStart(2, '0');
        hourSelect.innerHTML += `<option value="${hr}">${hr}</option>`;
    }

    // วนลูปสร้าง นาที (สมมติให้เลือกทีละ 15 นาที เพื่อความสะดวก: 00, 15, 30, 45)
    // ถ้าอยากให้มีทุกนาทีก็เปลี่ยนเงื่อนไขเป็น i < 60; i++ ได้เลยครับ
    for (let i = 0; i < 60; i += 1) {
        let min = i.toString().padStart(2, '0');
        minuteSelect.innerHTML += `<option value="${min}">${min}</option>`;
    }
}
