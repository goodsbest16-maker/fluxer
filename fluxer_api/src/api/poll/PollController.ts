// SPDX-License-Identifier: AGPL-3.0-or-later

import {ChannelIdMessageIdParam} from '@fluxer/schema/src/domains/common/CommonParamSchemas';
import {PollCustomAnswerRequest, PollVoteRequest} from '@fluxer/schema/src/domains/message/PollSchemas';
import {createChannelID, createMessageID} from '../BrandedTypes';
import {LoginRequired} from '../middleware/AuthMiddleware';
import {OpenAPI} from '../middleware/ResponseTypeMiddleware';
import type {HonoApp} from '../types/HonoEnv';
import {Validator} from '../Validator';
import {PollService} from './PollService';

const pollService = new PollService();

export function PollController(app: HonoApp) {
	app.post(
		'/channels/:channel_id/messages/:message_id/poll/votes/@me',
		LoginRequired,
		Validator('param', ChannelIdMessageIdParam),
		Validator('json', PollVoteRequest),
		OpenAPI({
			operationId: 'submit_poll_vote',
			summary: 'Submit a vote to a poll',
			description: 'Submits the current user vote. For ranked polls, answer_ids are ordered by preference.',
			responseSchema: null,
			statusCode: 204,
			security: ['botToken', 'bearerToken', 'sessionToken'],
			tags: 'Channels',
		}),
		async (ctx) => {
			const {channel_id, message_id} = ctx.req.valid('param');
			const {answer_ids} = ctx.req.valid('json');
			await pollService.submitVote({
				channelId: createChannelID(channel_id),
				messageId: createMessageID(message_id),
				userId: ctx.get('user').id,
				answerIds: answer_ids,
			});
			return ctx.body(null, 204);
		},
	);

	app.post(
		'/channels/:channel_id/messages/:message_id/poll/answers',
		LoginRequired,
		Validator('param', ChannelIdMessageIdParam),
		Validator('json', PollCustomAnswerRequest),
		OpenAPI({
			operationId: 'add_custom_poll_answer',
			summary: 'Add a custom answer to a poll',
			description: 'Adds a user-created answer when the poll allows custom answers.',
			responseSchema: null,
			statusCode: 204,
			security: ['botToken', 'bearerToken', 'sessionToken'],
			tags: 'Channels',
		}),
		async (ctx) => {
			const {channel_id, message_id} = ctx.req.valid('param');
			const {text, attachment_id} = ctx.req.valid('json');
			await pollService.addCustomAnswer({
				channelId: createChannelID(channel_id),
				messageId: createMessageID(message_id),
				userId: ctx.get('user').id,
				text,
				attachmentId: attachment_id == null ? null : String(attachment_id),
			});
			return ctx.body(null, 204);
		},
	);
}
