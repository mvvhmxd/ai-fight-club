import { describe, expect, it, vi } from 'vitest';
import { parseGitHubRepository, verifyGitHubRepository } from './github';
describe('GitHub verification', () => {
    it('accepts only canonical GitHub repository URLs', () => {
        expect(parseGitHubRepository('https://github.com/openai/openai-node.git'))
            .toEqual({ owner: 'openai', repo: 'openai-node' });
        expect(parseGitHubRepository('https://example.com/openai/openai-node')).toBeNull();
    });
    it('requires a visible repository with commits', async () => {
        const request = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ sha: 'abc' }] });
        await expect(verifyGitHubRepository('https://github.com/openai/openai-node', request)).resolves.toEqual({ valid: true });
        expect(request).toHaveBeenCalledTimes(2);
    });
    it('fails closed when GitHub cannot be reached', async () => {
        const request = vi.fn().mockRejectedValue(new Error('offline'));
        const result = await verifyGitHubRepository('https://github.com/openai/openai-node', request);
        expect(result.valid).toBe(false);
    });
});
//# sourceMappingURL=github.test.js.map