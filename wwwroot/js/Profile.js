// ตัวแปรสำหรับจำว่าเรากำลังจะลบโพสต์ไหน
let eventIdToDelete = "";

// ฟังก์ชันเปิด Popup
function openDeleteModal(eventId) {
    eventIdToDelete = eventId; // จำ ID โพสต์ไว้ก่อน
    
    // เคลียร์ข้อความเก่าในช่องกรอกเหตุผล (ถ้ามี)
    document.getElementById('input_reasons').value = ""; 
    
    // เปลี่ยนจาก display: none เป็น flex เพื่อให้โชว์และอยู่ตรงกลาง
    document.getElementById('deleteModal').style.display = 'flex'; 
}

// ฟังก์ชันปิด Popup
function closeDeleteModal() {
    // ซ่อนกล่องกลับไปเหมือนเดิม
    document.getElementById('deleteModal').style.display = 'none'; 
    eventIdToDelete = ""; // ล้างค่า ID ทิ้ง
}
async function submitDelete() {
    // 1. ดึงข้อความเหตุผลที่พิมพ์ไว้
    const reasonText = document.getElementById('input_reasons').value;
    
    // 2. เช็คกันเหนียวว่ามี ID โพสต์ที่จะลบหรือเปล่า
    if (!eventIdToDelete) return; 

    try {
        // 3. ยิงคำสั่ง (Fetch) ไปที่หลังบ้าน (EventController ฟังก์ชัน DeleteEvent)
        const response = await fetch('/Event/DeleteEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                eventId: eventIdToDelete, 
                reason: reasonText 
            })
        });

        const data = await response.json();

        // 4. ถ้าหลังบ้านลบสำเร็จ
        if (data.success) {
            closeDeleteModal(); // ปิดหน้าต่าง Popup
            location.reload();  // รีเฟรชหน้าเว็บ 1 รอบเพื่ออัปเดตให้โพสต์หายไป
        } else {
            alert('เกิดข้อผิดพลาด: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('ระบบมีปัญหา ไม่สามารถลบข้อมูลได้ครับ');
    }
}
async function deleteUserTag(tagName, buttonElement) {
    // ถามย้ำเพื่อความชัวร์ก่อนลบ
    if (!confirm(`คุณต้องการลบ Tag #${tagName} ใช่หรือไม่?`)) return;

    try {
        // ยิงคำสั่งไปที่หลังบ้าน (สมมติว่าชื่อ ProfileController และฟังก์ชัน DeleteTag)
        const response = await fetch('/Home/DeleteTag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tag: tagName })
        });

        const data = await response.json();

        if (data.success) {
            // พระเอกอยู่ตรงนี้ครับ! สั่งให้ลบกล่อง tag_item นั้นทิ้งจากหน้าจอทันที ไม่ต้องรีเฟรช
            buttonElement.closest('.tag_item').remove();
        } else {
            alert('ลบไม่สำเร็จ: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('ระบบมีปัญหา ไม่สามารถลบ Tag ได้ครับ');
    }
}