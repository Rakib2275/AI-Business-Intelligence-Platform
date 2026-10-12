import assert from "node:assert/strict";
import test from "node:test";
import { buildConversationContext } from "./conversation.context.js";

test("conversation context is chronological and bounded to recent messages", () => {
	const messages = Array.from({ length: 14 }, (_, index) => ({
		role: index % 2 ? "ASSISTANT" : "USER",
		content: `message-${index}`,
	})).reverse();
	const context = buildConversationContext(messages);
	assert.equal(context.length, 12);
	assert.equal(context[0]?.content, "message-2");
	assert.equal(context.at(-1)?.content, "message-13");
});

test("conversation context enforces per-message and total character limits", () => {
	const context = buildConversationContext([
		{ role: "ASSISTANT", content: "r".repeat(8_000) },
		{ role: "USER", content: "q".repeat(8_000) },
	]);
	assert.equal(context.length, 2);
	assert.equal(context[0]?.content.length, 4_000);
	assert.equal(context[1]?.content.length, 4_000);
	assert.equal(
		context.reduce((total, message) => total + message.content.length, 0),
		8_000,
	);
});
