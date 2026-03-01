function previewImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            // Find the profile picture container
            var container = document.querySelector('.ProfilePicture');
            var existingImg = container.querySelector('.ProfileImage');
            var svg = container.querySelector('svg');

            if (existingImg) {
                // UPDATE the existing image source
                existingImg.src = e.target.result;
            } else {
                // If it was an SVG before, replace it with an IMG tag
                container.innerHTML = '<img class="ProfileImage" src="' + e.target.result + '"/>';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function showTagInput() {
    const container = document.getElementById('tagList');
    const btn = document.getElementById('addTagBtn');
    
    btn.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'TagInput';
    input.placeholder = 'TAG...';
    input.maxLength = 15; // Set your MAX INPUT here

    // This logic ensures the box is always slightly wider than the text
    input.oninput = function() {
        // Reset width to small so it can shrink if you delete text
        this.style.width = '20px'; 
        // Set width to the actual content size + some extra padding space
        this.style.width = (this.scrollWidth + 10) + 'px'; 
    };

    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            finalizeTag(this.value);
            this.remove();
            btn.style.display = 'flex';
        } else if (e.key === 'Escape') {
            this.remove();
            btn.style.display = 'flex';
        }
    };

    container.insertBefore(input, btn);
    input.focus();
}

function finalizeTag(text) {
    if (!text || text.trim() === "") return;

    const uppercaseTag = text.trim().toUpperCase();
    const tagList = document.getElementById('tagList');
    const btn = document.getElementById('addTagBtn');

    // --- DUPLICATE CHECK ---
    // Check all existing hidden inputs to see if the tag is already there
    const existingTags = Array.from(tagList.querySelectorAll('input[name="user_tag"]'))
                              .map(input => input.value.toUpperCase());

    if (existingTags.includes(uppercaseTag)) {
        alert("This tag already exists!");
        return; // Stop here and don't add the tag
    }
    // -----------------------

    const newTag = document.createElement('div');
    newTag.className = 'Tag';
    newTag.innerHTML = `
        ${uppercaseTag}
        <div class="RemoveTagIcon" onclick="this.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6.47594 6.47623L11.19 11.1903M6.47594 11.1903L11.19 6.47623M14.7255 2.9407C17.9799 6.19506 17.9799 11.4714 14.7255 14.7258C11.4712 17.9802 6.19478 17.9802 2.94041 14.7258C-0.313961 11.4714 -0.313961 6.19506 2.94041 2.9407C6.19478 -0.313673 11.4712 -0.313673 14.7255 2.9407Z" stroke="#1E1E1E" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <input type="hidden" name="user_tag" value="${uppercaseTag}" />
    `;

    tagList.insertBefore(newTag, btn);
}