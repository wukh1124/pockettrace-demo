import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { useDB } from "../db/index";
import * as schema from "../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(useDB(), {
        provider: "sqlite",
        schema: {
            ...schema,
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification
        }
    }),
    emailAndPassword: {
        enabled: true
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
        ...(process.env.LOCAL_TEST_URL ? [process.env.LOCAL_TEST_URL] : []),
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [])
    ]
});
