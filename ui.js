// Global triggers array
let triggers = [];

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Set initial checkbox and input values from localStorage
    const rememberUsername = localStorage.getItem('rememberUsername') === 'true';
    const rememberPassword = localStorage.getItem('rememberPassword') === 'true';
    document.getElementById('rememberUsername').checked = rememberUsername;
    document.getElementById('rememberPassword').checked = rememberPassword;

    if (rememberUsername) {
        document.getElementById('username').value = localStorage.getItem('username') || '';
    }
    if (rememberPassword) {
        document.getElementById('password').value = localStorage.getItem('password') || '';
    }

    // (Removed extra API key fields not used in Python UI)

    // Load and set the state of the Logon Automation checkbox
    const logonAutomation = localStorage.getItem('logonAutomation') === 'true';
    // Assume the Python UI uses a simple toggle method (if applicable)

    // Load and set the state of the Auto Login checkbox
    const autoLogin = localStorage.getItem('autoLogin') === 'true';
    // (Set these if your design requires them)

    // Load and set the state of the Keep Alive checkbox
    const keepAlive = localStorage.getItem('keepAlive') === 'true';
    document.getElementById('keepAlive').checked = keepAlive;

    // Add event listener for the "Split View" button inside settings if needed
    document.getElementById('splitViewButton') && document.getElementById('splitViewButton').addEventListener('click', splitView);

    // Add event listener for the "Teleconference" button if present
    document.getElementById('teleconferenceButton') && document.getElementById('teleconferenceButton').addEventListener('click', startTeleconference);

    // Add context menus to input fields – update selectors to match our IDs:
    addContextMenu(document.getElementById('host'));
    addContextMenu(document.getElementById('username'));
    addContextMenu(document.getElementById('password'));
    addContextMenu(document.getElementById('messageInput'));

    // Favorites and Settings window event handlers – update button IDs to match index.html:
    document.getElementById('favoritesBtn').addEventListener('click', toggleFavoritesWindow);
    document.getElementById('closeFavoritesBtn').addEventListener('click', toggleFavoritesWindow);
    document.getElementById('addFavoriteBtn').addEventListener('click', addFavorite);
    document.getElementById('removeFavoriteBtn').addEventListener('click', removeFavorite);

    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Attach the keydown listener to the message input after DOM loads
    const inputBox = document.getElementById('messageInput');
    inputBox.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const text = inputBox.value;
            if (text.trim() === "") {
                sendMessage('enter');
            } else {
                sendMessage('message');
            }
            inputBox.value = "";
        }
    });

    // Initialize the trigger system
    loadTriggers();
    document.getElementById('addTriggerButton') && document.getElementById('addTriggerButton').addEventListener('click', addTriggerRow);

    // Add event listener for the "Triggers" button in the main UI – update ID to "triggersBtn"
    document.getElementById('triggersBtn') && document.getElementById('triggersBtn').addEventListener('click', function () {
        document.getElementById('triggersModal').style.display = 'block';
        loadTriggersIntoUI();
    });

    // Add event listener for the "Save" button in the triggers window
    document.getElementById('saveTriggersBtn') && document.getElementById('saveTriggersBtn').addEventListener('click', function () {
        saveTriggersFromUI();
        alert('Triggers saved!');
    });

    // Add event listener for the "Close" button in the triggers window
    document.getElementById('closeTriggersBtn') && document.getElementById('closeTriggersBtn').addEventListener('click', function () {
        document.getElementById('triggersModal').style.display = 'none';
    });

    // Add event listener for the "Clear" button in the chatlog window – update ID to "chatlogBtn" modal if needed
    document.getElementById('clearChatlogBtn') && document.getElementById('clearChatlogBtn').addEventListener('click', clearActiveChatlog);

    // Initialize the members list
    updateMembersDisplay();

    // Ensure input field and Send button are always visible
    const inputContainer = document.getElementById('inputContainer') || document.querySelector('.input-area');
    const sendButton = document.getElementById('sendButton') || document.getElementById('sendBtn');
    window.addEventListener('resize', function () {
        if (inputContainer) inputContainer.style.bottom = '0';
        if (sendButton) sendButton.style.bottom = '0';
    });
    if (inputContainer) {
        inputContainer.style.bottom = '0';
    }
    if (sendButton) {
        sendButton.style.bottom = '0';
    }

    // Add event listener for hyperlink hover to show thumbnail preview
    document.querySelectorAll('.hyperlink').forEach(link => {
        link.addEventListener('mouseenter', function (event) {
            const url = event.target.href;
            showThumbnailPreview(url, event);
        });
        link.addEventListener('mouseleave', function (event) {
            hideThumbnailPreview();
        });
    });
});

// Save settings when the "Save" button is clicked in the settings window
function saveSettings() {
    // Here, simply alert and (if needed) save UI selections (e.g. font and font size)
    alert('Settings saved!');
    hideModal('settingsModal');
}

// Split View functionality: clones the main container and appends it
function splitView() {
    const mainContainer = document.getElementById('mainContainer');
    const clone = mainContainer.cloneNode(true);
    mainContainer.parentNode.appendChild(clone);
    console.log("Split View button clicked");
}

// Teleconference functionality: sends a specific command
function startTeleconference() {
    sendMessage('/go tele');
    console.log("Teleconference button clicked");
}

// Example sendMessage function to handle different types of commands/messages
function sendMessage(typeOrCommand) {
    const inputBox = document.getElementById('messageInput');
    const message = inputBox.value;
    if (typeOrCommand === 'enter') {
        console.log('Sending ENTER keystroke to BBS');
    } else if (typeOrCommand === 'message') {
        console.log(`Sending message: ${message}`);
    } else {
        console.log(`Sending command: ${typeOrCommand}`);
    }
    inputBox.value = "";
}

// Context Menu implementation for input fields
function addContextMenu(inputElement) {
    inputElement.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.left = `${event.clientX}px`;

        const cutOption = document.createElement('div');
        cutOption.textContent = 'Cut';
        cutOption.addEventListener('click', function () {
            document.execCommand('cut');
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(cutOption);

        const copyOption = document.createElement('div');
        copyOption.textContent = 'Copy';
        copyOption.addEventListener('click', function () {
            document.execCommand('copy');
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(copyOption);

        const pasteOption = document.createElement('div');
        pasteOption.textContent = 'Paste';
        pasteOption.addEventListener('click', function () {
            document.execCommand('paste');
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(pasteOption);

        const selectAllOption = document.createElement('div');
        selectAllOption.textContent = 'Select All';
        selectAllOption.addEventListener('click', function () {
            document.execCommand('selectAll');
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(selectAllOption);

        document.body.appendChild(contextMenu);

        document.addEventListener('click', function () {
            if (contextMenu && document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
        }, { once: true });
    });
}

// Favorites window toggle
function toggleFavoritesWindow() {
    const favWindow = document.getElementById('favoritesModal'); // use modal id
    if (favWindow.style.display === 'none' || favWindow.style.display === '') {
        favWindow.style.display = 'block';
        loadFavorites();
    } else {
        favWindow.style.display = 'none';
    }
}

// Load favorites from localStorage and populate the list
function loadFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favorites.forEach(address => {
        const li = document.createElement('li');
        li.textContent = address;
        li.addEventListener('click', function () {
            document.getElementById('host').value = address;
            const lis = favoritesList.getElementsByTagName('li');
            for (let item of lis) {
                item.classList.remove('selected');
            }
            li.classList.add('selected');
        });
        favoritesList.appendChild(li);
    });
}

// Add a new favorite address
function addFavorite() {
    const newFav = document.getElementById('newFavorite').value.trim();
    if (!newFav) return;
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.includes(newFav)) {
        favorites.push(newFav);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
        document.getElementById('newFavorite').value = '';
    }
}

// Remove the selected favorite address
function removeFavorite() {
    const favoritesList = document.getElementById('favoritesList');
    const selected = favoritesList.querySelector('li.selected');
    if (selected) {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favorites = favorites.filter(address => address !== selected.textContent);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
    }
}

// --- Trigger System Functions ---
function loadTriggers() {
    const stored = localStorage.getItem('triggers');
    if (stored) {
        triggers = JSON.parse(stored);
    } else {
        triggers = [];
    }
    renderTriggerList();
}

function saveTriggers() {
    localStorage.setItem('triggers', JSON.stringify(triggers));
}

function renderTriggerList() {
    const container = document.getElementById('triggersList');
    container.innerHTML = "";
    triggers.forEach((trigger, index) => {
        const row = document.createElement('div');
        row.className = 'triggerRow';
        row.style.marginBottom = '5px';

        const triggerInput = document.createElement('input');
        triggerInput.type = 'text';
        triggerInput.placeholder = 'Trigger Text';
        triggerInput.value = trigger.trigger;
        triggerInput.style.marginRight = '5px';
        triggerInput.addEventListener('input', function () {
            triggers[index].trigger = triggerInput.value;
            saveTriggers();
        });
        row.appendChild(triggerInput);

        const responseInput = document.createElement('input');
        responseInput.type = 'text';
        responseInput.placeholder = 'Response Text';
        responseInput.value = trigger.response;
        responseInput.style.marginRight = '5px';
        responseInput.addEventListener('input', function () {
            triggers[index].response = responseInput.value;
            saveTriggers();
        });
        row.appendChild(responseInput);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', function () {
            triggers.splice(index, 1);
            saveTriggers();
            renderTriggerList();
        });
        row.appendChild(removeBtn);

        container.appendChild(row);
    });
}

function addTriggerRow() {
    if (triggers.length >= 10) {
        alert("You can only add up to 10 triggers.");
        return;
    }
    triggers.push({ trigger: "", response: "" });
    saveTriggers();
    renderTriggerList();
}

function checkTriggers(message) {
    const triggersStored = JSON.parse(localStorage.getItem('triggers') || '[]');
    triggersStored.forEach(triggerObj => {
        if (triggerObj.trigger && message.toLowerCase().includes(triggerObj.trigger.toLowerCase())) {
            sendMessage(triggerObj.response);
        }
    });
}

function loadTriggersIntoUI() {
    let stored = localStorage.getItem('triggers');
    let triggersData = stored ? JSON.parse(stored) : [];
    while (triggersData.length < 10) {
        triggersData.push({ trigger: "", response: "" });
    }
    if (triggersData.length > 10) {
        triggersData = triggersData.slice(0, 10);
    }
    const rows = document.querySelectorAll('#triggersTable tbody tr');
    rows.forEach((row, index) => {
        const triggerInput = row.querySelector('.triggerInput');
        const responseInput = row.querySelector('.responseInput');
        triggerInput.value = triggersData[index].trigger;
        responseInput.value = triggersData[index].response;
    });
}

function saveTriggersFromUI() {
    const rows = document.querySelectorAll('#triggersTable tbody tr');
    const newTriggers = [];
    rows.forEach(row => {
        const triggerInput = row.querySelector('.triggerInput');
        const responseInput = row.querySelector('.responseInput');
        newTriggers.push({
            trigger: triggerInput.value.trim(),
            response: responseInput.value.trim()
        });
    });
    localStorage.setItem('triggers', JSON.stringify(newTriggers));
}

// Clear chatlog messages for the currently selected user in the listbox
function clearActiveChatlog() {
    const chatlogList = document.getElementById('chatlogList');
    const selected = chatlogList.querySelector('li.selected');
    if (selected) {
        const username = selected.textContent;
        clearChatlogForUser(username);
        displayChatlogMessages(null);
    }
}

function clearChatlogForUser(username) {
    let chatlog = JSON.parse(localStorage.getItem('chatlog')) || {};
    if (username in chatlog) {
        chatlog[username] = [];
        localStorage.setItem('chatlog', JSON.stringify(chatlog));
    }
}

function displayChatlogMessages(event) {
    const chatlogList = document.getElementById('chatlogList');
    const selected = chatlogList.querySelector('li.selected');
    if (selected) {
        const username = selected.textContent;
        let chatlog = JSON.parse(localStorage.getItem('chatlog')) || {};
        const messages = chatlog[username] || [];
        const chatlogDisplay = document.getElementById('chatlogDisplay');
        chatlogDisplay.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
    }
}

function updateMembersDisplay() {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    const chatMembers = JSON.parse(localStorage.getItem('chatMembers')) || [];
    chatMembers.forEach(member => {
        const li = document.createElement('li');
        li.textContent = member;
        membersList.appendChild(li);
    });
}

function updateChatMembers(newMembers) {
    localStorage.setItem('chatMembers', JSON.stringify(newMembers));
    updateMembersDisplay();
}

function simulateChatroomData() {
    const chatroomData = `
        You are in the MajorLink channel.
        Topic: (General Chat).
        BlaZ@thepenaltybox.org, Chatbot@thepenaltybox.org, Hornet@thepenaltybox.org,
        Khan@sos-bbs.net, Living.Fart@sos-bbs.net, Matlock@thepenaltybox.org,
        NerdTower@ccxbbs.net, Night@thepenaltybox.org, and Nodin@thepenaltybox.org are
        here with you.
        Just press "?" if you need any assistance.
    `;
    const lines = chatroomData.split('\n');
    const members = extractUsernamesFromLines(lines);
    updateChatMembers(members);
}

function extractUsernamesFromLines(lines) {
    const combined = lines.join(' ');
    const match = combined.match(/([\w@.\-]+(?:, [\w@.\-]+)*, and [\w@.\-]+) are here with you\./);
    if (match) {
        const usernamesStr = match[1];
        return usernamesStr.split(/,\s*|\s*and\s*/);
    }
    return [];
}

simulateChatroomData();

function showThumbnailPreview(url, event) {
    const previewWindow = document.createElement('div');
    previewWindow.className = 'thumbnail-preview';
    previewWindow.style.position = 'absolute';
    previewWindow.style.top = `${event.clientY + 10}px`;
    previewWindow.style.left = `${event.clientX + 10}px`;
    previewWindow.style.backgroundColor = 'white';
    previewWindow.style.border = '1px solid #ccc';
    previewWindow.style.padding = '10px';
    previewWindow.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    previewWindow.textContent = 'Loading preview...';

    document.body.appendChild(previewWindow);

    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.style.maxWidth = '200px';
            img.style.maxHeight = '150px';
            previewWindow.textContent = '';
            previewWindow.appendChild(img);
        })
        .catch(error => {
            console.error('Error fetching thumbnail:', error);
            previewWindow.textContent = 'Preview not available';
        });

    document.addEventListener('mousemove', function movePreview(event) {
        previewWindow.style.top = `${event.clientY + 10}px`;
        previewWindow.style.left = `${event.clientX + 10}px`;
    }, { once: true });
}

function hideThumbnailPreview() {
    const previewWindow = document.querySelector('.thumbnail-preview');
    if (previewWindow) {
        previewWindow.remove();
    }
}
