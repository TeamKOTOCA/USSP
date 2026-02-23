export interface BackupJob {
  id: number;
  fileId: number;
  sourceAdapterId: number;
  targetAdapterId: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BackupJobOptions {
  fileId: number;
  sourceAdapterId: number;
  targetAdapterId: number;
}

export interface BackupJobStatus {
  jobs: BackupJob[];
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export class BackupClient {
  private ussp: any;

  constructor(ussp: any) {
    this.ussp = ussp;
  }

  /**
   * バックアップジョブを作成
   */
  async create(options: BackupJobOptions): Promise<BackupJob> {
    return this.ussp.request<BackupJob>("/api/backup/create", {
      method: "POST",
      data: options,
    });
  }

  /**
   * バックアップジョブのステータスを取得
   */
  async getStatus(status?: string): Promise<BackupJob[]> {
    const params: Record<string, any> = {};
    if (status) {
      params.status = status;
    }

    return this.ussp.request<BackupJob[]>("/api/backup/status", {
      params,
    });
  }

  /**
   * すべてのジョブを取得
   */
  async getAllJobs(): Promise<BackupJob[]> {
    return this.getStatus();
  }

  /**
   * 保留中のジョブを取得
   */
  async getPendingJobs(): Promise<BackupJob[]> {
    return this.getStatus("pending");
  }

  /**
   * 実行中のジョブを取得
   */
  async getInProgressJobs(): Promise<BackupJob[]> {
    return this.getStatus("in_progress");
  }

  /**
   * 完了したジョブを取得
   */
  async getCompletedJobs(): Promise<BackupJob[]> {
    return this.getStatus("completed");
  }

  /**
   * 失敗したジョブを取得
   */
  async getFailedJobs(): Promise<BackupJob[]> {
    return this.getStatus("failed");
  }

  /**
   * バックアップジョブの統計を取得
   */
  async getStatistics(): Promise<BackupJobStatus> {
    const jobs = await this.getAllJobs();

    return {
      jobs,
      pending: jobs.filter((j) => j.status === "pending").length,
      inProgress: jobs.filter((j) => j.status === "in_progress").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
    };
  }

  /**
   * バックアップジョブをキャンセル（実装は今後）
   */
  async cancel(jobId: number): Promise<void> {
    await this.ussp.request(`/api/backup/cancel/${jobId}`, {
      method: "POST",
    });
  }

  /**
   * 複数のファイルをバックアップ
   */
  async backupMultiple(
    files: BackupJobOptions[]
  ): Promise<BackupJob[]> {
    return Promise.all(
      files.map((file) => this.create(file))
    );
  }

  /**
   * バックアップを監視（ポーリング）
   */
  async watch(
    jobId: number,
    callback: (job: BackupJob) => void,
    interval: number = 1000,
    maxDuration: number = 60000
  ): Promise<BackupJob> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const jobs = await this.getAllJobs();
          const job = jobs.find((j) => j.id === jobId);

          if (!job) {
            clearInterval(pollInterval);
            reject(new Error("Job not found"));
            return;
          }

          callback(job);

          if (job.status === "completed" || job.status === "failed") {
            clearInterval(pollInterval);
            resolve(job);
          }

          // タイムアウト
          if (Date.now() - startTime > maxDuration) {
            clearInterval(pollInterval);
            reject(new Error("Backup timeout"));
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, interval);
    });
  }
}
