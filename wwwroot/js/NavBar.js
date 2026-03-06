let pendingRedirectAfterLogin = null;

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuBtn');
    const mobileDropdown = document.getElementById('dropdown');
    const createEventButtons = document.querySelectorAll('.CreateEvent[data-create-event-url]');

    createEventButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const isAuthenticated = button.dataset.isAuthenticated === 'true';
            const createEventUrl = button.dataset.createEventUrl;

            if (!isAuthenticated) {
                event.preventDefault();
                pendingRedirectAfterLogin = createEventUrl || null;
                openLoginModal();
                return;
            }

            if (createEventUrl) {
                window.location.href = createEventUrl;
            }
        });
    });

    // 1. Toggle Mobile Menu (Hamburger)
    if (menuBtn && mobileDropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDropdown.classList.toggle('show');
            document.body.classList.toggle('menu-active');
        });
    }

    // 2. Unified Click-Away Logic
    window.addEventListener('click', (e) => {
        // Close Mobile Menu if clicking outside
        if (mobileDropdown && mobileDropdown.classList.contains('show') && 
            !menuBtn.contains(e.target) && !mobileDropdown.contains(e.target)) {
            mobileDropdown.classList.remove('show');
            document.body.classList.remove('menu-active');
        }

        // Close ANY Profile Dropdown if clicking outside the container
        if (!e.target.closest('.ProfileContainer')) {
            document.querySelectorAll('.ProfileDropdownContent').forEach(openMenu => {
                openMenu.classList.remove('show');
            });
        }
    });
});

/**
 * Toggle Profile Menu
 * Pass 'event' explicitly from the HTML to avoid reference errors
 */
function toggleProfileMenu(e) {
    // Prevent the window click listener from immediately closing the menu we are trying to open
    if (e) e.stopPropagation();

    // Find the container relative to the clicked element
    const btn = e.currentTarget || e.target.closest('.ProfilePic');
    const container = btn.closest('.ProfileContainer');
    const dropdown = container.querySelector('.ProfileDropdownContent');

    // Close other profile menus (if any)
    document.querySelectorAll('.ProfileDropdownContent').forEach(menu => {
        if (menu !== dropdown) menu.classList.remove('show');
    });

    // Toggle this one
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

function openLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "flex";
        // Close the profile dropdown menu as well
        document.querySelectorAll('.ProfileDropdownContent').forEach(d => d.classList.remove('show'));
    }
}

// Close the Modal
function closeLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Close modal if user clicks the dark background
window.addEventListener('click', (e) => {
    const modal = document.getElementById("loginModal");
    if (e.target === modal) {
        closeLoginModal();
    }
});

// Add this inside your DOMContentLoaded block
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
            if (pendingRedirectAfterLogin) {
                const destination = pendingRedirectAfterLogin;
                pendingRedirectAfterLogin = null;
                window.location.href = destination;
                return;
            }

            // This refreshes the page so the @if (Session) logic in Razor triggers
            window.location.reload();
        } else {
            // Show error message (you can add a div for this in your modal)
            alert(result.message);
        }
    });
}