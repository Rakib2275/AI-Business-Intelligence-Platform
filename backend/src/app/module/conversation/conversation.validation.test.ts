import assert from "node:assert/strict";
import test from "node:test";
import {
	askConversationSchema,
	createMessageSchema,
	conversationIdSchema,
	updateConversationSchema,
} from "./conversation.validation.js";

test("conversation request schemas validate identifiers and messages", () => {
	const id = "79e47a38-27ac-4eb6-8cc5-7ed87c2e0041";
	assert.equal(conversationIdSchema.safeParse({ id }).success, true);
	assert.equal(
		askConversationSchema.safeParse({
			datasetId: id,
			question: "Compare sales to last year.",
		}).success,
		true,
	);
	assert.equal(
		createMessageSchema.safeParse({ content: "  Follow up  " }).success,
		true,
	);
});

test("conversation request schemas reject invalid IDs, empty updates, and oversized input", () => {
	assert.equal(
		conversationIdSchema.safeParse({ id: "conversation-1" }).success,
		false,
	);
	assert.equal(updateConversationSchema.safeParse({}).success, false);
	assert.equal(createMessageSchema.safeParse({ content: " " }).success, false);
	assert.equal(
		askConversationSchema.safeParse({
			datasetId: "79e47a38-27ac-4eb6-8cc5-7ed87c2e0041",
			question: "a".repeat(1001),
		}).success,
		false,
	);
});
