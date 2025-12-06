import { spawn, ChildProcess, execSync } from "child_process";
import { Server as SocketServer } from "socket.io";
import path from "path";
import fs from "fs/promises";
import { storage } from "../storage/index.js";

interface RunningProcess {
  process: ChildProcess;
  port: number;
  appId: number;
  startTime: Date;
}

export class ProcessManager {
  private static instance: ProcessManager;
  private processes: Map<number, RunningProcess> = new Map();
  private io: SocketServer | null = null;
  private startPort = 3002; // Start assigning ports from 3002
  private maxPorts = 100; // Maximum concurrent apps

  private constructor() {}

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  public setSocketServer(io: SocketServer) {
    this.io = io;
  }

  private getAvailablePort(): number {
    const usedPorts = new Set(Array.from(this.processes.values()).map(p => p.port));
    for (let i = 0; i < this.maxPorts; i++) {
      const port = this.startPort + i;
      if (!usedPorts.has(port)) return port;
    }
    throw new Error("No available ports for new processes");
  }

  public async startApp(userId: number, appId: number): Promise<number> {
    // Check if already running
    if (this.processes.has(appId)) {
      return this.processes.get(appId)!.port;
    }

    const port = this.getAvailablePort();
    const appPath = storage.getUserAppPath(userId, appId);
    const fullPath = path.resolve(process.env.STORAGE_PATH || "./data", appPath);

    // Ensure package.json exists
    try {
      await fs.access(path.join(fullPath, "package.json"));
    } catch {
      throw new Error("Project not initialized (no package.json)");
    }

    this.broadcastLog(appId, `Preparing to start app...\n`);

    // Check if node_modules exists, if not run npm install
    try {
      await fs.access(path.join(fullPath, "node_modules"));
    } catch {
      this.broadcastLog(appId, `Installing dependencies (npm install)...\n`);
      try {
        execSync("npm install", {
          cwd: fullPath,
          stdio: "pipe",
          timeout: 120000, // 2 minute timeout
        });
        this.broadcastLog(appId, `Dependencies installed successfully!\n`);
      } catch (installError: any) {
        this.broadcastLog(appId, `npm install failed: ${installError.message}\n`, true);
        throw new Error(`Failed to install dependencies: ${installError.message}`);
      }
    }

    // Spawn process
    // We use 'npm run dev' and force the port
    const child = spawn("npm", ["run", "dev", "--", "--port", port.toString()], {
      cwd: fullPath,
      env: { ...process.env, PORT: port.toString() },
      shell: true,
    });

    this.processes.set(appId, {
      process: child,
      port,
      appId,
      startTime: new Date(),
    });

    this.broadcastLog(appId, `Starting app on port ${port}...\n`);

    child.stdout?.on("data", (data) => {
      this.broadcastLog(appId, data.toString());
    });

    child.stderr?.on("data", (data) => {
      this.broadcastLog(appId, data.toString(), true);
    });

    child.on("exit", (code) => {
      this.broadcastLog(appId, `Process exited with code ${code}\n`);
      this.processes.delete(appId);
    });

    return port;
  }

  public stopApp(appId: number): boolean {
    const proc = this.processes.get(appId);
    if (proc) {
      proc.process.kill();
      this.processes.delete(appId);
      this.broadcastLog(appId, "App stopped.\n");
      return true;
    }
    return false;
  }

  public getAppPort(appId: number): number | undefined {
    return this.processes.get(appId)?.port;
  }

  private broadcastLog(appId: number, message: string, isError = false) {
    if (this.io) {
      this.io.to(`app-${appId}`).emit("terminal:log", {
        appId,
        message,
        isError,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const processManager = ProcessManager.getInstance();

