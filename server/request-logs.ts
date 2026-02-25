export interface RequestLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  response?: unknown;
}

const MAX_LOGS = 300;
const requestLogs: RequestLogEntry[] = [];

export function recordRequestLog(entry: RequestLogEntry) {
  requestLogs.push(entry);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.splice(0, requestLogs.length - MAX_LOGS);
  }
}

export function getRecentRequestLogs(limit = 100): RequestLogEntry[] {
  return requestLogs.slice(-Math.max(1, limit)).reverse();
}
