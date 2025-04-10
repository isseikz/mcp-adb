#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { z } from "zod";
// Replace static import with dynamic import later
// import open from 'open'; - This was causing the CommonJS/ESM error

const execAsync = promisify(exec);

// Define a temporary directory for screenshots inside the project
const TEMP_DIR = path.join(__dirname, '..', 'temp');
// Track the latest screenshot file
let latestScreenshotPath = '';

// Android keycode enum
enum AndroidKeyCode {
    KEYCODE_DPAD_CENTER = 23,
    KEYCODE_DPAD_DOWN = 20,
    KEYCODE_DPAD_DOWN_LEFT = 269,
    KEYCODE_DPAD_DOWN_RIGHT = 271,
    KEYCODE_DPAD_LEFT = 21,
    KEYCODE_DPAD_RIGHT = 22,
    KEYCODE_DPAD_UP = 19,
    KEYCODE_DPAD_UP_LEFT = 268,
    KEYCODE_DPAD_UP_RIGHT = 270,
    KEYCODE_BACK = 4,
    KEYCODE_HOME = 3
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function main() {
    try {
        // Check if ADB is available
        try {
            await execAsync('adb version');
            console.log('ADB is available. Starting MCP server...');
        } catch (error) {
            console.error('ADB is not installed or not in PATH. Please install ADB and try again.');
            process.exit(1);
        }

        // Create an MCP server
        const server = new McpServer({
            name: "ADB MCP Server",
            version: "1.0.0"
        });

        // Add screenshot tool with proper parameter schema
        server.tool(
            "screenshot",
            {
                deviceId: z.string().optional(),
            },
            async (args, extra) => {
                try {
                    // Generate a unique filename for this screenshot
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const screenshotFilename = `screenshot-${timestamp}.png`;
                    const tempFilePath = path.join(TEMP_DIR, screenshotFilename);

                    // Get deviceId from parameters
                    const deviceId = args.deviceId;

                    // Build the ADB command
                    let adbCommand = 'adb';
                    if (deviceId) {
                        adbCommand += ` -s ${deviceId}`;
                    }
                    adbCommand += ` exec-out screencap -p > ${tempFilePath} && sips -Z 640 ${tempFilePath}`;

                    // Execute the ADB command and directly capture the output
                    console.log(`Executing: ${adbCommand}`);
                    execSync(adbCommand);

                    // Check if the file was created and has content
                    if (!fs.existsSync(tempFilePath) || (await fs.stat(tempFilePath)).size === 0) {
                        throw new Error('Failed to capture screenshot');
                    }

                    // Update the latest screenshot path
                    latestScreenshotPath = tempFilePath;

                    // Read the image file as base64
                    const imageBuffer = await fs.readFile(tempFilePath);
                    const base64Image = imageBuffer.toString('base64');

                    // Return a reference to the image resource
                    return {
                        content: [
                            {
                                type: "text",
                                description: "Base64 encoded screenshot",
                                text: base64Image
                            }
                        ]
                    };
                } catch (error) {
                    console.error('Screenshot error:', error);
                    throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        );

        // Add key press tool with proper parameter schema
        server.tool(
            "pressKey",
            {
                keycode: z.enum([
                    "KEYCODE_DPAD_CENTER",
                    "KEYCODE_DPAD_DOWN",
                    "KEYCODE_DPAD_DOWN_LEFT",
                    "KEYCODE_DPAD_DOWN_RIGHT",
                    "KEYCODE_DPAD_LEFT",
                    "KEYCODE_DPAD_RIGHT",
                    "KEYCODE_DPAD_UP",
                    "KEYCODE_DPAD_UP_LEFT",
                    "KEYCODE_DPAD_UP_RIGHT",
                    "KEYCODE_BACK",
                    "KEYCODE_HOME"
                ]),
                deviceId: z.string().optional()
            },
            async (args, extra) => {
                try {
                    // Get the keycode value from the enum
                    const keycodeValue = AndroidKeyCode[args.keycode as keyof typeof AndroidKeyCode];

                    // Build the ADB command
                    let adbCommand = 'adb';
                    if (args.deviceId) {
                        adbCommand += ` -s ${args.deviceId}`;
                    }
                    adbCommand += ` shell input keyevent ${keycodeValue}`;

                    // Execute the ADB command
                    console.log(`Executing: ${adbCommand}`);
                    await execAsync(adbCommand);

                    return {
                        content: [{
                            type: "text",
                            text: `Successfully pressed ${args.keycode} (keycode: ${keycodeValue})`
                        }]
                    };
                } catch (error) {
                    console.error('Key press error:', error);
                    throw new Error(`Failed to press key: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        );

        // Start receiving messages on stdin and sending messages on stdout
        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.log('MCP ADB server started successfully!');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();