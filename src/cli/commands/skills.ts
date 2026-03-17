import { Command } from 'commander';
import { promises as fsPromises, Dirent } from 'fs';
import { resolveSkillsTemplatePath } from '../../shared/workspace.js';
import { handleError } from '../utils.js';

export const skillsCmd = new Command('skills').description('Manage template skills');

skillsCmd
  .command('list')
  .description('List available template skills')
  .action(async () => {
    try {
      const skillsDir = await resolveSkillsTemplatePath();
      let entries: Dirent[];
      try {
        entries = await fsPromises.readdir(skillsDir, { withFileTypes: true });
      } catch (err) {
        if ((err as any).code === 'ENOENT') {
          console.log('No skills found.');
          return;
        }
        throw err;
      }

      const skills = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      if (skills.length === 0) {
        console.log('No skills found.');
        return;
      }
      for (const skill of skills) {
        console.log(`- ${skill}`);
      }
    } catch (err) {
      handleError('list skills', err);
    }
  });
