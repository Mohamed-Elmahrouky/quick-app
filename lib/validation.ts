import { z } from 'zod';

export const submissionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  academicNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{5,12}$/, 'Academic number must be 5–12 digits'),
  projectId: z
    .number()
    .int()
    .positive('Please select a valid project number'),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
