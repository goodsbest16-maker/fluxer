// SPDX-License-Identifier: AGPL-3.0-or-later

import type {ChannelID, MessageID, UserID} from '../BrandedTypes';
import type {PollAnswerRow, PollVoteRow} from '../database/types/PollTypes';
import {PollRepository} from './PollRepository';

export interface SubmitPollVoteInput {
	channelId: ChannelID;
	messageId: MessageID;
	userId: UserID;
	answerIds: ReadonlyArray<number>;
}

export interface AddCustomPollAnswerInput {
	channelId: ChannelID;
	messageId: MessageID;
	userId: UserID;
	text: string;
	attachmentId?: string | null;
}

export class PollService {
	constructor(private readonly repository: PollRepository = new PollRepository()) {}

	async submitVote(input: SubmitPollVoteInput): Promise<Array<PollVoteRow>> {
		const poll = await this.repository.findPoll(input.channelId, input.messageId);
		if (!poll) throw new Error('Poll not found');
		if (poll.closed_at || poll.closes_at.getTime() <= Date.now()) throw new Error('Poll is closed');

		const uniqueAnswerIds = [...new Set(input.answerIds)];
		if (uniqueAnswerIds.length === 0) throw new Error('At least one poll answer must be selected');
		if (!poll.ranked && uniqueAnswerIds.length !== 1) throw new Error('This poll only allows one selected answer');

		const answers = await this.repository.findAnswers(input.channelId, input.messageId);
		const validAnswerIds = new Set(answers.map((answer) => answer.answer_id));
		for (const answerId of uniqueAnswerIds) {
			if (!validAnswerIds.has(answerId)) throw new Error(`Unknown poll answer: ${answerId}`);
		}

		const now = new Date();
		const rows = uniqueAnswerIds.map<PollVoteRow>((answerId, index) => ({
			channel_id: input.channelId,
			message_id: input.messageId,
			user_id: input.userId,
			answer_id: answerId,
			rank: poll.ranked ? index + 1 : 1,
			created_at: now,
		}));

		for (const row of rows) await this.repository.upsertVote(row);
		return rows;
	}

	async addCustomAnswer(input: AddCustomPollAnswerInput): Promise<PollAnswerRow> {
		const poll = await this.repository.findPoll(input.channelId, input.messageId);
		if (!poll) throw new Error('Poll not found');
		if (poll.closed_at || poll.closes_at.getTime() <= Date.now()) throw new Error('Poll is closed');
		if (!poll.allow_custom_answers) throw new Error('Custom answers are disabled for this poll');

		const text = input.text.trim();
		if (!text && !input.attachmentId) throw new Error('A custom answer must contain text or an image');

		const answers = await this.repository.findAnswers(input.channelId, input.messageId);
		if (answers.length >= 10) throw new Error('Poll has reached the maximum number of answers');

		const nextAnswerId = answers.reduce((max, answer) => Math.max(max, answer.answer_id), 0) + 1;
		const row: PollAnswerRow = {
			channel_id: input.channelId,
			message_id: input.messageId,
			answer_id: nextAnswerId,
			text,
			attachment_id: input.attachmentId ?? null,
			creator_id: input.userId,
			is_custom: true,
			created_at: new Date(),
		};

		await this.repository.addCustomAnswer(row);
		return row;
	}
}
