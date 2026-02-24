import { db, dbClient } from "./db";
import { backupQueue, files as filesTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { fileHandler } from "./file-handler";
import { storage } from "./storage";

interface BackupJob {
  id: number;
  fileId: number;
  sourceAdapterId: number;
  targetAdapterId: number;
}

class BackupQueueProcessor {
  private isRunning = false;
  private checkInterval = 5000; // 5 seconds

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("[BackupQueue] Starting processor...");
    this.processQueue();
  }

  async stop() {
    this.isRunning = false;
    console.log("[BackupQueue] Stopping processor...");
  }

  private async processQueue() {
    while (this.isRunning) {
      try {
        const pending = await db
          .select()
          .from(backupQueue)
          .where(eq(backupQueue.status, "pending"))
          .limit(5);

        for (const job of pending) {
          await this.processBackupJob(job);
        }

        if (pending.length === 0) {
          // No pending jobs, wait before checking again
          await new Promise((resolve) => setTimeout(resolve, this.checkInterval));
        }
      } catch (error) {
        console.error("[BackupQueue] Error processing queue:", error);
        await new Promise((resolve) => setTimeout(resolve, this.checkInterval));
      }
    }
  }

  private async processBackupJob(job: (typeof backupQueue.$inferSelect)) {
    try {
      // Update status to in_progress
      await db
        .update(backupQueue)
        .set({ status: "in_progress" })
        .where(eq(backupQueue.id, job.id));

      // Get file metadata
      const [fileRecord] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, job.fileId))
        .limit(1);

      if (!fileRecord) {
        throw new Error(`File ${job.fileId} not found`);
      }

      // Get adapters
      const adapters = await storage.getAdapters();
      const sourceAdapter = adapters.find((a) => a.id === job.sourceAdapterId);
      const targetAdapter = adapters.find((a) => a.id === job.targetAdapterId);

      if (!sourceAdapter || !targetAdapter) {
        throw new Error("Adapter not found");
      }

      // Download from source
      const data = await fileHandler.downloadFile(
        { type: sourceAdapter.type as any, config: (sourceAdapter.config ?? {}) as Record<string, any> },
        fileRecord.path
      );

      if (!data) {
        throw new Error(`Failed to download file from source`);
      }

      // Upload to target
      await fileHandler.uploadFile(
        { type: targetAdapter.type as any, config: (targetAdapter.config ?? {}) as Record<string, any> },
        fileRecord.path,
        data
      );

      // Mark as completed
      await db
        .update(backupQueue)
        .set({
          status: "completed",
          completedAt: (dbClient === "sqlite" ? new Date().toISOString() : new Date()) as any,
        })
        .where(eq(backupQueue.id, job.id));

      console.log(
        `[BackupQueue] Completed backup job ${job.id}: ${fileRecord.path}`
      );
    } catch (error) {
      console.error(`[BackupQueue] Error processing job ${job.id}:`, error);

      await db
        .update(backupQueue)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(backupQueue.id, job.id));
    }
  }

  async createBackupJob(
    fileId: number,
    sourceAdapterId: number,
    targetAdapterId: number
  ): Promise<BackupJob> {
    const [job] = await db
      .insert(backupQueue)
      .values({
        fileId,
        sourceAdapterId,
        targetAdapterId,
        status: "pending",
      })
      .returning();

    return job as BackupJob;
  }

  async getBackupJobs(status?: string) {
    if (status) {
      return await db
        .select()
        .from(backupQueue)
        .where(eq(backupQueue.status, status as any));
    }
    return await db.select().from(backupQueue);
  }
}

export const backupProcessor = new BackupQueueProcessor();
