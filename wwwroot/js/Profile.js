
let eventIdToDelete = "";


function openDeleteModal(eventId) {
    eventIdToDelete = eventId; 
    
    document.getElementById('input_reasons').value = ""; 
    document.getElementById('deleteModal').style.display = 'flex'; 
}

// ฟังก์ชันปิด Popup
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none'; 
    eventIdToDelete = "";
}
async function submitDelete() {
   
    const reasonText = document.getElementById('input_reasons').value;
    if (!eventIdToDelete) return; 

    try {
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


        if (data.success) {
            closeDeleteModal(); 
            location.reload(); 
        } else {
            alert('เกิดข้อผิดพลาด: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('ระบบมีปัญหา ไม่สามารถลบข้อมูลได้ครับ');
    }
}
async function deleteUserTag(tagName, buttonElement) {
   
    if (!confirm(`คุณต้องการลบ Tag #${tagName} ใช่หรือไม่?`)) return;

    try {
     
        const response = await fetch('/Home/DeleteTag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tag: tagName })
        });

        const data = await response.json();

        if (data.success) {
           
            buttonElement.closest('.tag_item').remove();
        } else {
            alert('ลบไม่สำเร็จ: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('ระบบมีปัญหา ไม่สามารถลบ Tag ได้ครับ');
    }
}