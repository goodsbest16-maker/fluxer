// SPDX-License-Identifier: AGPL-3.0-or-later

import {defineTable} from './CassandraTableDsl';
import {
	POLL_ANSWER_COLUMNS,
	POLL_COLUMNS,
	POLL_VOTE_COLUMNS,
	type PollAnswerRow,
	type PollRow,
	type PollVoteRow,
} from './types/PollTypes';

export const Polls = defineTable<PollRow, 'channel_id' | 'message_id', 'channel_id'>({
	name: 'polls',
	columns: POLL_COLUMNS,
	primaryKey: ['channel_id', 'message_id'],
	partitionKey: ['channel_id'],
});

export const PollAnswers = defineTable<
	PollAnswerRow,
	'channel_id' | 'message_id' | 'answer_id',
	'channel_id' | 'message_id'
>({
	name: 'poll_answers',
	columns: POLL_ANSWER_COLUMNS,
	primaryKey: ['channel_id', 'message_id', 'answer_id'],
	partitionKey: ['channel_id', 'message_id'],
});

export const PollVotes = defineTable<
	PollVoteRow,
	'channel_id' | 'message_id' | 'user_id' | 'rank',
	'channel_id' | 'message_id'
>({
	name: 'poll_votes',
	columns: POLL_VOTE_COLUMNS,
	primaryKey: ['channel_id', 'message_id', 'user_id', 'rank'],
	partitionKey: ['channel_id', 'message_id'],
});
