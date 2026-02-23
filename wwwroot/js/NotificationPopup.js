document.addEventListener('DOMContentLoaded', () => {
    const notificationButton = document.getElementById('notificationButton');
    const notificationPopup = document.getElementById('notificationPopup');

    // Toggle popup on button click
    notificationButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click from bubbling to document
        notificationPopup.classList.toggle('show');
    });

    // Close popup when clicking outside
    document.addEventListener('click', (event) => {
        if (!notificationPopup.contains(event.target) && 
            !notificationButton.contains(event.target)) {
            notificationPopup.classList.remove('show');
        }
    });
});