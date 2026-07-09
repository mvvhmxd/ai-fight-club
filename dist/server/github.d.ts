export declare function parseGitHubRepository(url: string): {
    owner: string;
    repo: string;
} | null;
export declare function verifyGitHubRepository(url: string, request?: typeof fetch): Promise<{
    valid: boolean;
    error?: string;
}>;
//# sourceMappingURL=github.d.ts.map