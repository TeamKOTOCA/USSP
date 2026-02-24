declare module "pg" {
  export interface PoolConfig {
    connectionString?: string;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
  };

  export default pg;
}

declare module "better-sqlite3" {
  export default class Database {
    constructor(path: string);
    pragma(command: string): unknown;
  }
}
