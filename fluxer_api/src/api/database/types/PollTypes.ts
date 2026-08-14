// SPDX-License-Identifier: AGPL-3.0-or-later

import type {ChannelID, MessageID, UserID} from '../../BrandedTypes';

type Nullish<T> = T | null;

export interface PollRow {
	channel_id: ChannelID;
	message_id: MessageID;
	creator_id: UserID;
	question: string;
	duration_seconds: number;
	closes_at: Date;
	ranked: boolean;
	anonymous: boolean;
	allow_custom_answers: boolean;
	closed_at: Nullish<Date>;
	version: number;
}

export interface PollAnswerRow {
	channel_id: ChannelID;
	message_id: MessageID;
	answer_id: number;
	text: string;
	attachment_id: Nullish<string>;
	creator_id: UserID;
	is_custom: boolean;
	created_at: Date;
}

export interface PollVoteRow {
	channel_id: ChannelID;
	message_id: MessageID;
	user_id: UserID;
	answer_id: number;
	rank: number;
	created_at: Date;
}

export const POLL_COLUMNS = [
	'channel_id',
	'message_id',
	'creator_id',
	'question',
	'duration_seconds',
	'closes_at',
	'ranked',
	'anonymous',
	'allow_custom_answers',
	'closed_at',
	'version',
] as const satisfies ReadonlyArray<keyof PollRow>;

export const POLL_ANSWER_COLUMNS = [
	'channel_id',
	'message_id',
	'answer_id',
	'text',
	'attachment_id',
	'creator_id',
	'is_custom',
	'created_at',
] as const satisfies ReadonlyArray<keyof PollAnswerRow>;

export const POLL_VOTE_COLUMNS = [
	'channel_id',
	'message_id',
	'user_id',
	'answer_id',
	'rank',
	'created_at',
] as const satisfies ReadonlyArray<keyof PollVoteRow>;
