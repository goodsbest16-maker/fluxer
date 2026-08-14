// SPDX-License-Identifier: AGPL-3.0-or-later

import type {PollResponse} from '@fluxer/schema/src/domains/message/PollSchemas';
import type {ChannelID, MessageID, UserID} from '../BrandedTypes';
import {PollRepository} from './PollRepository';

export class PollResponseService {
	constructor(private readonly repository = new PollRepository()) {}

	async buildPollResponse(
		channelId: ChannelID,
		messageId: MessageID,
		viewerUserId: UserID | null,
	): Promise<PollResponse | null> {
		const poll = await this.repository.findPoll(channelId, messageId);
		if (!poll) return null;

		const [answers, votes] = await Promise.all([
			this.repository.findAnswers(channelId, messageId),
			this.repository.findVotes(channelId, messageId),
		]);

		const voteCounts = new Map<number, number>();
		for (const vote of votes) {
			voteCounts.set(vote.answer_id, (voteCounts.get(vote.answer_id) ?? 0) + 1);
		}

		const myVotes = viewerUserId
			? votes
					.filter((vote) => vote.user_id === viewerUserId)
					.sort((a, b) => a.rank - b.rank)
			: [];

		const closesAt = poll.closes_at ?? null;
		const closed = poll.closed_at != null || (closesAt != null && closesAt.getTime() <= Date.now());

		return {
			question: poll.question,
			answers: answers
				.slice()
				.sort((a, b) => a.answer_id - b.answer_id)
				.map((answer) => ({
					id: answer.answer_id,
					text: answer.text,
					attachment_id: answer.attachment_id,
					vote_count: voteCounts.get(answer.answer_id) ?? 0,
					custom: answer.is_custom,
				})),
			closes_at: closesAt?.toISOString() ?? null,
			closed,
			ranked: poll.ranked,
			anonymous: poll.anonymous,
			allow_custom_answers: poll.allow_custom_answers,
			total_votes: votes.length,
			my_answer_ids: myVotes.map((vote) => vote.answer_id),
		};
	}
}
