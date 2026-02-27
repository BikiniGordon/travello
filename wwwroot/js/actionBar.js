
(function () {
    // userStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'owner'
    const eventTitleEl = document.getElementById('actionBarTitle');
    const actionBarButtons = document.querySelector('.action-bar-buttons');
  
    let userStatus = 'approved'; 
    // const userStatus = document.getElementById('userStatus').value;

    function renderActionBar(status) {
        actionBarButtons.innerHTML = ''; //clear old botton

        if (status === 'none') {
            //crate JOIN botton -> append to .action-bar-buttons
            const btn = document.createElement('button'); 
            btn.className = 'btn-action btn-join text-md font-semibold';
            btn.textContent = 'JOIN';
            btn.addEventListener('click', function () {
                handleJoin(btn);
            });
            actionBarButtons.appendChild(btn);

        } else if (status === 'pending') {
            
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-submit text-md font-semibold';
            btn.textContent = 'SUBMIT';
            btn.disabled = true; //disabled
            actionBarButtons.appendChild(btn);

        } else if (status === 'approved') {

            const btn = document.createElement('button');
            btn.className = 'btn-action btn-leave text-md font-semibold';
            btn.textContent = 'LEAVE TRIP';
            btn.addEventListener('click', handleLeaveTrip);
            actionBarButtons.appendChild(btn);

        } else if (status === 'rejected') {

            const btn = document.createElement('button');
            btn.className = 'btn-action btn-rejected text-sm font-semibold';
            btn.textContent = 'REQUEST TO JOIN HAS BEEN REJECTED';
            btn.disabled = true;
            actionBarButtons.appendChild(btn);

        } else if (status === 'owner') {

            const endBtn = document.createElement('button');
            endBtn.className = 'btn-action btn-end-registration text-md font-semibold';
            endBtn.textContent = 'END REGISTRATION';
            endBtn.addEventListener('click', handleEndRegistration);
            actionBarButtons.appendChild(endBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit-round';
            editBtn.setAttribute('aria-label', 'Edit Event');
            editBtn.innerHTML = `<img src="/images/Edit.svg" width="20" height="20" alt="edit">`;
            editBtn.addEventListener('click', handleEditEvent);
            actionBarButtons.appendChild(editBtn);
        }
    }

    // ---- Handlers ----

    function handleJoin(btn) {
        openJoinModal();
    }
//     document.getElementById('joinSubmitBtn').addEventListener('click', async function() {
//     const eventId = document.getElementById('eventId').value;

//     const answers = [...document.querySelectorAll('#joinQuestionList input')]
//         .map(input => ({
//             questionId: input.dataset.questionId,
//             answer: input.value
//         }));

//     const res = await fetch('/Event/Join/' + eventId, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ answers })
//     });

//     if (res.ok) {
//         closeJoinModal();
//         userStatus = 'pending';
//         renderActionBar(userStatus);
//     }
// });

    function handleEndRegistration() {
        alert('ปิดรับสมัครแล้ว'); // delete
    }
//     function handleEndRegistration() {
//     alert('ปิดรับสมัครแล้ว');  // แค่ alert ไม่ได้บันทึกจริง
// }
//     async function handleEndRegistration() {
//         const eventId = document.getElementById('eventId').value;

//         const res = await fetch('/Event/EndRegistration/' + eventId, { 
//             method: 'POST' 
//         });

//         if (res.ok) {
//             // อาจ redirect หรือเปลี่ยน UI
//             alert('ปิดรับสมัครแล้ว');
//         }
//     }

    function handleEditEvent() {
        // window.location.href = '/Event/Edit/' + eventId;
        alert('ไปหน้าแก้ไข Event'); // delete
    }

    const joinQuestions = [
        { id: 1, question: "ทำไมถึงอยากร่วมทริป ?" },
        // const joinQuestions = await fetch('/Event/Questions/' + eventId).then(r => r.json());
    ];

    function openJoinModal() {
        const joinModal = document.getElementById('joinModal');
        const questionList = document.getElementById('joinQuestionList');
        questionList.innerHTML = joinQuestions.map((q, i) => `
            <div class="join-question-item">
                <label for="joinQ${i}">${q.question}</label>
                <input type="text" id="joinQ${i}" data-question-id="${q.id}" >
            </div>
        `).join('');
        joinModal.classList.add('open');
        joinModal.setAttribute('aria-hidden', 'false');
    }

    function closeJoinModal() {
        const joinModal = document.getElementById('joinModal');
        joinModal.classList.remove('open');
        joinModal.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('joinModalCloseBtn').addEventListener('click', closeJoinModal);
    document.getElementById('joinModal').addEventListener('click', function(e) {
        if (e.target === this) closeJoinModal();
    });
    document.getElementById('joinSubmitBtn').addEventListener('click', function() {
        const answers = joinQuestions.map((q, i) => ({
            questionId: q.id,
            answer: document.getElementById('joinQ' + i).value
        }));
    //    await fetch('/Event/Join/' + eventId, {
    //     method: 'POST',
    //     body: JSON.stringify({ answers }),
    //     headers: { 'Content-Type': 'application/json' }
    // });
        closeJoinModal();
        userStatus = 'pending';
        renderActionBar(userStatus);
    });

    function handleLeaveTrip() {
    const leaveModal = document.getElementById('leaveModal');
    leaveModal.classList.add('open');
    leaveModal.setAttribute('aria-hidden', 'false');
}

    document.getElementById('leaveModalCloseBtn').addEventListener('click', function() {
        document.getElementById('leaveModal').classList.remove('open');
    });

    document.getElementById('leaveCancelBtn').addEventListener('click', function() {
        document.getElementById('leaveModal').classList.remove('open');
    });

    document.getElementById('leaveConfirmBtn').addEventListener('click', function() {
        document.getElementById('leaveModal').classList.remove('open');
        // await fetch('/Event/Leave/' + eventId, { method: 'POST' });
        userStatus = 'none';
        renderActionBar(userStatus);
    });

    document.getElementById('leaveModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('open');
    });

    // ---- Init ----
    renderActionBar(userStatus);

})();