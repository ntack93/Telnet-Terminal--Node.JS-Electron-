const { ipcRenderer } = require('electron');
const net = require('net');
const CP437_MAP = require('./cp437');

const ansiParser = {
  reset: '\x1B[0m',
  bright: '\x1B[1m',
  dim: '\x1B[2m',
  underscore: '\x1B[4m',
  blink: '\x1B[5m',
  reverse: '\x1B[7m',
  hidden: '\x1B[8m',
  
  colors: {
    fg: {
      black: '\x1B[30m',
      red: '\x1B[31m',
      green: '\x1B[32m',
      yellow: '\x1B[33m',
      blue: '\x1B[34m',
      magenta: '\x1B[35m',
      cyan: '\x1B[36m',
      white: '\x1B[37m',
      bright: {
        black: '\x1B[90m',
        red: '\x1B[91m',
        green: '\x1B[92m',
        yellow: '\x1B[93m',
        blue: '\x1B[94m',
        magenta: '\x1B[95m',
        cyan: '\x1B[96m',
        white: '\x1B[97m'
      }
    },
    bg: {
      black: '\x1B[40m',
      red: '\x1B[41m',
      green: '\x1B[42m',
      yellow: '\x1B[43m',
      blue: '\x1B[44m',
      magenta: '\x1B[45m',
      cyan: '\x1B[46m',
      white: '\x1B[47m'
    }
  }
};

let telnetSocket = null;

// Chat member tracking
let chatMembers = new Set();
let lastSeen = {};

function updateChatMembers(text) {
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.includes('You are in') && line.includes('here with you')) {
            const userMatch = line.match(/([A-Za-z0-9@._-]+(?:,\s*[A-Za-z0-9@._-]+)*(?:\s+and\s+[A-Za-z0-9@._-]+)?)\s+are here/);
            if (userMatch) {
                const users = userMatch[1]
                    .replace(/\s+and\s+/g, ',')
                    .split(',')
                    .map(u => u.trim())
                    .filter(u => u);
                
                chatMembers = new Set(users);
                const now = Date.now();
                users.forEach(user => lastSeen[user] = now);
                updateMembersList();
                saveChatMembers();
            }
        }
    }
}

function updateMembersList() {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    [...chatMembers].sort().forEach(member => {
        const div = document.createElement('div');
        div.textContent = member;
        // Pass along the event object to selectMember
        div.addEventListener('click', (evt) => selectMember(member, evt));
        membersList.appendChild(div);
    });
}

function selectMember(member, event) {
    // Use the passed event parameter
    const selected = document.querySelector('.selected-member');
    if (selected) selected.classList.remove('selected-member');
    event.target.classList.add('selected-member');
}

// Message parsing and logging
function parseAndLogMessage(text) {
    const messageMatch = text.match(/^From\s+(\S+)(?:\s+\((to\s+([^)]+))\))?\s*:\s*(.+)$/);
    if (messageMatch) {
        const [_, sender, , recipient, message] = messageMatch;
        
        // Log to chatlog
        const chatlog = loadChatlog();
        if (!chatlog[sender]) chatlog[sender] = [];
        chatlog[sender].push({
            timestamp: Date.now(),
            message: message,
            recipient: recipient || 'all'
        });
        saveChatlog(chatlog);

        // If it's a direct message, show in directed messages panel
        if (recipient && recipient.toLowerCase() === 'you') {
            appendDirectedMessage(`From ${sender}: ${message}`);
        }
    }
}

// Action buttons
document.getElementById('waveBtn').addEventListener('click', () => sendAction('wave'));
document.getElementById('smileBtn').addEventListener('click', () => sendAction('smile'));
document.getElementById('danceBtn').addEventListener('click', () => sendAction('dance'));
document.getElementById('bowBtn').addEventListener('click', () => sendAction('bow'));

function sendAction(action) {
    const selected = document.querySelector('.selected-member');
    if (selected) {
        const member = selected.textContent;
        sendMessage(`${action} ${member}\n`);
    } else {
        sendMessage(`${action}\n`);
    }
}

// Storage functions
function loadChatlog() {
    return JSON.parse(localStorage.getItem('chatlog') || '{}');
}

function saveChatlog(chatlog) {
    localStorage.setItem('chatlog', JSON.stringify(chatlog));
}

function saveChatMembers() {
    localStorage.setItem('chatMembers', JSON.stringify([...chatMembers]));
    localStorage.setItem('lastSeen', JSON.stringify(lastSeen));
}

// Connection handling
document.getElementById('connectBtn').addEventListener('click', () => {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value;
  
  if (!telnetSocket) {
    connect(host, port);
  } else {
    disconnect();
  }
});

// Terminal state and variables
let lineBuffer = '';
const terminal = document.getElementById('terminal');
const TERMINAL_COLS = 136;  // Updated to 136 columns
const TERMINAL_ROWS = 50;   // Updated to 50 rows
let isScrolledToBottom = true;
const MAX_LINES = 5000;

function connect(host, port) {
  telnetSocket = new net.Socket();
  
  // Force binary mode and proper encoding
  telnetSocket.setEncoding(null);
  telnetSocket.setKeepAlive(true);
  telnetSocket.setTimeout(0);
  
  // Set no delay mode
  telnetSocket.setNoDelay(true);

  telnetSocket.connect(port, host, () => {
    updateTerminal('Connected to ' + host + ':' + port + '\r\n');
    document.getElementById('connectBtn').textContent = 'Disconnect';
  });

  telnetSocket.on('data', (data) => {
    // Handle raw buffer data
    handleTerminalData(data);
  });

  telnetSocket.on('error', (err) => {
    console.error('Socket error:', err);
    updateTerminal('Error: ' + err.message + '\n');
    disconnect();
  });

  telnetSocket.on('close', () => {
    disconnect();
  });
}

// Update ANSI colors to match Python version exactly
const ANSI_COLORS = {
    foreground: {
        '30': '#000000',  // Black
        '31': '#aa0000',  // Red
        '32': '#00aa00',  // Green
        '33': '#aa5500',  // Yellow
        '34': '#3399FF',  // Blue - using lighter blue for visibility
        '35': '#aa00aa',  // Magenta
        '36': '#00aaaa',  // Cyan
        '37': '#aaaaaa',  // White
        '90': '#555555',  // Bright Black
        '91': '#ff5555',  // Bright Red
        '92': '#55ff55',  // Bright Green
        '93': '#ffff55',  // Bright Yellow
        '94': '#5555ff',  // Bright Blue
        '95': '#ff55ff',  // Bright Magenta
        '96': '#55ffff',  // Bright Cyan
        '97': '#ffffff'   // Bright White
    },
    background: {
        '40': '#000000',
        '41': '#aa0000',
        '42': '#00aa00',
        '43': '#aa5500',
        '44': '#0000aa',
        '45': '#aa00aa',
        '46': '#00aaaa',
        '47': '#aaaaaa'
    }
};

// Replace the parseANSI function with this improved version
function parseANSI(text) {
    let result = '';
    let currentStyle = {
        bold: false,
        fg: '37',    // Default to light gray
        bg: null,
        reverse: false
    };
    
    const ansiRegex = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
        // Add text before the ANSI sequence with current style
        if (match.index > lastIndex) {
            const textChunk = text.substring(lastIndex, match.index);
            result += createStyledSpan(convertToCP437(textChunk), currentStyle);
        }

        // Process ANSI codes
        const codes = match[1].split(';').map(Number);
        for (const code of codes) {
            switch (code) {
                case 0:  // Reset
                    currentStyle = { bold: false, fg: '37', bg: null, reverse: false };
                    break;
                case 1:  // Bold
                    currentStyle.bold = true;
                    // Make regular colors bright if bold
                    if (currentStyle.fg >= 30 && currentStyle.fg <= 37) {
                        currentStyle.fg = (currentStyle.fg + 60).toString();
                    }
                    break;
                case 7:  // Reverse
                    currentStyle.reverse = true;
                    break;
                case 22: // Normal intensity
                    currentStyle.bold = false;
                    // Make bright colors normal if not bold
                    if (currentStyle.fg >= 90 && currentStyle.fg <= 97) {
                        currentStyle.fg = (currentStyle.fg - 60).toString();
                    }
                    break;
                case 27: // Reverse off
                    currentStyle.reverse = false;
                    break;
                default:
                    if (code >= 30 && code <= 37 || code >= 90 && code <= 97) {
                        currentStyle.fg = code.toString();
                    } else if (code >= 40 && code <= 47) {
                        currentStyle.bg = code.toString();
                    }
            }
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text with current style
    if (lastIndex < text.length) {
        const remaining = text.substring(lastIndex);
        result += createStyledSpan(convertToCP437(remaining), currentStyle);
    }

    // Add link detection before returning
    return detectAndWrapLinks(result);
}

// Update createStyledSpan to handle reverse video and proper color mapping
function createStyledSpan(text, style) {
    let fg = style.fg;
    let bg = style.bg;
    
    // Handle reverse video
    if (style.reverse) {
        [fg, bg] = [bg || '40', fg];  // Swap colors, use black bg if none
    }

    // Build the style string
    let styleStr = '';
    if (fg) {
        styleStr += `color: ${ANSI_COLORS.foreground[fg]};`;
    }
    if (bg) {
        styleStr += `background-color: ${ANSI_COLORS.background[bg]};`;
    }
    if (style.bold) {
        styleStr += 'font-weight: bold;';
    }

    return `<span style="${styleStr}">${escapeHTML(text)}</span>`;
}

// Update handleTerminalData to preserve ANSI codes during word wrapping
function handleTerminalData(data) {
    const text = Buffer.from(data).toString('binary');
    const normalized = text
        .replace(/\x00/g, '')
        .replace(/\r\n|\n\r/g, '\n')
        .replace(/\r/g, '\n');
    
    lineBuffer += normalized;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || '';

    if (lines.length > 0) {
        const fragment = document.createDocumentFragment();
        
        lines.forEach(line => {
            // Split ANSI codes and text for proper wrapping
            const segments = splitPreservingAnsi(line);
            const wrappedSegments = wordWrapPreservingAnsi(segments, TERMINAL_COLS);
            
            wrappedSegments.forEach(wrappedLine => {
                const div = document.createElement('div');
                div.innerHTML = parseANSI(wrappedLine);
                fragment.appendChild(div);
            });
        });

        terminal.appendChild(fragment);
        
        while (terminal.childNodes.length > MAX_LINES) {
            terminal.removeChild(terminal.firstChild);
        }

        if (isScrolledToBottom) {
            requestAnimationFrame(() => {
                terminal.scrollTop = terminal.scrollHeight;
            });
        }
    }
}

// New helper functions for ANSI-aware text wrapping
function splitPreservingAnsi(text) {
    const ansiRegex = /(\x1b\[[0-9;]*m)/g;
    return text.split(ansiRegex).filter(Boolean);
}

function wordWrapPreservingAnsi(segments, maxLength) {
    const lines = [''];
    let currentLength = 0;
    let currentAnsi = '';
    
    segments.forEach(segment => {
        if (segment.startsWith('\x1b[')) {
            currentAnsi = segment;
            lines[lines.length - 1] += segment;
        } else {
            const words = segment.split(' ');
            words.forEach(word => {
                if (currentLength + word.length > maxLength) {
                    lines.push(currentAnsi + word + ' ');
                    currentLength = word.length + 1;
                } else {
                    lines[lines.length - 1] += word + ' ';
                    currentLength += word.length + 1;
                }
            });
        }
    });

    return lines.map(line => line.trimEnd());
}

// CP437 to Unicode mapping
function convertToCP437(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle special cases for box drawing and block characters
        if (code >= 0xB0 && code <= 0xDF) {
            return CP437_MAP[code] || char;
        }
        // Handle regular ASCII normally
        if (code < 0x80) {
            return char;
        }
        // Map other CP437 characters
        return CP437_MAP[code] || '?';
    }).join('');
}

function disconnect() {
  if (telnetSocket) {
    telnetSocket.destroy();
    telnetSocket = null;
  }
  document.getElementById('connectBtn').textContent = 'Connect';
  updateTerminal('Disconnected');
}

// Terminal state management
function updateTerminal(text) {
    const terminal = document.getElementById('terminal');
    
    // Check if scrolled to bottom before update
    isScrolledToBottom = Math.abs(
        terminal.scrollHeight - terminal.clientHeight - terminal.scrollTop
    ) < 10;

    // Handle text normalization
    text = text.replace(/\x00/g, '')
               .replace(/\r\n|\n\r/g, '\n')
               .replace(/\r/g, '\n');
    
    // Update buffer and get lines
    lineBuffer += text;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || ''; // Keep last incomplete line

    if (lines.length > 0) {
        // Create fragment for better performance
        const fragment = document.createDocumentFragment();
        
        lines.forEach(line => {
            const div = document.createElement('div');
            div.innerHTML = parseANSI(line);
            fragment.appendChild(div);
        });

        // Append new content
        terminal.appendChild(fragment);

        // Maintain maximum number of lines
        while (terminal.childNodes.length > MAX_LINES) {
            terminal.removeChild(terminal.firstChild);
        }

        // Auto-scroll only if we were at the bottom
        if (isScrolledToBottom) {
            requestAnimationFrame(() => {
                terminal.scrollTop = terminal.scrollHeight;
            });
        }
    }
}

// Add scroll handler to track scroll position
document.getElementById('terminal').addEventListener('scroll', function() {
    const terminal = document.getElementById('terminal');
    isScrolledToBottom = Math.abs(
        terminal.scrollHeight - terminal.clientHeight - terminal.scrollTop
    ) < 10;
});

function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Message input handling
document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const message = e.target.value.trim();
    if (telnetSocket) {
      // If message is empty, just send CRLF
      sendMessage(message);
      e.target.value = '';
    }
  }
});

// Update username/password send handlers
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

// Consolidate message sending functionality
function sendMessage(text) {
    if (!telnetSocket) {
        updateTerminal('Not connected.\n');
        return;
    }

    try {
        const data = text.trim() + '\r\n';
        const buffer = Buffer.from(data, 'binary');
        telnetSocket.write(buffer);
    } catch (err) {
        console.error('Send error:', err);
        updateTerminal('Send error: ' + err.message + '\n');
    }
}

// Load favorites on startup
async function loadFavorites() {
  const favorites = await ipcRenderer.invoke('load-favorites');
  // Initialize favorites UI
}

// Add functions for triggers, chatlog, etc.

// Add missing function
function appendDirectedMessage(text) {
    const directedMessages = document.getElementById('directed-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.textContent = text;
    directedMessages.appendChild(messageDiv);
    directedMessages.scrollTop = directedMessages.scrollHeight;
}

// Add missing function
function checkTriggers(text) {
    const triggers = JSON.parse(localStorage.getItem('triggers') || '[]');
    triggers.forEach(trigger => {
        if (trigger.trigger && text.toLowerCase().includes(trigger.trigger.toLowerCase())) {
            sendMessage(trigger.response);
        }
    });
}

// Add event listener for the send button
document.getElementById('sendBtn').addEventListener('click', () => {
    const input = document.getElementById('messageInput');
    if (input.value.trim()) {
        sendMessage(input.value);
        input.value = '';
    }
});

// Add split pane resizing functionality
document.addEventListener('DOMContentLoaded', () => {
    initResizablePanels();

    // Modal show handlers
    document.getElementById('favoritesBtn').addEventListener('click', function() {
        showModal('favoritesModal');
    });
    document.getElementById('settingsBtn').addEventListener('click', function() {
        showModal('settingsModal');
    });
    document.getElementById('chatlogBtn').addEventListener('click', function() {
        showModal('chatlogModal');
    });
    document.getElementById('triggersBtn').addEventListener('click', function() {
        showModal('triggersModal');
    });

    // Modal close handlers
    document.getElementById('closeFavoritesBtn').addEventListener('click', function() {
        hideModal('favoritesModal');
    });
    document.getElementById('closeSettingsBtn').addEventListener('click', function() {
        hideModal('settingsModal');
    });
    document.getElementById('closeTriggersBtn').addEventListener('click', function() {
        hideModal('triggersModal');
    });
    document.getElementById('closeChatlogBtn').addEventListener('click', function() {
        hideModal('chatlogModal');
    });

    // Modal action buttons
    document.getElementById('addFavoriteBtn').addEventListener('click', function() {
        // Add favorite functionality
        alert("Add Favorite functionality to be implemented");
    });
    document.getElementById('removeFavoriteBtn').addEventListener('click', function() {
        // Remove favorite functionality 
        alert("Remove Favorite functionality to be implemented");
    });
    document.getElementById('saveSettingsBtn').addEventListener('click', function() {
        // Save settings functionality
        alert("Save Settings functionality to be implemented");
        hideModal('settingsModal');
    });
    document.getElementById('saveTriggersBtn').addEventListener('click', function() {
        // Save triggers functionality
        alert("Save Triggers functionality to be implemented");
        hideModal('triggersModal');
    });
    document.getElementById('clearChatlogBtn').addEventListener('click', function() {
        // Clear chatlog functionality
        alert("Clear Chatlog functionality to be implemented");
    });
});

function initResizablePanels() {
    let isResizing = false;
    let currentDivider = null;
    let initialPos = 0;
    let initialSize = 0;

    document.querySelectorAll('.split-pane-divider').forEach(divider => {
        divider.addEventListener('mousedown', e => {
            isResizing = true;
            currentDivider = divider;
            initialPos = divider.classList.contains('split-pane-divider-vertical') ? e.clientX : e.clientY;
            
            const targetPanel = currentDivider.previousElementSibling;
            initialSize = currentDivider.classList.contains('split-pane-divider-vertical') ? 
                targetPanel.offsetWidth : targetPanel.offsetHeight;
            
            document.body.style.cursor = currentDivider.classList.contains('split-pane-divider-vertical') ? 
                'col-resize' : 'row-resize';
        });
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;

        const isVertical = currentDivider.classList.contains('split-pane-divider-vertical');
        const delta = isVertical ? e.clientX - initialPos : e.clientY - initialPos;
        const targetPanel = currentDivider.previousElementSibling;

        if (isVertical) {
            const newWidth = initialSize + delta;
            if (newWidth > 100 && newWidth < window.innerWidth - 100) {
                targetPanel.style.width = `${newWidth}px`;
            }
        } else {
            const newHeight = initialSize + delta;
            if (newHeight > 100 && newHeight < window.innerHeight - 100) {
                targetPanel.style.height = `${newHeight}px`;
            }
        }

        // Force terminal redraw to prevent text cutoff
        const terminal = document.getElementById('terminal');
        terminal.scrollTop = terminal.scrollHeight;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        currentDivider = null;
        document.body.style.cursor = '';
    });
}

// Add helper functions to show/hide modals
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize additional UI event listeners for modal windows
document.addEventListener('DOMContentLoaded', function () {
    // ...existing DOMContentLoaded code...
    
    // Modal show handlers
    document.getElementById('favoritesBtn').addEventListener('click', function () {
        showModal('favoritesModal');
    });
    document.getElementById('settingsBtn').addEventListener('click', function () {
        showModal('settingsModal');
    });
    document.getElementById('chatlogBtn').addEventListener('click', function () {
        showModal('chatlogModal');
    });
    // (If you add a triggers button and modal, add similar listeners here)

    // Modal close handlers
    document.getElementById('closeFavoritesBtn').addEventListener('click', function () {
        hideModal('favoritesModal');
    });
    document.getElementById('closeSettingsBtn').addEventListener('click', function () {
        hideModal('settingsModal');
    });
    document.getElementById('closeTriggersBtn').addEventListener('click', function () {
        hideModal('triggersModal');
    });
    document.getElementById('closeChatlogBtn').addEventListener('click', function () {
        hideModal('chatlogModal');
    });

    // Optional: add event listeners for modal action buttons (e.g. add/remove favorite)
    document.getElementById('addFavoriteBtn').addEventListener('click', function () {
        // ...code to add a new favorite (e.g. update favorites list and store via IPC)...
        alert("Add Favorite functionality to be implemented");
    });
    document.getElementById('removeFavoriteBtn').addEventListener('click', function () {
        // ...code to remove selected favorite...
        alert("Remove Favorite functionality to be implemented");
    });
    document.getElementById('saveSettingsBtn').addEventListener('click', function () {
        // ...code to read and save settings (e.g. font, font size, toggles)...
        alert("Save Settings functionality to be implemented");
        hideModal('settingsModal');
    });
    document.getElementById('saveTriggersBtn').addEventListener('click', function () {
        // ...code to save trigger settings...
        alert("Save Triggers functionality to be implemented");
        hideModal('triggersModal');
    });
    document.getElementById('clearChatlogBtn').addEventListener('click', function () {
        // ...clear chat log (and update UI)...
        alert("Clear Chatlog functionality to be implemented");
    });

    // Call existing split pane/panel initialization
    initResizablePanels();
});

// Initialize UI and event handlers
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved preferences
    const prefs = await ipcRenderer.invoke('load-preferences');
    
    // Initialize checkboxes
    document.getElementById('rememberUsername').checked = prefs.rememberUsername;
    document.getElementById('rememberPassword').checked = prefs.rememberPassword;
    document.getElementById('keepAlive').checked = prefs.keepAlive;
    
    // Initialize input fields
    if (prefs.rememberUsername) {
        document.getElementById('username').value = prefs.username;
    }
    if (prefs.rememberPassword) {
        document.getElementById('password').value = prefs.password;
    }

    // Button event handlers
    initializeButtons();
    
    // Modal handlers
    initializeModals();
    
    // Initialize panels
    initResizablePanels();
    
    // Initialize chat members list
    const chatData = await ipcRenderer.invoke('load-chat-members');
    chatMembers = new Set(chatData.members);
    lastSeen = chatData.lastSeen;
    updateMembersList();
});

function initializeButtons() {
    // Action buttons
    document.getElementById('waveBtn').onclick = () => sendAction('wave');
    document.getElementById('smileBtn').onclick = () => sendAction('smile');
    document.getElementById('danceBtn').onclick = () => sendAction('dance');
    document.getElementById('bowBtn').onclick = () => sendAction('bow');
    
    // Connection buttons  
    document.getElementById('sendUserBtn').onclick = () => sendUsername();
    document.getElementById('sendPassBtn').onclick = () => sendPassword();
    document.getElementById('sendBtn').onclick = () => {
        const input = document.getElementById('messageInput');
        if (input.value.trim()) {
            sendMessage(input.value);
            input.value = '';
        }
    };
}

function initializeModals() {
    // Show modal handlers
    const modalButtons = {
        'favoritesBtn': 'favoritesModal',
        'settingsBtn': 'settingsModal',
        'triggersBtn': 'triggersModal',
        'chatlogBtn': 'chatlogModal'
    };
    
    Object.entries(modalButtons).forEach(([btnId, modalId]) => {
        document.getElementById(btnId).onclick = () => showModal(modalId);
    });

    // Close modal handlers  
    const closeButtons = {
        'closeFavoritesBtn': 'favoritesModal',
        'closeSettingsBtn': 'settingsModal',
        'closeTriggersBtn': 'triggersModal',  
        'closeChatlogBtn': 'chatlogModal'
    };

    Object.entries(closeButtons).forEach(([btnId, modalId]) => {
        document.getElementById(btnId).onclick = () => hideModal(modalId);
    });

    // Modal action handlers
    document.getElementById('addFavoriteBtn').onclick = addFavorite;
    document.getElementById('removeFavoriteBtn').onclick = removeFavorite;
    document.getElementById('saveSettingsBtn').onclick = saveSettings;
    document.getElementById('saveTriggersBtn').onclick = saveTriggersFromUI;
    document.getElementById('clearChatlogBtn').onclick = clearActiveChatlog;
}

// Add these functions after the existing terminal handling code

function detectAndWrapLinks(text) {
    // Update regex to better capture image URLs
    const urlRegex = /(https?:\/\/[^\s<]+\.(?:jpg|jpeg|gif|png|webp))/gi;
    const generalUrlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    
    // First handle image URLs
    text = text.replace(urlRegex, url => 
        `<span class="hyperlink image-link" data-url="${url}">${url}</span>`
    );
    
    // Then handle remaining URLs
    return text.replace(generalUrlRegex, url => 
        !url.match(/\.(jpg|jpeg|gif|png|webp)$/i) ? 
        `<span class="hyperlink" data-url="${url}">${url}</span>` : url
    );
}

function initializeHyperlinkHandlers() {
    const terminal = document.getElementById('terminal');
    let previewTimer = null;
    let currentPreview = null;
    
    terminal.addEventListener('mouseover', (e) => {
        const link = e.target.closest('.image-link');
        if (link) {
            const url = link.dataset.url;
            
            // Clear any existing preview timer
            if (previewTimer) clearTimeout(previewTimer);
            
            // Set new preview timer
            previewTimer = setTimeout(() => {
                // Create and show preview
                currentPreview = createImagePreview(url);
                positionPreview(currentPreview, e.clientX, e.clientY);
                document.body.appendChild(currentPreview);
            }, 500);
        }
    });

    terminal.addEventListener('mousemove', (e) => {
        const link = e.target.closest('.image-link');
        if (link && currentPreview) {
            positionPreview(currentPreview, e.clientX, e.clientY);
        }
    });

    terminal.addEventListener('mouseout', (e) => {
        const link = e.target.closest('.image-link');
        if (link) {
            if (previewTimer) {
                clearTimeout(previewTimer);
                previewTimer = null;
            }
            if (currentPreview) {
                currentPreview.remove();
                currentPreview = null;
            }
        }
    });

    // Handle clicking links
    terminal.addEventListener('click', (e) => {
        const link = e.target.closest('.hyperlink');
        if (link) {
            const url = link.dataset.url;
            require('electron').shell.openExternal(url);
        }
    });
}

function createImagePreview(url) {
    const preview = document.createElement('div');
    preview.className = 'preview-window';
    
    // Add loading indicator
    const loading = document.createElement('div');
    loading.className = 'preview-loading';
    loading.textContent = 'Loading preview...';
    preview.appendChild(loading);
    
    // Create and load image
    const img = new Image();
    img.onload = () => {
        loading.remove();
        preview.appendChild(img);
        
        // Scale image if needed
        if (img.width > 300 || img.height > 300) {
            const ratio = Math.min(300 / img.width, 300 / img.height);
            img.style.width = `${img.width * ratio}px`;
            img.style.height = `${img.height * ratio}px`;
        }
    };
    
    img.onerror = () => {
        loading.textContent = 'Unable to load preview';
    };
    
    img.src = url;
    return preview;
}

function positionPreview(preview, x, y) {
    const rect = preview.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Position relative to cursor
    let left = x + 15;
    let top = y + 15;
    
    // Adjust if would overflow viewport
    if (left + rect.width > viewportWidth) {
        left = x - rect.width - 15;
    }
    if (top + rect.height > viewportHeight) {
        top = y - rect.height - 15;
    }
    
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
}

// Initialize hyperlink handlers when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // ...existing initialization code...
    initializeHyperlinkHandlers();
});
