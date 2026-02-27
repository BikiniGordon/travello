const currentEventId = "trip-01"; 
const currentUserId = "Me"; 

function openChatRoom(event_id, chat_name){
    //เอา event_id ไปหา chat เพื่อดึง
    // เดี๋ยวเอา chat_name ออก แล้วไป map ใน database ดึงแทน
    curr_room_id = event_id;

    document.getElementById('empty-room').style.display = 'none';
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