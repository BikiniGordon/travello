window.pendingRedirectAfterLogin = null;

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuBtn');
    const mobileDropdown = document.getElementById('dropdown');
    const createEventButtons = document.querySelectorAll('.CreateEvent[data-create-event-url]');
    const chatButton = document.querySelectorAll('.ChatButton');

    createEventButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const isAuthenticated = button.dataset.isAuthenticated === 'true';
            const createEventUrl = button.dataset.createEventUrl;

            if (!isAuthenticated) {
                event.preventDefault();
                window.pendingRedirectAfterLogin = createEventUrl || null;
                openLoginModal();
                return;
            }

            if (createEventUrl) {
                window.location.href = createEventUrl;
            }
        });
    });

    chatButton.forEach((button) => {
        button.addEventListener('click', (event) => {
            const isAuthenticated = button.dataset.isAuthenticated === 'true';
            if (!isAuthenticated) {
                event.preventDefault();
                openLoginModal();
            }
            else {
                window.location.href = '/Chat';
            }
        });
    });

    if (menuBtn && mobileDropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDropdown.classList.toggle('show');
            document.body.classList.toggle('menu-active');
        });
    }

    window.addEventListener('click', (e) => {
        if (mobileDropdown && mobileDropdown.classList.contains('show') && 
            !menuBtn.contains(e.target) && !mobileDropdown.contains(e.target)) {
            mobileDropdown.classList.remove('show');
            document.body.classList.remove('menu-active');
        }

        if (!e.target.closest('.ProfileContainer')) {
            document.querySelectorAll('.ProfileDropdownContent').forEach(openMenu => {
                openMenu.classList.remove('show');
            });
        }
    });
});

function toggleProfileMenu(e) {
    if (e) e.stopPropagation();

    const btn = e.currentTarget || e.target.closest('.ProfilePic');
    const container = btn.closest('.ProfileContainer');
    const dropdown = container.querySelector('.ProfileDropdownContent');

    document.querySelectorAll('.ProfileDropdownContent').forEach(menu => {
        if (menu !== dropdown) menu.classList.remove('show');
    });

    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

function openLoginModal(fromCreateEvent = false) {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "flex";
        document.querySelectorAll('.ProfileDropdownContent').forEach(d => d.classList.remove('show'));
        if (!fromCreateEvent) {
            window.pendingRedirectAfterLogin = null;
        }
    }
}

function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "none";
    }
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById("loginModal");
    if (e.target === modal) {
        closeLoginModal();
    }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(loginForm);
        const response = await fetch('/User/Login', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/';
        } else {
            alert(result.message);
        }
    });
}