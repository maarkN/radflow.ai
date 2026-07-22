import { z } from 'zod';

export const prioritySchema = z.enum(['stat', 'urgent', 'routine']);
export type Priority = z.infer<typeof prioritySchema>;

export const modalitySchema = z.enum(['CT', 'MR', 'CR', 'US']);
export type Modality = z.infer<typeof modalitySchema>;

export const studyStatusSchema = z.enum(['unread', 'in_progress', 'dictated', 'signed']);
export type StudyStatus = z.infer<typeof studyStatusSchema>;
