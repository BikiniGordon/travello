(function () {
    // userStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'owner' | 'closed'
    const actionBarButtons = document.querySelector('.action-bar-buttons');

    let userStatus = document.getElementById('userStatus').value;
    const eventId  = document.getElementById('eventId').value;

    // RENDER ACTION BAR

    function renderActionBar(status) {
        actionBarButtons.innerHTML = '';

        if (status === 'none') {
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-join text-md font-semibold';
            btn.textContent = 'JOIN';
            btn.addEventListener('click', openJoinModal);
            actionBarButtons.appendChild(btn);

        } else if (status === 'pending') {
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-submit text-md font-semibold';
            btn.textContent = 'AWAITING APPROVAL';
            btn.disabled = true;
            actionBarButtons.appendChild(btn);

        } else if (status === 'approved') {
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-leave text-md font-semibold';
            btn.textContent = 'LEAVE TRIP';
            btn.addEventListener('click', openLeaveModal);
            actionBarButtons.appendChild(btn);

        } else if (status === 'rejected') {
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-rejected text-sm font-semibold';
            btn.textContent = 'JOIN REQUEST REJECTED';
            btn.disabled = true;
            actionBarButtons.appendChild(btn);

        } else if (status === 'closed') {
            const btn = document.createElement('button');
            btn.className = 'btn-action btn-closed text-md font-semibold';
            btn.textContent = 'REGISTRATION CLOSED';
            btn.disabled = true;
            actionBarButtons.appendChild(btn);

        } else if (status === 'owner') {
            const endBtn = document.createElement('button');
            endBtn.className = 'btn-action btn-end-registration text-md font-semibold';
            endBtn.textContent = 'END REGISTRATION';
            endBtn.addEventListener('click', openEndRegistrationModal);
            actionBarButtons.appendChild(endBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit-round';
            editBtn.setAttribute('aria-label', 'Edit Event');
            editBtn.innerHTML = `<img src="/images/Edit.svg" width="20" height="20" alt="edit">`;
            editBtn.addEventListener('click', () => {
                window.location.href = '/Event/Edit/' + eventId;
            });
            actionBarButtons.appendChild(editBtn);
        }
    }

    // JOIN MODAL 

    function openJoinModal() {
        const joinModal = document.getElementById('joinModal');
        joinModal.querySelectorAll('input[type="text"]').forEach(inp => inp.value = '');
        validateJoinForm();
        joinModal.classList.add('open');
        joinModal.setAttribute('aria-hidden', 'false');
    }

    function closeJoinModal() {
        const joinModal = document.getElementById('joinModal');
        joinModal.classList.remove('open');
        joinModal.setAttribute('aria-hidden', 'true');
    }

    function validateJoinForm() {
        const inputs    = document.querySelectorAll('#joinQuestionList input[type="text"]');
        const submitBtn = document.getElementById('joinSubmitBtn');
        const allFilled = [...inputs].every(inp => inp.value.trim() !== '');
        submitBtn.disabled       = !allFilled;
        submitBtn.style.opacity  = allFilled ? '1' : '0.5';
        submitBtn.style.cursor   = allFilled ? 'pointer' : 'not-allowed';
    }

    document.getElementById('joinQuestionList').addEventListener('input', function (e) {
        if (e.target.tagName === 'INPUT') validateJoinForm();
    });

    document.getElementById('joinModalCloseBtn').addEventListener('click', closeJoinModal);
    document.getElementById('joinModal').addEventListener('click', function (e) {
        if (e.target === this) closeJoinModal();
    });

    document.getElementById('joinSubmitBtn').addEventListener('click', async function () {
        const inputs    = document.querySelectorAll('#joinQuestionList input[type="text"]');
        const allFilled = [...inputs].every(inp => inp.value.trim() !== '');
        if (!allFilled) return;

        const answers = [...inputs].map(inp => ({
            questionId: inp.dataset.questionId,
            answer:     inp.value.trim()
        }));

        try {
            const res = await fetch('/Event/Join/' + eventId, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ answers })
            });
            if (res.ok) {
                closeJoinModal();
                userStatus = 'pending';
                renderActionBar(userStatus);
            } else {
                alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
    });

    // LEAVE MODAL 

    function openLeaveModal() {
        const modal = document.getElementById('leaveModal');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    document.getElementById('leaveModalCloseBtn').addEventListener('click', function () {
        document.getElementById('leaveModal').classList.remove('open');
    });
    document.getElementById('leaveCancelBtn').addEventListener('click', function () {
        document.getElementById('leaveModal').classList.remove('open');
    });
    document.getElementById('leaveModal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('open');
    });

    document.getElementById('leaveConfirmBtn').addEventListener('click', async function () {
        try {
            const res = await fetch('/Event/Leave/' + eventId, { method: 'POST' });
            if (res.ok) {
                document.getElementById('leaveModal').classList.remove('open');
                userStatus = 'none';
                renderActionBar(userStatus);
            } else {
                alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
    });

    // END REGISTRATION MODAL


    function openEndRegistrationModal() {
        const modal  = document.getElementById('endRegistrationModal');
        const input  = document.getElementById('endReasonInput');
        const subBtn = document.getElementById('endRegistrationSubmitBtn');

        input.value          = '';
        subBtn.disabled      = true;
        subBtn.style.opacity = '0.5';
        subBtn.style.cursor  = 'not-allowed';

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    // validate reason input
    document.getElementById('endReasonInput').addEventListener('input', function () {
        const subBtn = document.getElementById('endRegistrationSubmitBtn');
        const filled = this.value.trim() !== '';
        subBtn.disabled      = !filled;
        subBtn.style.opacity = filled ? '1' : '0.5';
        subBtn.style.cursor  = filled ? 'pointer' : 'not-allowed';
    });

    document.getElementById('endRegistrationModalCloseBtn').addEventListener('click', function () {
        document.getElementById('endRegistrationModal').classList.remove('open');
    });
    document.getElementById('endRegistrationModal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('open');
    });

    document.getElementById('endRegistrationSubmitBtn').addEventListener('click', async function () {
        const reason = document.getElementById('endReasonInput').value.trim();
        if (!reason) return;

        try {
            const res = await fetch('/Event/EndRegistration/' + eventId, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ reason })
            });
            if (res.ok) {
                document.getElementById('endRegistrationModal').classList.remove('open');
                userStatus = 'closed';
                renderActionBar(userStatus);
            } else {
                alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
    });

    renderActionBar(userStatus);

})();