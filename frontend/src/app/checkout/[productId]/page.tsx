"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import { demoProducts } from "@/lib/demo-products";
import type { Product, User } from "@/lib/types";

type CheckoutResult = {
	orderId: string;
	paymentUrl: string;
};

export default function CheckoutPage() {
	const params = useParams<{ productId: string }>();
	const [product, setProduct] = useState<Product | null>(null);
	const [signedIn, setSignedIn] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		const loadCheckout = async () => {
			const [sessionResult, productResult] = await Promise.allSettled([
				apiRequest<User>("/auth/me"),
				apiRequest<Product[]>("/products"),
			]);
			if (!active) return;

			if (sessionResult.status === "fulfilled") {
				setSignedIn(sessionResult.value.data.role === "COUSTOMER");
			} else if (
				!(sessionResult.reason instanceof ApiError) ||
				sessionResult.reason.status !== 401
			) {
				console.error("Customer session could not be checked:", sessionResult.reason);
				setError("Your account could not be checked. Please try again.");
			}

			const demoProduct = demoProducts.find(
				(item) => item.id === params.productId,
			);
			if (demoProduct) {
				setProduct(demoProduct);
			} else if (productResult.status === "fulfilled") {
				setProduct(
					productResult.value.data.find(
						(item) => item.id === params.productId,
					) ?? null,
				);
			} else {
				console.error("Product could not be loaded for checkout:", productResult.reason);
				setError("Product details could not be loaded right now.");
			}

			setLoading(false);
		};

		void loadCheckout();
		return () => {
			active = false;
		};
	}, [params.productId]);

	const startPayment = async () => {
		if (!product || product.id.startsWith("demo-")) return;
		setBusy(true);
		setError("");
		try {
			const { data } = await apiRequest<CheckoutResult>(
				`/payments/products/${encodeURIComponent(product.id)}/checkout`,
				{ method: "POST" },
			);
			window.location.assign(data.paymentUrl);
		} catch (caught) {
			console.error("Could not start bKash checkout:", caught);
			setError(
				caught instanceof ApiError
					? caught.message
					: "bKash checkout could not be started. Please try again.",
			);
			setBusy(false);
		}
	};

	const loginHref = `/login?next=${encodeURIComponent(`/checkout/${params.productId}`)}`;
	const isSample = product?.id.startsWith("demo-") ?? false;

	return (
		<div className="product-details-page">
			<header className="topbar public-customer-navbar">
				<div className="breadcrumb">
					<strong className="product-details-brand">Noviq</strong>
					<Link href="/">Home</Link>
					<span className="crumb-slash">/</span>
					<strong>Checkout</strong>
				</div>
				<Link className="product-details-back" href="/">
					<ArrowLeft size={15} /> Back to products
				</Link>
			</header>

			<main className="checkout-main">
				{loading ? (
					<p className="public-products-message" role="status">
						Preparing your checkout…
					</p>
				) : !product ? (
					<div className="product-details-state" role="alert">
						<h1>Product unavailable</h1>
						<p>{error || "This product could not be found."}</p>
						<Link className="button button-primary" href="/">
							<ArrowLeft size={15} /> Back to products
						</Link>
					</div>
				) : (
					<section className="checkout-card" aria-labelledby="checkout-title">
						<div className="checkout-heading">
							<span className="checkout-lock">
								<LockKeyhole size={17} />
							</span>
							<div>
								<p>SECURE CHECKOUT</p>
								<h1 id="checkout-title">Complete your purchase</h1>
							</div>
						</div>
						<div className="checkout-product">
							<img src={product.imageUrl} alt="" />
							<div>
								<strong>{product.name}</strong>
								<span>{product.title}</span>
								<small>
									{product.brand} · {product.location}
								</small>
							</div>
							<strong className="checkout-product-price">
								৳
								{Number(product.price).toLocaleString("en-BD", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</strong>
						</div>
						<div className="checkout-total">
							<span>Total</span>
							<strong>
								৳
								{Number(product.price).toLocaleString("en-BD", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</strong>
						</div>
						<p className="checkout-payment-label">Choose a payment method</p>
						<div
							className="checkout-payment-method"
							role="radiogroup"
							aria-label="Choose a payment method"
						>
							<span className="bkash-wordmark">bKash</span>
							<span>
								<strong>Pay with bKash</strong>
								<small>Secure mobile payment</small>
							</span>
							<input
								className="checkout-radio"
								type="radio"
								name="payment-method"
								value="bkash"
								checked
								readOnly
								aria-label="Pay with bKash"
							/>
						</div>
						{isSample ? (
							<p className="checkout-notice">
								This is a sample product. Choose a product listed by the store
								to make a payment.
							</p>
						) : !signedIn ? (
							<div className="checkout-signin">
								<p>Sign in as a customer to continue with bKash.</p>
								<Link className="button button-primary" href={loginHref}>
									Sign in to continue <ArrowUpRight size={16} />
								</Link>
							</div>
						) : (
							<button
								className="button button-primary checkout-submit"
								type="button"
								disabled={busy}
								onClick={() => void startPayment()}
							>
								{busy ? (
									<span className="button-spinner" />
								) : (
									<>
										Continue to bKash <ArrowUpRight size={16} />
									</>
								)}
							</button>
						)}
						{error && (
							<p className="checkout-error" role="alert">
								{error}
							</p>
						)}
						<p className="checkout-footnote">
							You will be redirected to bKash to securely authorize payment.
						</p>
					</section>
				)}
			</main>
		</div>
	);
}
