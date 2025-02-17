document.addEventListener('DOMContentLoaded', async () => {
    console.log("renderer.js is loaded and executing.");

    initializeButtons();
    initializeModals();
    updateFavoritesList();
    updateMembersList();

    try {
        // Load user preferences via IPC
        const prefs = await window.electronAPI.loadPreferences();
        console.log("Loaded Preferences:", prefs);

        document.getElementById('rememberUsername').checked = prefs.rememberUsername;
        document.getElementById('rememberPassword').checked = prefs.rememberPassword;
        document.getElementById('keepAlive').checked = prefs.keepAlive;

        if (prefs.rememberUsername) {
            document.getElementById('username').value = prefs.username;
        }
        if (prefs.rememberPassword) {
            document.getElementById('password').value = prefs.password;
        }
    } catch (error) {
        console.error("Error loading preferences:", error);
    }

    try {
        // Load chat members via IPC
        const chatData = await window.electronAPI.loadChatMembers();
        console.log("Chat Members Loaded:", chatData);
        chatMembers = new Set(chatData.members);
        lastSeen = chatData.lastSeen;
        updateMembersList();
    } catch (error) {
        console.error("Error loading chat members:", e
});

/**
 * Initializes all buttons in the UI and binds them to appropriate IPC calls.
 */
function initializeButtons() {
    // Telnet Connection
    document.getElementById('connectBtn').addEventListener('click', async () => {
        console.log("Connect button clicked!");

        const host = document.getElementById('host').value;
        const port = parseInt(document.getElementById('port').value, 10);

        if (!host || isNaN(port)) {
            console.error("Invalid host or port");
            return;
        }

        try {
            const response = await window.electronAPI.connectTelnet(host, port);
            console.log("Telnet Connection Response:", response);
        } catch (error) {
            console.error("Error connecting to Telnet:", error);
        }
    });

    // Username and Password Send
    document.getElementById('sendUserBtn').addEventListener('click', () => {
        const username = document.getElementById('username').value.trim();
        if (username) {
            sendMessage(username);
        }
    });

    document.getElementById('sendPassBtn').addEventListener('click', () => {
        const password = document.getElementById('password').value.trim();
        if (password) {
            sendMessage(password);
        }
    });

    // Message Send Button
    document.getElementById('sendBtn').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput.value.trim()) {
            sendMessage(messageInput.value);
            messageInput.value = '';
        }
    });

    // Action Buttons
    document.getElementById('waveBtn').addEventListener('click', () => sendAction('wave'));
    document.getElementById('smileBtn').addEventListener('click', () => sendAction('smile'));
    document.getElementById('danceBtn').addEventListener('click', () => sendAction('dance'));
    document.getElementById('bowBtn').addEventListener('click', () => sendAction('bow'));

    // Modal Buttons
    document.getElementById('favoritesBtn').addEventListener('click', () => showModal('favoritesModal'));
    document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));
    document.getElementById('triggersBtn').addEventListener('click', () => showModal('triggersModal'));
    document.getElementById('chatlogBtn').addEventListener('click', () => showModal('chatlogModal'));

    // Modal Close Buttons
    document.getElementById('closeFavoritesBtn').addEventListener('click', () => hideModal('favoritesModal'));
    document.getElementById('closeSettingsBtn').addEventListener('click', () => hideModal('settingsModal'));
    document.getElementById('closeTriggersBtn').addEventListener('click', () => hideModal('triggersModal'));
    document.getElementById('closeChatlogBtn').addEventListener('click', () => hideModal('chatlogModal'));

    // Modal Action Buttons
    document.getElementById('addFavoriteBtn').addEventListener('click', addFavorite);
    document.getElementById('removeFavoriteBtn').addEventListener('click', removeFavorite);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('saveTriggersBtn').addEventListener('click', saveTriggers);
    document.getElementById('clearChatlogBtn').addEventListener('click', clearChatlog);
}

/**
 * Sends an action command to the Telnet server.
 * @param {string} action - The action to send (e.g., wave, smile, etc.)
 */
function sendAction(action) {
    const selectedMember = document.querySelector('.selected-member');
    const command = selectedMember ? `${action} ${selectedMember.textContent}` : action;
    sendMessage(command);
}

/**
 * Sends a message to the Telnet server.
 * @param {string} text - The text message to send.
 */
function sendMessage(text) {
    console.log("Sending Message:", text);
    window.electronAPI.sendMessage(text);
}

/**
 * Shows a modal dialog.
 * @param {string} modalId - The ID of the modal to show.
 */
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

/**
 * Hides a modal dialog.
 * @param {string} modalId - The ID of the modal to hide.
 */
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addFavorite() {
    const favoriteInput = document.getElementById('favoriteInput').value.trim();

    if (!favoriteInput) {
        console.error("Favorite input is empty.");
        return;
    }

    window.electronAPI.saveFavorite(favoriteInput)
        .then(response => {
            console.log("Favorite saved:", response);
            updateFavoritesList();
        })
        .catch(error => {
            console.error("Error saving favorite:", error);
        });
}

function removeFavorite() {
    const selectedFavorite = document.querySelector('#favoritesList .selected');

    if (!selectedFavorite) {
        console.error("No favorite selected for removal.");
        return;
    }

    const favoriteText = selectedFavorite.textContent;

    // Remove favorite via IPC
    window.electronAPI.removeFavorite(favoriteText)
        .then(response => {
            console.log("Favorite removed:", response);
            updateFavoritesList(); // Refresh UI
        })
        .catch(error => {
            console.error("Error removing favorite:", error);
        });
}

async function updateFavoritesList() {
    try {
        const favorites = await window.electronAPI.loadFavorites();
        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = '';

        favorites.forEach(fav => {
            const li = document.createElement('li');
            li.textContent = fav;

            // Make items selectable
            li.addEventListener('click', () => {
                document.querySelectorAll('#favoritesList li').forEach(item => item.classList.remove('selected'));
                li.classList.add('selected');
            });

            favoritesList.appendChild(li);
        });

        console.log("Favorites list updated.");
    } catch (error) {
        console.error("Error loading favorites:", error);
    }
}

function saveSettings() {
    const settings = {
        rememberUsername: document.getElementById('rememberUsername').checked,
        rememberPassword: document.getElementById('rememberPassword').checked,
        keepAlive: document.getElementById('keepAlive').checked,
        autoLogin: document.getElementById('autoLogin').checked,
        logonAutomation: document.getElementById('logonAutomation').checked,
        font: document.getElementById('font').value,
        fontSize: parseInt(document.getElementById('fontSize').value, 10)
    };

    // Save settings via IPC
    window.electronAPI.saveSettings(settings)
        .then(response => {
            console.log("Settings saved:", response);
        })
        .catch(error => {
            console.error("Error saving settings:", error);
        });
}

function saveTriggers() {
    const triggersInput = document.getElementById('triggersInput').value.trim();

    if (!triggersInput) {
        console.error("Triggers input is empty.");
        return;
    }

    // Save triggers via IPC
    window.electronAPI.saveTriggers(triggersInput)
        .then(response => {
            console.log("Triggers saved:", response);
        })
        .catch(error => {
            console.error("Error saving triggers:", error);
        });
}

function clearChatlog() {
    // Clear chatlog via IPC
    window.electronAPI.clearChatlog()
        .then(response => {
            if (response.success) {
                document.getElementById('chatlog').innerHTML = ''; // Clear UI chatlog
                console.log("Chatlog cleared.");
            } else {
                console.error("Error clearing chatlog:", response.error);
            }
        })
        .catch(error => {
            console.error("Error clearing chatlog:", error);
        });
}

function initializeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        const closeButton = modal.querySelector('.close');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function updateMembersList() {
    window.electronAPI.loadChatMembers()
        .then(chatData => {
            const membersList = document.getElementById('membersList');
            membersList.innerHTML = ''; // Clear existing list

            chatData.members.forEach(member => {
                const li = document.createElement('li');
                li.textContent = member;

                // Handle selection styling
                li.addEventListener('click', () => {
                    document.querySelectorAll('#membersList li').forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');
                });

                membersList.appendChild(li);
            });

            console.log("Chat members list updated.");
        })
        .catch(error => {
            console.error("Error loading chat members:", error);
        });
}

