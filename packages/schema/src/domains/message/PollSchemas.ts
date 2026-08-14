// SPDX-License-Identifier: AGPL-3.0-or-later

import {createStringType, Int32Type} from '@fluxer/schema/src/primitives/SchemaPrimitives';
import {z} from 'zod';

export const POLL_MIN_ANSWERS = 2 as const;
export const POLL_MAX_ANSWERS = 10 as const;
export const POLL_QUESTION_MAX_LENGTH = 300 as const;
export const POLL_ANSWER_MAX_LENGTH = 300 as const;
export const POLL_MIN_DURATION_SECONDS = 60 as const;
export const POLL_MAX_DURATION_SECONDS = 60 * 60 * 24 * 7 as const;

/**
 * Client-side poll answer definition.
 *
 * `attachment_id` references an image attachment included with the same message
 * request. Keeping the image as a normal message attachment preserves the
 * existing upload, expiry, moderation and audit logging pipeline.
 */
export const PollAnswerRequest = z
	.object({
		text: createStringType(0, POLL_ANSWER_MAX_LENGTH).default('').describe('Text shown for this poll answer'),
		attachment_id: Int32Type.nullish().describe(
			'Client-side attachment identifier for an optional image attached to this answer',
		),
	})
	.refine((answer) => answer.text.length > 0 || answer.attachment_id != null, {
		message: 'A poll answer must contain text or an image attachment',
	});

export type PollAnswerRequest = z.infer<typeof PollAnswerRequest>;

export const PollRequest = z.object({
	question: createStringType(1, POLL_QUESTION_MAX_LENGTH).describe('Poll title or question'),
	answers: z
		.array(PollAnswerRequest)
		.min(POLL_MIN_ANSWERS)
		.max(POLL_MAX_ANSWERS)
		.describe(`Poll answers (${POLL_MIN_ANSWERS}-${POLL_MAX_ANSWERS})`),
	duration_seconds: z
		.number()
		.int()
		.min(POLL_MIN_DURATION_SECONDS)
		.max(POLL_MAX_DURATION_SECONDS)
		.describe('How long the poll remains open, in seconds'),
	ranked: z.boolean().default(false).describe('Whether voters rank multiple answers in preference order'),
	anonymous: z.boolean().default(false).describe('Whether voter identities are hidden from community members'),
	allow_custom_answers: z.boolean().default(false).describe('Whether voters may add custom answers'),
});

export type PollRequest = z.infer<typeof PollRequest>;
