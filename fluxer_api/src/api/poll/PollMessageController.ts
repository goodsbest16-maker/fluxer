// SPDX-License-Identifier: AGPL-3.0-or-later

import {ValidationErrorCodes} from '@fluxer/constants/src/ValidationErrorCodes';
import {InputValidationError} from '@fluxer/errors/src/domains/core/InputValidationError';
import {ChannelIdParam} from '@fluxer/schema/src/domains/common/CommonParamSchemas';
import {MessageRequestSchema} from '@fluxer/schema/src/domains/message/MessageRequestSchemas';
import type {MessageResponse} from '@fluxer/schema/src/domains/message/MessageResponseSchemas';
import {createChannelID} from '../BrandedTypes';
import type {MessageRequest} from '../channel/MessageTypes';
import {normalizeMessageRequestPayload} from '../channel/services/message/MessageRequestCompatibility';
import {parseMultipartMessageData} from '../channel/services/message/MessageRequestParser';
import {LoginRequired} from '../middleware/AuthMiddleware';
import {RateLimitMiddleware} from '../middleware/RateLimitMiddleware';
import {RateLimitConfigs} from '../RateLimitConfig';
import type {HonoApp} from '../types/HonoEnv';
import {parseJsonPreservingLargeIntegers} from '../utils/LosslessJsonParser';
import {Validator} from '../Validator';
import {PollMessagePersistence} from './PollMessagePersistence';

const pollMessagePersistence = new PollMessagePersistence();

/**
 * Handles the normal message-create route before ChannelController so poll
 * sidecar state is persisted against the final message and attachment IDs.
 * The request/response behavior mirrors MessageController's send_message path.
 */
export function PollMessageController(app: HonoApp): void {
	app.post(
		'/channels/:channel_id/messages',
		RateLimitMiddleware(RateLimitConfigs.CHANNEL_MESSAGE_CREATE),
		LoginRequired,
		Validator('param', ChannelIdParam),
		async (ctx) => {
			const user = ctx.get('user');
			const channelId = createChannelID(ctx.req.valid('param').channel_id);
			const requestCache = ctx.get('requestCache');
			const messageRequestService = ctx.get('messageRequestService');
			const contentType = ctx.req.header('content-type');
			const validatedData = contentType?.includes('multipart/form-data')
				? ((await parseMultipartMessageData(ctx, user, channelId, MessageRequestSchema)) as MessageRequest)
				: await (async () => {
						let data: unknown;
						try {
							const raw = await ctx.req.text();
							data = raw.trim().length === 0 ? {} : parseJsonPreservingLargeIntegers(raw);
						} catch {
							throw InputValidationError.fromCode('message_data', ValidationErrorCodes.INVALID_MESSAGE_DATA);
						}
						const validationResult = MessageRequestSchema.safeParse(normalizeMessageRequestPayload(data));
						if (!validationResult.success) {
							throw InputValidationError.fromCode('message_data', ValidationErrorCodes.INVALID_MESSAGE_DATA);
						}
						return validationResult.data as MessageRequest;
					})();

			const response = (await messageRequestService.sendMessage({
				user,
				channelId,
				data: validatedData,
				requestCache,
			})) as MessageResponse;

			await pollMessagePersistence.persistCreatedMessagePoll({
				channelId,
				creatorId: user.id,
				request: validatedData,
				response,
			});

			return ctx.json(response);
		},
	);
}
