#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { CallToolRequestSchema, CallToolResultSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { env } from "process";
// Replace static import with dynamic import later
// import open from 'open'; - This was causing the CommonJS/ESM error

const execAsync = promisify(exec);

const ADB = env.ADB_PATH // Path to ADB executable
const execAdbAsync = (command: string) => {
    return execAsync(`${ADB} ${command}`);
};

// Define a temporary directory for screenshots inside the project
const TEMP_DIR = path.join(__dirname, '..', 'temp');

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

async function startMcpServer() {
    try {
        // Check if ADB is available
        try {
            await execAsync(`${ADB} version`);
            console.error('ADB is available. Starting MCP server...');
        } catch (error) {
            console.error('ADB is not installed or not in PATH. Please install ADB and try again.');
            process.exit(1);
        }

        // Create an MCP server
        const server = new Server(
            {
                name: "ADB MCP Server",
                version: "1.0.0"
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );

        server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => ({
            tools: [
                {
                    name: "screenshot",
                    description: "Take a screenshot of the connected device.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            deviceId: {
                                type: "string",
                                description: "The ID of the device to take a screenshot from.",
                            },
                        },
                        required: [],
                    },
                },

                {
                    name: "pressKey",
                    description: "Press a key on the connected device.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            keycode: {
                                type: "string",
                                enum: Object.keys(AndroidKeyCode),
                                description: "The keycode of the key to press.",
                            },
                            deviceId: {
                                type: "string",
                                description: "The ID of the device to press the key on.",
                            },
                        },
                        required: ["keycode"],
                    },
                }
            ],
        }));

        // Add screenshot tool with proper parameter schema
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case "screenshot":
                    const args = request.params.arguments as { deviceId?: string }; // Cast to expected type
                    try {
                        // Generate a unique filename for this screenshot
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const screenshotFilename = `screenshot-${timestamp}.png`;
                        const tempFilePath = path.join(TEMP_DIR, screenshotFilename);

                        // Get deviceId from parameters
                        const deviceId = args.deviceId;

                        // Build the ADB command
                        let adbCommand = "";
                        if (deviceId) {
                            adbCommand += ` -s ${deviceId}`;
                        }
                        adbCommand += ` exec-out screencap -p > ${tempFilePath} && sips -Z 640 ${tempFilePath}`;

                        // Execute the ADB command and directly capture the output
                        console.error(`Executing: ${adbCommand}`);
                        await execAdbAsync(adbCommand);

                        // Check if the file was created and has content
                        if (!fs.existsSync(tempFilePath) || (await fs.stat(tempFilePath)).size === 0) {
                            throw new Error('Failed to capture screenshot');
                        }

                        const image = await fs.readFile(tempFilePath, { encoding: 'base64', flag: 'r' });

                        return {
                            content: [{
                                type: "image",
                                data: image,
                                mimeType: "image/png",
                            }],
                        };
                    } catch (error) {
                        console.error('Screenshot error:', error);
                        throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
                    }

                case "pressKey":
                    try {
                        const {
                            deviceId,
                            keycode
                        } = request.params.arguments as { deviceId?: string; keycode: keyof typeof AndroidKeyCode }; // Cast to expected type
                        // Get the keycode value from the enum
                        const keycodeValue = AndroidKeyCode[keycode];

                        // Build the ADB command
                        let adbCommand = "";
                        if (deviceId) {
                            adbCommand += ` -s ${deviceId}`;
                        }
                        adbCommand += ` shell input keyevent ${keycodeValue}`;

                        // Execute the ADB command
                        console.error(`Executing: ${adbCommand}`);
                        await execAdbAsync(adbCommand);

                        return {
                            content: [{
                                type: "text",
                                text: `Successfully pressed ${keycode} (keycode: ${keycodeValue})`
                            }]
                        };
                    } catch (error) {
                        console.error('Key press error:', error);
                        throw new Error(`Failed to press key: ${error instanceof Error ? error.message : String(error)}`);
                    }
                default:
                    console.error(`Tool ${request.params.name} not found`);
                    throw new Error(`Tool ${request.params.name} not found`);
            }
        });

        server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                {
                    name: "devices",
                    description: "List of connected devices.",
                    uri: "adb://devices",
                    mimeType: "text/plain",
                },
                {
                    name: "screenshot",
                    description: "Read screenshot taken from the device.",
                    uri: "adb://screenshots/{filename}",
                    mimeType: "image/png",
                },
            ]
        }));

        server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            if (request.params.uri.startsWith("adb://screenshots/")) {
                const filename = request.params.uri.split("/").pop();
                if (!filename) {
                    throw new Error(`Invalid screenshot URI: ${request.params.uri}`);
                }
                const filePath = path.join(TEMP_DIR, filename);
                if (fs.existsSync(filePath)) {
                    const data = await fs.readFile(filePath, { encoding: 'base64', flag: 'r' });

                    return {
                        contents: [{
                            uri: request.params.uri,
                            mimeType: 'image/png',
                            blob: data
                        }]
                    };
                } else {
                    throw new Error(`Screenshot ${filename} not found.`);
                }
            }
            switch (request.params.uri) {
                case "adb://devices":
                    try {
                        const adbDevicesOutput = await execAdbAsync(`devices`);
                        const devicesOutput = adbDevicesOutput.stdout.split('\n').slice(1).filter(line => line.trim() !== '');
                        const devices = devicesOutput.map(line => {
                            const [deviceId, status] = line.trim().split(/\s+/);
                            return { deviceId, status };
                        });
                        return {
                            contents: devices.filter(device => device.status == 'device').map(device => ({
                                uri: `adb://${device.deviceId}`,
                                mimeType: 'text/plain',
                                text: device.deviceId,
                            }))
                        };
                    } catch (error) {
                        console.error('Error accessing devices resource:', error);
                        throw new Error(`Failed to access resource ${request.params.uri}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                default:
                    console.error(`Resource ${request.params.uri} not found`);
                    throw new Error(`Resource ${request.params.uri} not found`);
            }
        });

        return server;
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

async function main() {
    console.error('MCP ADB server connected via stdio.');
    const server = await startMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport); // Connect MCP server AFTER setting up HTTP server
}

main().catch(err => {
    console.error("Unhandled error in main:", err);
    process.exit(1);
});
