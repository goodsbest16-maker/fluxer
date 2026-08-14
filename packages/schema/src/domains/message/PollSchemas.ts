// SPDX-License-Identifier: AGPL-3.0-or-later

import {createStringType, Int32Type, SnowflakeType} from '@fluxer/schema/src/primitives/SchemaPrimitives';
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

export const PollVoteRequest = z.object({
	answer_ids: z
		.array(Int32Type)
		.min(1)
		.max(POLL_MAX_ANSWERS)
		.refine((ids) => new Set(ids).size === ids.length, {message: 'Poll answer IDs must be unique'})
		.describe('Selected answer IDs in preference order for ranked polls'),
});

export type PollVoteRequest = z.infer<typeof PollVoteRequest>;

export const PollCustomAnswerRequest = z
	.object({
		text: createStringType(0, POLL_ANSWER_MAX_LENGTH).default('').describe('Text for the custom poll answer'),
		attachment_id: Int32Type.nullish().describe('Optional client-side attachment identifier for the custom answer image'),
	})
	.refine((answer) => answer.text.trim().length > 0 || answer.attachment_id != null, {
		message: 'A custom poll answer must contain text or an image attachment',
	});

export type PollCustomAnswerRequest = z.infer<typeof PollCustomAnswerRequest>;

export const PollAnswerResponse = z.object({
	id: Int32Type.describe('Stable answer identifier within the poll'),
	text: createStringType(0, POLL_ANSWER_MAX_LENGTH).describe('Text shown for this poll answer'),
	attachment_id: SnowflakeType.nullish().describe('Resolved attachment snowflake for an optional answer image'),
	vote_count: Int32Type.describe('Number of votes recorded for this answer'),
	custom: z.boolean().describe('Whether this answer was added by a voter'),
});

export type PollAnswerResponse = z.infer<typeof PollAnswerResponse>;

export const PollResponse = z.object({
	question: createStringType(1, POLL_QUESTION_MAX_LENGTH).describe('Poll title or question'),
	answers: z.array(PollAnswerResponse).max(POLL_MAX_ANSWERS).describe('Current poll answers and vote totals'),
	closes_at: z.string().datetime().nullish().describe('ISO8601 timestamp when voting closes'),
	closed: z.boolean().describe('Whether voting has closed'),
	ranked: z.boolean().describe('Whether voters rank answers in preference order'),
	anonymous: z.boolean().describe('Whether voter identities are hidden from community members'),
	allow_custom_answers: z.boolean().describe('Whether voters may add custom answers'),
	total_votes: Int32Type.describe('Total stored vote rows for the poll'),
	my_answer_ids: z.array(Int32Type).max(POLL_MAX_ANSWERS).describe('Current viewer selections in rank order'),
});

export type PollResponse = z.infer<typeof PollResponse>;
