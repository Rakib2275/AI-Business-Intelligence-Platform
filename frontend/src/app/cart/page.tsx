"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShoppingCart, Trash2 } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import {
	cartUpdatedEvent,
	getCartProductIds,
	removeCartProduct,
} from "@/lib/cart";
import { demoProducts } from "@/lib/demo-products";
import type { Product } from "@/lib/types";

export default function CartPage() {
	const [cartProductIds, setCartProductIds] = useState<string[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const syncCart = useCallback(() => {
		try {
			setCartProductIds(getCartProductIds());
		} catch (caught) {
			console.error("Could not load the saved cart:", caught);
			setError(
				"Your cart could not be loaded. Please clear your browser's saved cart and try again.",
			);
		}
	}, []);

	useEffect(() => {
		let active = true;

		syncCart();
		apiRequest<Product[]>("/products")
			.then(({ data }) => {
				if (active) setProducts(data);
			})
			.catch((caught: unknown) => {
				if (!active) return;
				console.error("Cart product details failed to load:", caught);
				setError(
					caught instanceof ApiError
						? caught.message
						: "Product details could not be loaded right now.",
				);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		window.addEventListener("storage", syncCart);
		window.addEventListener(cartUpdatedEvent, syncCart);
		return () => {
			active = false;
			window.removeEventListener("storage", syncCart);
			window.removeEventListener(cartUpdatedEvent, syncCart);
		};
	}, [syncCart]);

	const cartProducts = useMemo(() => {
		const catalog = new Map(
			[...products, ...demoProducts].map((product) => [product.id, product]),
		);
		return cartProductIds.map((id) => catalog.get(id) ?? null);
	}, [cartProductIds, products]);
	const total = cartProducts.reduce(
		(sum, product) => sum + (product ? Number(product.price) : 0),
		0,
	);

	const removeItem = (productId: string) => {
		try {
			setCartProductIds(removeCartProduct(productId));
		} catch (caught) {
			console.error("Could not remove product from cart:", caught);
			setError("This item could not be removed from your cart.");
		}
	};

	return (
		<div className="product-details-page">
			<header className="topbar public-customer-navbar">
				<div className="breadcrumb">
					<strong className="product-details-brand">Noviq</strong>
					<Link href="/">Home</Link>
					<span className="crumb-slash">/</span>
					<strong>Your cart</strong>
				</div>
				<Link className="product-details-back" href="/">
					<ArrowLeft size={15} /> Back to products
				</Link>
			</header>

			<main className="cart-main">
				<div className="cart-heading">
					<span className="checkout-lock">
						<ShoppingCart size={18} />
					</span>
					<div>
						<p>YOUR SELECTION</p>
						<h1>Your cart</h1>
					</div>
				</div>
				{error && (
					<p className="checkout-error" role="alert">
						{error}
					</p>
				)}
				{loading ? (
					<p className="public-products-message" role="status">
						Loading your cart…
					</p>
				) : cartProductIds.length === 0 ? (
					<section className="cart-empty">
						<ShoppingCart size={28} />
						<h2>Your cart is empty</h2>
						<p>Browse the store and add products you would like to buy.</p>
						<Link className="button button-primary" href="/">
							Explore products <ArrowUpRight size={16} />
						</Link>
					</section>
				) : (
					<section className="cart-card" aria-label="Items in your cart">
						<ul className="cart-items">
							{cartProducts.map((product, index) => {
								const productId = cartProductIds[index];
								return (
									<li className="cart-item" key={productId}>
										{product ? (
											<>
												<img src={product.imageUrl} alt="" />
												<div className="cart-item-details">
													<strong>{product.name}</strong>
													<span>{product.title}</span>
													<strong className="cart-item-price">
														৳{" "}
														{Number(product.price).toLocaleString("en-BD", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</strong>
													{productId.startsWith("demo-") && (
														<small>
															Sample product — checkout is not available.
														</small>
													)}
												</div>
												<div className="cart-item-actions">
													{!productId.startsWith("demo-") && (
														<Link
															className="button button-primary"
															href={`/checkout/${encodeURIComponent(productId)}`}
														>
															Buy Now <ArrowUpRight size={15} />
														</Link>
													)}
													<button
														className="cart-remove-button"
														type="button"
														onClick={() => removeItem(productId)}
													>
														<Trash2 size={15} /> Remove
													</button>
												</div>
											</>
										) : (
											<>
												<div className="cart-item-details">
													<strong>Product unavailable</strong>
													<span>This product is no longer in the store.</span>
												</div>
												<button
													className="cart-remove-button"
													type="button"
													onClick={() => removeItem(productId)}
												>
													<Trash2 size={15} /> Remove
												</button>
											</>
										)}
									</li>
								);
							})}
						</ul>
						<div className="cart-total">
							<span>Cart total</span>
							<strong>
								৳{" "}
								{total.toLocaleString("en-BD", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</strong>
						</div>
						<p className="cart-checkout-note">
							Select Buy Now on an item to choose bKash at secure checkout.
						</p>
					</section>
				)}
			</main>
		</div>
	);
}
