import { createAuthClient } from "better-auth/vue";

// 自動根據環境判斷 BaseURL
export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
});

export const { signIn, signUp, signOut, useSession } = authClient;
