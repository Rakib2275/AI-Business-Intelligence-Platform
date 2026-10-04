"use client";

import type { ReactNode } from "react";
import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";

export function PageHeading({
	eyebrow,
	title,
	description,
	action,
}: {
	eyebrow?: string;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="page-heading">
			<div>
				{eyebrow && <div className="eyebrow">{eyebrow}</div>}
				<h1>{title}</h1>
				{description && <p>{description}</p>}
			</div>
			{action && <div className="heading-action">{action}</div>}
		</div>
	);
}

export function LoadingBlock({
	label = "Loading your workspace",
}: {
	label?: string;
}) {
	return (
		<div className="loading-block" role="status">
			<LoaderCircle size={20} className="spin" />
			<span>{label}</span>
		</div>
	);
}

export function ErrorNotice({
	message,
	onRetry,
}: {
	message: string;
	onRetry?: () => void;
}) {
	return (
		<div className="notice notice-error" role="alert">
			<AlertCircle size={18} />
			<span>{message}</span>
			{onRetry && (
				<button type="button" className="text-button" onClick={onRetry}>
					Try again
				</button>
			)}
		</div>
	);
}

export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="empty-state">
			<span className="empty-icon">
				<SearchX size={22} />
			</span>
			<h3>{title}</h3>
			<p>{description}</p>
			{action}
		</div>
	);
}

export function StatusPill({ status }: { status: string }) {
	const tone =
		status === "SUCCESS" || status === "ACTIVE"
			? "status-good"
			: status === "FAILURE" || status === "FAILED" || status === "REJECTED"
				? "status-bad"
				: "status-neutral";
	return (
		<span className={`status-pill ${tone}`}>{status.replaceAll("_", " ")}</span>
	);
}

export function Modal({
	title,
	description,
	onClose,
	children,
}: {
	title: string;
	description?: string;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<div className="modal-backdrop">
			<button
				type="button"
				className="modal-backdrop-scrim"
				aria-label="Close dialog"
				onClick={onClose}
			/>
			<section
				className="modal-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				onKeyDown={(event) => {
					if (event.key === "Escape") onClose();
				}}
			>
				<header className="modal-heading">
					<div>
						<h2 id="modal-title">{title}</h2>
						{description && <p>{description}</p>}
					</div>
					<button
						className="icon-button"
						type="button"
						aria-label="Close dialog"
						onClick={onClose}
					>
						×
					</button>
				</header>
				{children}
			</section>
		</div>
	);
}
