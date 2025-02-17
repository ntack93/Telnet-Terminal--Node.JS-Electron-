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
        div.addEventListener('click', () => selectMember(member));
        membersList.appendChild(div);
    });
}

function selectMember(member) {
    // Implement member selection for actions
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

// Define ANSI color codes mapping
const ANSI_COLORS = {
    foreground: {
        '30': 'black',
        '31': 'red',
        '32': 'green',
        '33': 'yellow',
        '34': '#3399FF', // Lighter blue for better visibility
        '35': 'magenta',
        '36': 'cyan',
        '37': 'white',
        '90': '#555555',  // Bright black
        '91': '#ff5555',  // Bright red
        '92': '#55ff55',  // Bright green
        '93': '#ffff55',  // Bright yellow
        '94': '#5555ff',  // Bright blue
        '95': '#ff55ff',  // Bright magenta
        '96': '#55ffff',  // Bright cyan
        '97': '#ffffff'   // Bright white
    },
    background: {
        '40': 'black',
        '41': '#aa0000',
        '42': '#00aa00',
        '43': '#aa5500',
        '44': '#0000aa',
        '45': '#aa00aa',
        '46': '#00aaaa',
        '47': '#aaaaaa'
    }
};

function parseANSI(text) {
    let result = '';
    let currentSpan = '';
    let currentStyle = {
        bold: false,
        fg: 'white',
        bg: null
    };
    
    const ansiRegex = /\x1B\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
        // Add text before the ANSI sequence
        if (match.index > lastIndex) {
            const textChunk = text.substring(lastIndex, match.index);
            result += createSpan(convertToCP437(textChunk), currentStyle);
        }

        // Process ANSI codes
        const codes = match[1].split(';').map(Number);
        updateANSIStyle(currentStyle, codes);

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        const remaining = text.substring(lastIndex);
        result += createSpan(convertToCP437(remaining), currentStyle);
    }

    return result || '&nbsp;';
}

function updateANSIStyle(style, codes) {
    for (const code of codes) {
        switch (code) {
            case 0:  // Reset
                style.bold = false;
                style.fg = 'white';
                style.bg = null;
                break;
            case 1:  // Bold
                style.bold = true;
                break;
            case 22: // Normal intensity
                style.bold = false;
                break;
            default:
                if (code >= 30 && code <= 37) {
                    style.fg = ANSI_COLORS.foreground[code];
                } else if (code >= 40 && code <= 47) {
                    style.bg = ANSI_COLORS.background[code];
                } else if (code >= 90 && code <= 97) {
                    style.fg = ANSI_COLORS.foreground[code];
                }
        }
    }
}

function createSpan(text, style) {
    const classes = [];
    
    if (style.fg) {
        classes.push(`ansi-${style.fg}`);
    }
    if (style.bg) {
        classes.push(`ansi-bg-${style.bg}`);
    }
    if (style.bold) {
        classes.push('ansi-bold');
    }

    const classString = classes.length ? ` class="${classes.join(' ')}"` : '';
    return `<span${classString}>${escapeHTML(text)}</span>`;
}

function convertToCP437(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // Handle special line drawing characters
        if (code >= 0xB0 && code <= 0xDF) {
            return CP437_MAP[code] || '?';
        }
        // Pass through normal ASCII
        if (code < 0x80) {
            return char;
        }
        // Map other CP437 characters
        return CP437_MAP[code] || '?';
    }).join('');
}

// Update the handleTerminalData function to properly handle line wrapping
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
            // Word wrap long lines
            const wrappedLines = wordWrap(line, TERMINAL_COLS);
            wrappedLines.forEach(wrappedLine => {
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

function wordWrap(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Remove ANSI codes for length calculation
    const stripAnsi = str => str.replace(/\x1b\[[0-9;]*m/g, '');

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (stripAnsi(testLine).length <= maxLength) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            // Handle words longer than maxLength
            if (stripAnsi(word).length > maxLength) {
                const chunks = splitLongWord(word, maxLength);
                lines.push(...chunks.slice(0, -1));
                currentLine = chunks[chunks.length - 1];
            } else {
                currentLine = word;
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    
    // Pad lines to full width
    return lines.map(line => line.padEnd(maxLength));
}

function splitLongWord(word, maxLength) {
    const chunks = [];
    let remaining = word;
    while (remaining.length > maxLength) {
        chunks.push(remaining.slice(0, maxLength));
        remaining = remaining.slice(maxLength);
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

function parseANSIAndCP437(text) {
    let result = '';
    let currentStyle = {
        fg: 'white',
        bg: null,
        bold: false
    };

    // Split text into chunks by ANSI escape sequences
    const parts = text.split(/(\x1b\[[0-9;]*m)/);
    
    parts.forEach(part => {
        if (part.startsWith('\x1b[')) {
            // Handle ANSI sequence
            const codes = part.slice(2, -1).split(';').map(Number);
            updateANSIStyle(currentStyle, codes);
        } else {
            // Handle text content with current style
            if (part) {
                const convertedText = convertCP437ToUnicode(part);
                result += createStyledSpan(convertedText, currentStyle);
            }
        }
    });

    return result || '&nbsp;';
}

function convertCP437ToUnicode(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        
        // Pass through ASCII range
        if (code < 0x80) return char;
        
        // Special handling for box drawing characters
        if (code >= 0xB0 && code <= 0xDF) {
            return CP437_MAP[code] || char;
        }
        
        // Map other CP437 characters
        return CP437_MAP[code] || '?';
    }).join('');
}

function createStyledSpan(text, style) {
    const classes = [];
    if (style.fg) classes.push(`ansi-${style.fg}`);
    if (style.bg) classes.push(`ansi-bg-${style.bg}`);
    if (style.bold) classes.push('ansi-bold');
    
    const classString = classes.length ? ` class="${classes.join(' ')}"` : '';
    return `<span${classString}>${escapeHTML(text)}</span>`;
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
