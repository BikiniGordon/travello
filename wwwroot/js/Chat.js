// wwwroot/js/chat.js

// สมมติข้อมูลชั่วคราว (เดี๋ยวตอนทำระบบเลือกห้องแชท เราค่อยมาเปลี่ยนค่าพวกนี้แบบไดนามิกครับ)
const currentEventId = "trip-01"; 
const currentUserId = "Me"; 

// 1. ฟังก์ชันดึงข้อความ (AJAX GET)
function loadMessages() {
// เปลี่ยนจาก /Chat/GetMessagesByRoom เป็น /ChatMessage/GetMessages
    fetch(`/ChatMessage/GetMessages?eventId=${currentEventId}`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('chat-messages-container');
            
            // เช็คว่าเลื่อนจออยู่ไหม
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;

            container.innerHTML = ''; 

            data.forEach(msg => {
                const div = document.createElement('div');
                const isMyMessage = msg.sender_id === currentUserId;
                
                // สลับคลาส CSS ระหว่างข้อความเรา กับ ข้อความเพื่อน
                div.className = isMyMessage ? 'message-bubble my-message' : 'message-bubble other-message';

                const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                div.innerHTML = `
                    <div class="sender">${msg.sender_id}</div>
                    <div class="text">${msg.message_text}</div>
                    <div class="time">${timeString}</div>
                `;
                container.appendChild(div);
            });

            if (isScrolledToBottom) {
                container.scrollTop = container.scrollHeight;
            }
        })
        .catch(error => console.error('Error:', error));
}

// 2. ฟังก์ชันส่งข้อความ (AJAX POST)
function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (text === "") return; 

    const payload = {
        event_id: currentEventId,
        sender_id: currentUserId,
        message_text: text
    };

    fetch('/ChatMessage/SendMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            input.value = ''; 
            loadMessages();   
        }
    })
    .catch(error => console.error('Error:', error));
}

// 3. ตั้งค่าการทำงานเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener("DOMContentLoaded", function() {
    loadMessages(); 
    setInterval(loadMessages, 2000); // Polling ทุก 2 วินาที

    // กด Enter เพื่อส่งข้อความ
    const inputField = document.getElementById('message-input');
    if (inputField) {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});