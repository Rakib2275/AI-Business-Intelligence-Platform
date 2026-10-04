"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
} from "react";
import {
	ArrowUp,
	Check,
	Clock3,
	Code2,
	Database,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Sparkles,
	Trash2,
} from "lucide-react";
import { ApiError, apiRequest, jsonRequest } from "@/lib/api";
import type {
	Conversation,
	ConversationMessage,
	Dataset,
	QueryAnswer,
} from "@/lib/types";
import { ResultChart, ResultTable } from "@/components/result-visual";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	PageHeading,
} from "@/components/ui";

function MessageView({
	message,
	answer,
}: {
	message: ConversationMessage;
	answer?: QueryAnswer;
}) {
	if (message.role === "USER") {
		return (
			<div className="chat-message chat-user">
				<div className="chat-avatar user-chat-avatar">Y</div>
				<div className="chat-message-body">
					<span className="chat-author">
						YOU{" "}
						<time>
							{new Date(message.createdAt).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</time>
					</span>
					<div className="user-bubble">{message.content}</div>
				</div>
			</div>
		);
	}
	if (message.messageType === "SQL") {
		return (
			<details className="sql-details">
				<summary>
					<Code2 size={14} /> View validated SQL <span>READ-ONLY</span>
				</summary>
				<pre>
					<code>{message.content}</code>
				</pre>
			</details>
		);
	}
	if (message.messageType === "ERROR") {
		return (
			<div className="chat-message chat-assistant">
				<div className="chat-avatar ai-chat-avatar">
					<Sparkles size={14} />
				</div>
				<div className="chat-message-body">
					<span className="chat-author">NORTHSTAR</span>
					<div className="assistant-bubble assistant-error">
						{message.content}
					</div>
				</div>
			</div>
		);
	}
	if (message.messageType === "INSIGHT") {
		return (
			<div className="chat-message chat-assistant">
				<div className="chat-avatar ai-chat-avatar">
					<Sparkles size={14} />
				</div>
				<div className="chat-message-body">
					<span className="chat-author">
						NORTHSTAR{" "}
						<span className="verified-answer">
							<Check size={11} /> GROUNDED IN YOUR DATA
						</span>
					</span>
					<div className="assistant-bubble">
						<p>{message.content}</p>
						{message.metadata?.analysisAvailable === false && (
							<div className="inline-warning">
								AI analysis wasn’t available. The validated query result is
								still available.
							</div>
						)}
						{answer && (
							<div className="answer-result">
								<div className="result-meta">
									<span>{answer.rows.length} rows returned</span>
									<span>
										{answer.truncated
											? "Results capped at 500"
											: "Validated query"}
									</span>
								</div>
								{answer.chartConfiguration.type !== "TABLE" ? (
									<ResultChart
										rows={answer.rows}
										configuration={answer.chartConfiguration}
									/>
								) : (
									<ResultTable
										rows={answer.rows}
										columns={answer.columns}
										compact
									/>
								)}
								{answer.sql && (
									<details className="sql-details">
										<summary>
											<Code2 size={14} /> View validated SQL{" "}
											<span>READ-ONLY</span>
										</summary>
										<pre>
											<code>{answer.sql}</code>
										</pre>
									</details>
								)}
							</div>
						)}
						{!answer && message.metadata?.resultCount !== undefined && (
							<div className="result-meta">
								<span>
									{message.metadata.resultCount} rows in this saved result
								</span>
								<span>Ask again to refresh rows</span>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className="chat-message chat-assistant">
			<div className="chat-avatar ai-chat-avatar">
				<Sparkles size={14} />
			</div>
			<div className="chat-message-body">
				<span className="chat-author">NORTHSTAR</span>
				<div className="assistant-bubble">{message.content}</div>
			</div>
		</div>
	);
}

export default function ConversationsPage() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [datasets, setDatasets] = useState<Dataset[]>([]);
	const [selectedId, setSelectedId] = useState("");
	const [messages, setMessages] = useState<ConversationMessage[]>([]);
	const [answers, setAnswers] = useState<Record<string, QueryAnswer>>({});
	const [question, setQuestion] = useState("");
	const [datasetId, setDatasetId] = useState("");
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [asking, setAsking] = useState(false);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const loadMessages = useCallback(async (id: string) => {
		setMessagesLoading(true);
		setError("");
		try {
			const response = await apiRequest<Conversation>(`/conversations/${id}`);
			setMessages(response.data.messages ?? []);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Messages could not be loaded.",
			);
		} finally {
			setMessagesLoading(false);
		}
	}, []);

	const loadInitial = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const [conversationResponse, datasetResponse] = await Promise.all([
				apiRequest<Conversation[]>("/conversations?page=1&limit=100"),
				apiRequest<Dataset[]>("/business-data"),
			]);
			setConversations(conversationResponse.data);
			setDatasets(datasetResponse.data);
			const params = new URLSearchParams(window.location.search);
			const requestedConversation = params.get("id");
			const requestedDataset = params.get("dataset");
			if (
				requestedDataset &&
				datasetResponse.data.some((dataset) => dataset.id === requestedDataset)
			) {
				setDatasetId(requestedDataset);
			}
			const firstConversation =
				conversationResponse.data.find(
					(item) => item.id === requestedConversation,
				) ?? conversationResponse.data[0];
			if (firstConversation) setSelectedId(firstConversation.id);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your conversations could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadInitial();
	}, [loadInitial]);

	useEffect(() => {
		if (selectedId) void loadMessages(selectedId);
		else setMessages([]);
	}, [selectedId, loadMessages]);

	useEffect(() => {
		if (messages.length === 0 && !asking) return;
		const timeline = scrollRef.current;
		timeline?.scrollTo({
			top: timeline.scrollHeight,
			behavior: "smooth",
		});
	}, [messages, asking]);

	const filteredConversations = useMemo(() => {
		const normalized = search.trim().toLowerCase();
		return normalized
			? conversations.filter((conversation) =>
					conversation.title?.toLowerCase().includes(normalized),
				)
			: conversations;
	}, [conversations, search]);

	const createConversation = async () => {
		setCreating(true);
		setError("");
		try {
			const response = await jsonRequest<Conversation>(
				"/conversations",
				"POST",
				{ title: "New conversation" },
			);
			setConversations((current) => [response.data, ...current]);
			setMessages([]);
			setSelectedId(response.data.id);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "A conversation could not be created.",
			);
		} finally {
			setCreating(false);
		}
	};

	const deleteConversation = async (id: string) => {
		if (!window.confirm("Delete this conversation and its message history?"))
			return;
		setError("");
		try {
			await apiRequest<null>(`/conversations/${id}`, { method: "DELETE" });
			const remaining = conversations.filter(
				(conversation) => conversation.id !== id,
			);
			setConversations(remaining);
			if (selectedId === id) {
				setSelectedId(remaining[0]?.id ?? "");
				setMessages([]);
			}
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Conversation could not be deleted.",
			);
		}
	};

	const renameConversation = async (conversation: Conversation) => {
		const title = window.prompt(
			"Rename conversation",
			conversation.title ?? "",
		);
		if (title === null || !title.trim() || title.trim() === conversation.title)
			return;
		setError("");
		try {
			const response = await jsonRequest<Conversation>(
				`/conversations/${conversation.id}`,
				"PATCH",
				{ title: title.trim() },
			);
			setConversations((current) =>
				current.map((item) =>
					item.id === conversation.id ? { ...item, ...response.data } : item,
				),
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Conversation could not be renamed.",
			);
		}
	};

	const askQuestion = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selectedId || !datasetId || question.trim().length < 3) return;
		setAsking(true);
		setError("");
		const submittedQuestion = question.trim();
		setQuestion("");
		try {
			const response = await jsonRequest<QueryAnswer>(
				`/conversations/${selectedId}/ask`,
				"POST",
				{
					datasetId,
					question: submittedQuestion,
				},
			);
			setAnswers((current) => ({
				...current,
				[response.data.queryId]: response.data,
			}));
			await loadMessages(selectedId);
			setConversations((current) =>
				current
					.map((conversation) =>
						conversation.id === selectedId
							? {
									...conversation,
									title:
										conversation.title === "New conversation"
											? submittedQuestion.slice(0, 80)
											: conversation.title,
									updatedAt: new Date().toISOString(),
								}
							: conversation,
					)
					.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
			);
		} catch (caught) {
			setQuestion(submittedQuestion);
			setError(
				caught instanceof ApiError
					? caught.message
					: "The question could not be answered.",
			);
		} finally {
			setAsking(false);
		}
	};

	const deleteMessage = async (message: ConversationMessage) => {
		if (!selectedId || !window.confirm("Delete this message?")) return;
		try {
			await apiRequest<null>(
				`/conversations/${selectedId}/messages/${message.id}`,
				{ method: "DELETE" },
			);
			setMessages((current) =>
				current.filter((item) => item.id !== message.id),
			);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Message could not be deleted.",
			);
		}
	};

	const selectedConversation = conversations.find(
		(conversation) => conversation.id === selectedId,
	);

	return (
		<>
			<PageHeading
				eyebrow="CONTEXTUAL BY DESIGN"
				title="Conversations"
				description="Ask a question. Keep the context. Follow the thread wherever it leads."
				action={
					<button
						type="button"
						className="button button-primary"
						onClick={() => void createConversation()}
						disabled={creating}
					>
						<Plus size={16} /> New conversation
					</button>
				}
			/>
			{error && <ErrorNotice message={error} />}
			<div className="conversation-workspace">
				<aside className="conversation-list panel">
					<div className="conversation-list-heading">
						<div>
							<span className="eyebrow">YOUR THREADS</span>
							<span className="conversation-count">{conversations.length}</span>
						</div>
						<button
							className="icon-button"
							type="button"
							aria-label="New conversation"
							onClick={() => void createConversation()}
							disabled={creating}
						>
							<Plus size={17} />
						</button>
					</div>
					<label className="search-field">
						<Search size={15} />
						<input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Find a conversation"
							aria-label="Search conversations"
						/>
					</label>
					{loading ? (
						<LoadingBlock label="Loading threads" />
					) : filteredConversations.length ? (
						<div className="conversation-list-items">
							{filteredConversations.map((conversation) => (
								<div
									className={`conversation-list-item ${selectedId === conversation.id ? "conversation-list-item-active" : ""}`}
									key={conversation.id}
								>
									<button
										type="button"
										className="conversation-select"
										onClick={() => setSelectedId(conversation.id)}
									>
										<span className="thread-icon">
											<Sparkles size={15} />
										</span>
										<span className="thread-copy">
											<strong>
												{conversation.title || "New conversation"}
											</strong>
											<small>
												<Clock3 size={11} />{" "}
												{new Date(conversation.updatedAt).toLocaleDateString()}
											</small>
										</span>
									</button>
									<button
										type="button"
										className="thread-delete thread-rename"
										aria-label={`Rename ${conversation.title ?? "conversation"}`}
										title="Rename conversation"
										onClick={() => void renameConversation(conversation)}
									>
										<Pencil size={13} />
									</button>
									<button
										type="button"
										className="thread-delete"
										aria-label={`Delete ${conversation.title ?? "conversation"}`}
										title="Delete conversation"
										onClick={() => void deleteConversation(conversation.id)}
									>
										<Trash2 size={14} />
									</button>
								</div>
							))}
						</div>
					) : (
						<EmptyState
							title="No conversations yet"
							description="Start a fresh thread to explore your business data."
							action={
								<button
									className="button button-secondary"
									type="button"
									onClick={() => void createConversation()}
								>
									<Plus size={14} /> Start one
								</button>
							}
						/>
					)}
					<div className="conversation-context-note">
						<div className="context-note-icon">
							<Sparkles size={14} />
						</div>
						<span>Context is kept focused on the last 12 messages.</span>
					</div>
				</aside>

				<section className="chat-panel panel">
					{selectedConversation ? (
						<>
							<header className="chat-header">
								<div className="chat-title-icon">
									<Sparkles size={17} />
								</div>
								<div className="chat-title-copy">
									<strong>
										{selectedConversation.title || "New conversation"}
									</strong>
									<small>
										{selectedConversation.status === "ACTIVE"
											? "Context-aware analysis"
											: "Archived conversation"}
									</small>
								</div>
								<div className="chat-header-actions">
									<span className="data-secure">
										<Database size={13} /> Private to you
									</span>
									<button
										type="button"
										className="icon-button"
										title="Delete conversation"
										onClick={() => void deleteConversation(selectedId)}
									>
										<MoreHorizontal size={18} />
									</button>
								</div>
							</header>
							<div className="chat-timeline" ref={scrollRef}>
								<div className="chat-date-label">
									<span /> THREAD HISTORY <span />
								</div>
								{messagesLoading ? (
									<LoadingBlock label="Loading conversation" />
								) : messages.length ? (
									messages.map((message) => (
										<div className="message-row" key={message.id}>
											<MessageView
												message={message}
												answer={
													message.queryId ? answers[message.queryId] : undefined
												}
											/>
											{message.role === "USER" && (
												<button
													type="button"
													className="message-delete"
													title="Delete message"
													onClick={() => void deleteMessage(message)}
												>
													<Trash2 size={12} />
												</button>
											)}
										</div>
									))
								) : (
									<div className="chat-empty">
										<div className="chat-empty-art">
											<span />
											<Sparkles size={26} />
											<span />
										</div>
										<h3>Every good analysis starts somewhere.</h3>
										<p>Choose a dataset below, then ask your first question.</p>
									</div>
								)}
								{asking && (
									<div className="chat-message chat-assistant">
										<div className="chat-avatar ai-chat-avatar">
											<Sparkles size={14} />
										</div>
										<div className="chat-message-body">
											<span className="chat-author">NORTHSTAR</span>
											<div className="typing-bubble">
												<i />
												<i />
												<i />
												<span>Working through your data…</span>
											</div>
										</div>
									</div>
								)}
							</div>
							<div className="composer-wrap">
								{datasets.length ? (
									<form className="chat-composer" onSubmit={askQuestion}>
										<div className="composer-topline">
											<label className="dataset-picker">
												<Database size={14} />
												<select
													aria-label="Choose a dataset"
													value={datasetId}
													onChange={(event) => setDatasetId(event.target.value)}
												>
													<option value="">Choose a dataset</option>
													{datasets.map((dataset) => (
														<option key={dataset.id} value={dataset.id}>
															{dataset.name} · {dataset.rowCount ?? 0} rows
														</option>
													))}
												</select>
											</label>
											<span className="composer-safe">
												<Check size={11} /> Read-only query
											</span>
										</div>
										<textarea
											value={question}
											onChange={(event) => setQuestion(event.target.value)}
											placeholder="Ask a question about your business data…"
											maxLength={1000}
											rows={2}
											aria-label="Your question"
											disabled={
												asking || selectedConversation.status !== "ACTIVE"
											}
											onKeyDown={(event) => {
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													event.currentTarget.form?.requestSubmit();
												}
											}}
										/>
										<div className="composer-bottom">
											<span>
												Follow-ups use the context from this thread <kbd>↵</kbd>{" "}
												send · <kbd>⇧ ↵</kbd> new line
											</span>
											<button
												type="submit"
												className="send-button"
												aria-label="Send question"
												disabled={
													asking || !datasetId || question.trim().length < 3
												}
											>
												<ArrowUp size={17} />
											</button>
										</div>
									</form>
								) : (
									<div className="no-dataset">
										<Database size={16} /> Upload a dataset to start asking
										questions. <a href="/dashboard">Go to overview</a>
									</div>
								)}
							</div>
						</>
					) : (
						<div className="chat-no-selection">
							<EmptyState
								title="Choose a conversation"
								description="Pick a thread on the left, or start a new one to ask your data."
								action={
									<button
										className="button button-primary"
										type="button"
										onClick={() => void createConversation()}
									>
										<Plus size={15} /> New conversation
									</button>
								}
							/>
						</div>
					)}
				</section>
			</div>
			<div className="conversation-footnote">
				<span>
					<Check size={13} /> Queries run read-only against your selected
					dataset
				</span>
				<span>
					<Database size={13} /> Your conversation history is private
				</span>
			</div>
		</>
	);
}
