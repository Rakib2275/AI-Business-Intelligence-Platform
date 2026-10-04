type ContextMessage = {
	role: string;
	content: string;
};

const maxMessages = 12;
const maxMessageCharacters = 4_000;
const maxContextCharacters = 12_000;

export const buildConversationContext = (
	newestFirstMessages: ContextMessage[],
): ContextMessage[] => {
	let remainingCharacters = maxContextCharacters;
	const selected: ContextMessage[] = [];

	for (const message of newestFirstMessages.slice(0, maxMessages)) {
		if (!remainingCharacters) break;
		const content = message.content.slice(
			0,
			Math.min(maxMessageCharacters, remainingCharacters),
		);
		if (!content) continue;
		selected.push({ role: message.role, content });
		remainingCharacters -= content.length;
	}

	return selected.reverse();
};
