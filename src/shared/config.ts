import { z } from 'zod';

export const SettingsSchema = z.looseObject({
  chats: z
    .looseObject({
      new: z.string().optional(),
      defaultId: z.string().optional(),
    })
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
