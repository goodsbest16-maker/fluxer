// SPDX-License-Identifier: AGPL-3.0-or-later

import {BatchBuilder, fetchMany, fetchOne} from '../database/CassandraQueryExecution';
import type {ChannelID, MessageID, UserID} from '../BrandedTypes';
import {PollAnswers, Polls, PollVotes} from '../database/PollTables';
import type {PollAnswerRow, PollRow, PollVoteRow} from '../database/types/PollTypes';

const FETCH_POLL_QUERY = Polls.selectCql({
	where: [Polls.where.eq('channel_id'), Polls.where.eq('message_id')],
	limit: 1,
});

const FETCH_POLL_ANSWERS_QUERY = PollAnswers.selectCql({
	where: [PollAnswers.where.eq('channel_id'), PollAnswers.where.eq('message_id')],
});

const FETCH_POLL_VOTES_QUERY = PollVotes.selectCql({
	where: [PollVotes.where.eq('channel_id'), PollVotes.where.eq('message_id')],
});

export interface CreatePollData {
	channelId: ChannelID;
	messageId: MessageID;
	creatorId: UserID;
	question: string;
	durationSeconds: number;
	closesAt: Date;
	ranked: boolean;
	anonymous: boolean;
	allowCustomAnswers: boolean;
	answers: ReadonlyArray<{
		answerId: number;
		text: string;
		attachmentId: string | null;
	}>;
}

export class PollRepository {
	async findPoll(channelId: ChannelID, messageId: MessageID): Promise<PollRow | null> {
		return fetchOne<PollRow>(FETCH_POLL_QUERY, {
			channel_id: channelId,
			message_id: messageId,
		});
	}

	async findAnswers(channelId: ChannelID, messageId: MessageID): Promise<Array<PollAnswerRow>> {
		return fetchMany<PollAnswerRow>(FETCH_POLL_ANSWERS_QUERY, {
			channel_id: channelId,
			message_id: messageId,
		});
	}

	async findVotes(channelId: ChannelID, messageId: MessageID): Promise<Array<PollVoteRow>> {
		return fetchMany<PollVoteRow>(FETCH_POLL_VOTES_QUERY, {
			channel_id: channelId,
			message_id: messageId,
		});
	}

	async createPoll(data: CreatePollData): Promise<PollRow> {
		const poll: PollRow = {
			channel_id: data.channelId,
			message_id: data.messageId,
			creator_id: data.creatorId,
			question: data.question,
			duration_seconds: data.durationSeconds,
			closes_at: data.closesAt,
			ranked: data.ranked,
			anonymous: data.anonymous,
			allow_custom_answers: data.allowCustomAnswers,
			closed_at: null,
			version: 1,
		};

		const now = new Date();
		const batch = new BatchBuilder();
		batch.addPrepared(Polls.upsertAll(poll));
		for (const answer of data.answers) {
			batch.addPrepared(
				PollAnswers.upsertAll({
					channel_id: data.channelId,
					message_id: data.messageId,
					answer_id: answer.answerId,
					text: answer.text,
					attachment_id: answer.attachmentId,
					creator_id: data.creatorId,
					is_custom: false,
					created_at: now,
				}),
			);
		}
		await batch.execute();
		return poll;
	}

	async addCustomAnswer(row: PollAnswerRow): Promise<void> {
		await PollAnswers.upsertAll(row).execute();
	}

	async upsertVote(row: PollVoteRow): Promise<void> {
		await PollVotes.upsertAll(row).execute();
	}
}
