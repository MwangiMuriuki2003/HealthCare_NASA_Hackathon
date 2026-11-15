/**
 * Prisma client stub.
 *
 * The @prisma/client package is not installed in this project, so the API
 * routes degrade gracefully: they return 503 when the client is absent and
 * harmless empty results otherwise.
 *
 * To enable the real database path:
 *   1. npm install prisma @prisma/client
 *   2. npx prisma generate
 *   3. Replace this stub with the generated PrismaClient instance.
 */

export interface PrismaClientStub {
  vital: {
    findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      take?: number;
      include?: Record<string, unknown>;
    }): Promise<Array<Record<string, unknown>>>;
    create(args: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }): Promise<Record<string, unknown>>;
  };
  achievement: {
    findMany(args?: {
      include?: Record<string, unknown>;
      orderBy?: Record<string, string>;
    }): Promise<Array<Record<string, unknown>>>;
    create(args: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }): Promise<Record<string, unknown>>;
  };
  reminder: {
    findMany(args?: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      orderBy?: Record<string, string>;
    }): Promise<Array<Record<string, unknown>>>;
    create(args: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }): Promise<Record<string, unknown>>;
  };
}

export const prisma: PrismaClientStub | null = null;
