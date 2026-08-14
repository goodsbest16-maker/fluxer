// SPDX-License-Identifier: AGPL-3.0-or-later

import type {MessageResponse} from '@fluxer/schema/src/domains/message/MessageResponseSchemas';
import type {ChannelID, UserID} from '../BrandedTypes';
import {createMessageID} from '../BrandedTypes';
import type {MessageRequest} from '../channel/MessageTypes';
import {PollRepository} from './PollRepository';

/**
 * Persists the poll sidecar after the normal message has been created.
 *
 * Poll answer image references use the client attachment id from the message
 * request. The final attachment snowflake is resolved from the created message
 * response before persistence so poll data never stores a temporary upload id.
 */
export class PollMessagePersistence {
	constructor(private readonly repository: PollRepository = new PollRepository()) {}

	async persistCreatedMessagePoll(params: {
		channelId: ChannelID;
		creatorId: UserID;
		request: MessageRequest;
		response: MessageResponse;
	}): Promise<void> {
		const poll = params.request.poll;
		if (!poll) return;

		const attachmentIdByClientId = new Map<number, string>();
		const requestAttachments = params.request.attachments ?? [];
		const responseAttachments = params.response.attachments ?? [];

		for (let index = 0; index < requestAttachments.length; index++) {
			const requestAttachment = requestAttachments[index];
			const responseAttachment = responseAttachments[index];
			if (!requestAttachment || !responseAttachment) continue;
			if (typeof requestAttachment.id !== 'number') continue;
			attachmentIdByClientId.set(requestAttachment.id, responseAttachment.id);
		}

		const now = Date.now();
		await this.repository.createPoll({
			channelId: params.channelId,
			messageId: createMessageID(BigInt(params.response.id)),
			creatorId: params.creatorId,
			question: poll.question,
			durationSeconds: poll.duration_seconds,
			closesAt: new Date(now + poll.duration_seconds * 1000),
			ranked: poll.ranked,
			anonymous: poll.anonymous,
			allowCustomAnswers: poll.allow_custom_answers,
			answers: poll.answers.map((answer, index) => ({
				answerId: index + 1,
				text: answer.text,
				attachmentId:
					answer.attachment_id == null ? null : (attachmentIdByClientId.get(answer.attachment_id) ?? null),
			})),
		});
	}
}
