# BBS Telnet Terminal (Node.js/Electron)

A modern Telnet terminal application for connecting to BBS systems, built with Node.js and Electron. This project provides a desktop application with features such as:

- **Connection Settings:** Connect/disconnect from the BBS
- **Username/Password Handling:** Send and optionally remember credentials
- **Chatlog:** Save and review chat messages locally
- **Triggers:** Create automation triggers for custom responses
- **Favorites:** Manage favorite BBS addresses
- **Chatroom Members Panel:** View active members
- **ANSI/CP437 Support:** Full support for BBS art and special characters

## Requirements

- Node.js 14.x or higher
- npm (Node Package Manager)
- Electron
- Git (for cloning the repository)

## Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd TTJSNODENEW
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```
   
   This will install required packages including:
   - electron
   - electron-store
   - net (built into Node.js)

3. **Run the Application:**
   ```bash
   npm start
   ```
   
   Or for development with hot reload:
   ```bash
   npm run dev
   ```

## Project Structure

```
TTJSNODENEW/
├── main.js           # Electron main process
├── renderer.js       # Renderer process (terminal logic)
├── index.html        # Application UI layout
├── styles.css        # UI styling
├── cp437.js         # CP437 character mapping
├── package.json     # Project configuration
└── README.md        # This file
```

## Features

### Terminal Display
- Full ANSI color support
- CP437 character set for BBS art
- Configurable terminal size (default: 136x50)
- Automatic word wrapping
- Scroll history

### Connection Management
- Connect/disconnect from BBS servers
- Keep-alive functionality
- Username/password management
- Connection favorites

### Chat Features
- Direct message support
- Chat logging
- Member tracking
- Action buttons (wave, smile, dance, bow)

### Automation
- Trigger system for automatic responses
- Logon automation
- Auto-login support

### UI Features
- Split pane layout
- Resizable panels
- Modal windows for settings/favorites/etc
- Context menus
- Dark theme

## Configuration

Settings are stored using electron-store and include:

- Font preferences
- Login credentials (optional)
- Window size/position
- Trigger definitions
- Favorite addresses
- Chat logs

## Development

To modify or extend the application:

1. **Main Process (`main.js`):**
   - Handles window creation
   - Manages IPC communication
   - Controls application lifecycle

2. **Renderer Process (`renderer.js`):**
   - Implements terminal functionality
   - Manages UI interactions
   - Handles telnet communication

3. **UI (`index.html`, `styles.css`):**
   - Defines application layout
   - Implements styling
   - Manages modal windows

## Building

To create a distributable application:

```bash
npm run build
```

This will create platform-specific builds in the `dist` directory.

## Troubleshooting

- **ANSI Colors Not Displaying:**
  Check the CSS color definitions in `styles.css` and ANSI color mappings in `renderer.js`

- **Connection Issues:**
  Verify host/port settings and check console for error messages

- **CP437 Characters Missing:**
  Ensure the correct font is installed and selected (Perfect DOS VGA 437 recommended)

## License

This project is licensed under the MIT License. See the LICENSE file for details.
