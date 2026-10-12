"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleX } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";

type ReturnState =
	| { status: "loading" }
	| { status: "success" }
	| { status: "cancelled" }
	| { status: "failed"; message: string };

const getQueryValue = (query: URLSearchParams, ...names: string[]) => {
	for (const [key, value] of query.entries()) {
		if (names.some((name) => key.toLowerCase() === name.toLowerCase())) {
			return value.trim();
		}
	}
	return null;
};

export default function PaymentReturnPage() {
	const [result, setResult] = useState<ReturnState>({ status: "loading" });

	useEffect(() => {
		let active = true;
		const completePayment = async () => {
			const query = new URLSearchParams(window.location.search);
			const orderId = getQueryValue(query, "orderId");
			const paymentID = getQueryValue(query, "paymentID", "paymentId");
			const gatewayStatus = getQueryValue(query, "status")?.toLowerCase();

			if (!orderId || !paymentID) {
				const isCancelled =
					gatewayStatus === "cancel" || gatewayStatus === "cancelled";
				if (orderId && isCancelled) {
					try {
						await apiRequest(`/payments/orders/${encodeURIComponent(orderId)}/cancel`, {
							method: "POST",
						});
					} catch (caught) {
						if (!(caught instanceof ApiError && caught.status === 401)) {
							console.error("Could not mark cancelled checkout:", caught);
						}
					}
				}
				if (active) {
					setResult(
						isCancelled
							? { status: "cancelled" }
							: {
									status: "failed",
									message:
										"bKash did not return the payment confirmation details. If money was deducted, contact support with your transaction ID.",
								},
					);
				}
				return;
			}

			try {
				await apiRequest("/payments/bkash/execute", {
					method: "POST",
					body: { orderId, paymentID },
				});
				if (active) setResult({ status: "success" });
			} catch (caught) {
				console.error("Could not confirm bKash payment:", caught);
				if (active) {
					setResult({
						status: "failed",
						message:
							caught instanceof ApiError
								? caught.message
								: "bKash could not confirm your payment.",
					});
				}
			}
		};

		void completePayment();
		return () => {
			active = false;
		};
	}, []);

	const success = result.status === "success";
	const cancelled = result.status === "cancelled";

	return (
		<div className="product-details-page">
			<header className="topbar public-customer-navbar">
				<div className="breadcrumb">
					<strong className="product-details-brand">Noviq</strong>
					<Link href="/">Home</Link>
					<span className="crumb-slash">/</span>
					<strong>Payment status</strong>
				</div>
				<Link className="product-details-back" href="/">
					<ArrowLeft size={15} /> Store
				</Link>
			</header>
			<main className="payment-result-main">
				<section
					className={`payment-result-card ${success ? "payment-result-success" : ""}`}
					aria-live="polite"
				>
					<span className="payment-result-icon">
						{success ? <Check size={25} /> : <CircleX size={25} />}
					</span>
					<p className="checkout-kicker">BKASH PAYMENT</p>
					<h1>
						{result.status === "loading"
							? "Confirming your payment…"
							: success
								? "Payment successful"
								: cancelled
									? "Payment cancelled"
									: "Payment not confirmed"}
					</h1>
					<p>
						{result.status === "loading"
							? "Please wait while we verify the transaction with bKash."
							: success
								? "Your bKash transaction was verified. Thank you for shopping with Noviq."
								: cancelled
									? "No payment was completed. You can return to the store and try again."
									: result.message}
					</p>
					<Link className="button button-primary" href="/">
						<ArrowLeft size={16} /> Return to store
					</Link>
				</section>
			</main>
		</div>
	);
}
