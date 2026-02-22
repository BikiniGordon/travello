document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuBtn');
    const dropdown = document.getElementById('dropdown');

    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            document.body.classList.toggle('menu-active');
        });

        window.addEventListener('click', (e) => {
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
                document.body.classList.remove('menu-active');
            }
        });
    }
});