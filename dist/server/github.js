const githubRepositoryPattern = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/i;
export function parseGitHubRepository(url) {
    const match = url.trim().match(githubRepositoryPattern);
    return match ? { owner: match[1], repo: match[2] } : null;
}
export async function verifyGitHubRepository(url, request = fetch) {
    const repository = parseGitHubRepository(url);
    if (!repository)
        return { valid: false, error: 'Enter a valid public GitHub repository URL' };
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-fight-club',
    };
    if (process.env.GITHUB_TOKEN)
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const base = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
    try {
        const repoResponse = await request(base, { headers });
        if (!repoResponse.ok)
            return { valid: false, error: 'GitHub repository was not found or is not public' };
        const commitsResponse = await request(`${base}/commits?per_page=1`, { headers });
        if (!commitsResponse.ok)
            return { valid: false, error: 'GitHub repository must contain at least one commit' };
        const commits = await commitsResponse.json();
        return commits.length > 0
            ? { valid: true }
            : { valid: false, error: 'GitHub repository must contain at least one commit' };
    }
    catch {
        return { valid: false, error: 'GitHub could not be reached; try again shortly' };
    }
}
//# sourceMappingURL=github.js.map