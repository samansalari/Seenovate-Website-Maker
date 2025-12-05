import fs from "fs/promises";
import path from "path";

// Base storage path - configured via environment variable for Railway volumes
const STORAGE_BASE = process.env.STORAGE_PATH || "./data";

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

/**
 * Storage abstraction layer for file operations
 * Works with local filesystem, designed for Railway volume mounts
 */
export class Storage {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || STORAGE_BASE;
  }

  /**
   * Get the full path for a relative path
   */
  private getFullPath(relativePath: string): string {
    // Prevent path traversal attacks
    const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    return path.join(this.basePath, normalized);
  }

  /**
   * Ensure a directory exists
   */
  async ensureDir(dirPath: string): Promise<void> {
    const fullPath = this.getFullPath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Read a file
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    return fs.readFile(fullPath, "utf-8");
  }

  /**
   * Read a file as buffer (for binary files)
   */
  async readFileBuffer(filePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    return fs.readFile(fullPath);
  }

  /**
   * Write a file
   */
  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.unlink(fullPath);
  }

  /**
   * Delete a directory recursively
   */
  async deleteDir(dirPath: string): Promise<void> {
    const fullPath = this.getFullPath(dirPath);
    await fs.rm(fullPath, { recursive: true, force: true });
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string): Promise<FileInfo[]> {
    const fullPath = this.getFullPath(dirPath);
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      
      const files: FileInfo[] = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(dirPath, entry.name);
          const fullEntryPath = this.getFullPath(entryPath);
          
          let stats;
          try {
            stats = await fs.stat(fullEntryPath);
          } catch {
            stats = null;
          }

          return {
            name: entry.name,
            path: entryPath,
            isDirectory: entry.isDirectory(),
            size: stats?.size,
            modifiedAt: stats?.mtime,
          };
        })
      );

      return files;
    } catch {
      return [];
    }
  }

  /**
   * List files recursively
   */
  async listFilesRecursive(dirPath: string, maxDepth = 10): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    async function walk(currentPath: string, depth: number, storage: Storage) {
      if (depth > maxDepth) return;

      const files = await storage.listFiles(currentPath);
      
      for (const file of files) {
        results.push(file);
        
        if (file.isDirectory) {
          // Skip node_modules and other common ignore directories
          const name = file.name.toLowerCase();
          if (name === "node_modules" || name === ".git" || name === "dist" || name === ".next") {
            continue;
          }
          await walk(file.path, depth + 1, storage);
        }
      }
    }

    await walk(dirPath, 0, this);
    return results;
  }

  /**
   * Copy a file
   */
  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const fullSrc = this.getFullPath(srcPath);
    const fullDest = this.getFullPath(destPath);
    const destDir = path.dirname(fullDest);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(fullSrc, fullDest);
  }

  /**
   * Copy a directory recursively
   */
  async copyDir(srcPath: string, destPath: string): Promise<void> {
    const fullSrc = this.getFullPath(srcPath);
    const fullDest = this.getFullPath(destPath);
    await fs.cp(fullSrc, fullDest, { recursive: true });
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const fullOld = this.getFullPath(oldPath);
    const fullNew = this.getFullPath(newPath);
    const newDir = path.dirname(fullNew);
    await fs.mkdir(newDir, { recursive: true });
    await fs.rename(fullOld, fullNew);
  }

  /**
   * Get file stats
   */
  async stat(filePath: string): Promise<{ size: number; modifiedAt: Date; isDirectory: boolean } | null> {
    const fullPath = this.getFullPath(filePath);
    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the user's app storage path
   */
  getUserAppPath(userId: number, appId: number): string {
    return path.join("apps", userId.toString(), appId.toString());
  }

  /**
   * Initialize storage directory structure
   */
  async initialize(): Promise<void> {
    await this.ensureDir("apps");
    await this.ensureDir("uploads");
    await this.ensureDir("temp");
    console.log(`Storage initialized at: ${this.basePath}`);
  }
}

// Export singleton instance
export const storage = new Storage();

