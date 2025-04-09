# MCP-ADB

A Model Context Protocol (MCP) server that provides integration with Android Debug Bridge (ADB) for AI assistants to interact with Android devices.

## Features

- **Screenshot Capture**: Take screenshots of connected Android devices
- **Key Event Control**: Send key events to Android devices (navigation, back, home)
- **Multiple Device Support**: Target specific devices when multiple devices are connected
- **Resource Access**: Access the latest screenshot through a resource URI

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Android Debug Bridge (ADB)](https://developer.android.com/studio/command-line/adb) installed and available in PATH
- Connected Android device(s) with USB debugging enabled

## Installation

```bash
# Clone the repository
git clone https://github.com/isseikz/mcp-adb.git
cd mcp-adb

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Start the MCP Server

```bash
node build/index.js
```

Or if installed globally:

```bash
mcp-adb
```

### Available Tools

#### Screenshot Tool

Captures a screenshot from a connected Android device.

Parameters:

- `deviceId` (optional): Target a specific device when multiple devices are connected
- `openInBrowser` (optional, default: false): Automatically open the screenshot in your default browser

Example:

```json
{
  "tool": "screenshot",
  "parameters": {
    "deviceId": "emulator-5554",
    "openInBrowser": true
  }
}
```

#### Press Key Tool

Sends a key event to a connected Android device.

Parameters:

- `keycode`: The Android key code to send (see list below)
- `deviceId` (optional): Target a specific device when multiple devices are connected

Available keycodes:

- `KEYCODE_DPAD_CENTER` - Center/OK button
- `KEYCODE_DPAD_DOWN` - Down navigation
- `KEYCODE_DPAD_UP` - Up navigation
- `KEYCODE_DPAD_LEFT` - Left navigation
- `KEYCODE_DPAD_RIGHT` - Right navigation
- `KEYCODE_DPAD_UP_LEFT` - Diagonal up-left
- `KEYCODE_DPAD_UP_RIGHT` - Diagonal up-right
- `KEYCODE_DPAD_DOWN_LEFT` - Diagonal down-left
- `KEYCODE_DPAD_DOWN_RIGHT` - Diagonal down-right
- `KEYCODE_BACK` - Back button
- `KEYCODE_HOME` - Home button

Example:

```json
{
  "tool": "pressKey",
  "parameters": {
    "keycode": "KEYCODE_DPAD_DOWN",
    "deviceId": "emulator-5554"
  }
}
```

### Resources

#### Latest Screenshot

Access the most recently captured screenshot through the resource URI:

```
adb://screenshots/latest
```

## Development

### Project Structure

```
mcp-adb/
├── src/
│   └── index.ts    # Main server implementation
├── build/          # Compiled JavaScript files
├── temp/           # Temporary directory for screenshots
├── package.json    # Project dependencies and scripts
└── tsconfig.json   # TypeScript configuration
```

### Building

```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `build` directory.

## Requirements

This project uses the following dependencies:

- `@modelcontextprotocol/sdk`: MCP server implementation
- `fs-extra`: Enhanced file system methods
- `zod`: Schema validation for tool parameters
- `open`: For opening files in the default application

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
