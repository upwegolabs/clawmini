import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createE2EContext } from './utils.js';

const { runCli, setupE2E, teardownE2E } = createE2EContext('e2e-tmp-skills');

describe('E2E Skills Tests', () => {
  beforeAll(async () => {
    await setupE2E();
    await runCli(['init']);
  }, 30000);

  afterAll(teardownE2E, 30000);

  it('should list available template skills', async () => {
    const { stdout, code, stderr } = await runCli(['skills', 'list']);
    expect(code).toBe(0);
    // As it reads from the internal templates/skills directory,
    // it should at least output one of the default template skills, or "No skills found."
    // Let's just ensure it executes successfully.
    expect(stderr).toBe('');
    expect(stdout.length).toBeGreaterThan(0);
  });
});
