import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const useDB = () => {
    if (dbInstance) return dbInstance;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
        throw new Error("Missing Turso Database configuration.");
    }

    const client = createClient({
        url,
        authToken,
    });

    dbInstance = drizzle(client, { schema });
    return dbInstance;
}
