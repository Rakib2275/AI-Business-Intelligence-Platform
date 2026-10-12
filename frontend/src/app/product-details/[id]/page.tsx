"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	ArrowUpRight,
	Check,
	MapPin,
	ShoppingCart,
	Tag,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import { addCartProduct, getCartProductIds } from "@/lib/cart";
import { demoProducts } from "@/lib/demo-products";
import type { Product } from "@/lib/types";

export default function ProductDetailsPage() {
	const params = useParams<{ id: string }>();
	const [product, setProduct] = useState<Product | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [cartMessage, setCartMessage] = useState("");
	const [cartCount, setCartCount] = useState(0);

	useEffect(() => {
		const syncCart = () => {
			try {
				setCartCount(getCartProductIds().length);
			} catch (caught) {
				console.error("Could not load the saved cart:", caught);
			}
		};

		syncCart();
		window.addEventListener("storage", syncCart);
		window.addEventListener("noviq:cart-updated", syncCart);
		return () => {
			window.removeEventListener("storage", syncCart);
			window.removeEventListener("noviq:cart-updated", syncCart);
		};
	}, []);

	const addToCart = () => {
		if (!product) return;
		try {
			setCartCount(addCartProduct(product.id).length);
			setCartMessage("Added to cart");
			window.setTimeout(() => setCartMessage(""), 2500);
		} catch (caught) {
			console.error("Could not add product to cart:", caught);
			setCartMessage("Could not add this product to your cart.");
		}
	};

	useEffect(() => {
		let active = true;
		const demoProduct = demoProducts.find((item) => item.id === params.id);

		if (demoProduct) {
			setProduct(demoProduct);
			setLoading(false);
			return () => {
				active = false;
			};
		}

		apiRequest<Product[]>("/products")
			.then(({ data }) => {
				if (!active) return;
				const foundProduct = data.find((item) => item.id === params.id);
				if (foundProduct) {
					setProduct(foundProduct);
				} else {
					setError("This product could not be found.");
				}
			})
			.catch((caught: unknown) => {
				if (!active) return;
				console.error("Product details failed to load:", caught);
				setError(
					caught instanceof ApiError
						? caught.message
						: "Product details could not be loaded right now.",
				);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [params.id]);

	return (
		<div className="product-details-page">
			<header className="topbar public-customer-navbar">
				<div className="breadcrumb">
					<strong className="product-details-brand">Noviq</strong>
					<Link href="/">Home</Link>
					<span className="crumb-slash">/</span>
					<strong>Product details</strong>
				</div>
				<Link className="product-details-back" href="/">
					<ArrowLeft size={15} /> Back to products
				</Link>
				<Link className="product-details-cart-link" href="/cart">
					<ShoppingCart size={16} /> Cart <span>{cartCount}</span>
				</Link>
			</header>

			<main className="product-details-main">
				{loading ? (
					<p className="public-products-message" role="status">
						Loading product details…
					</p>
				) : error || !product ? (
					<div className="product-details-state" role="alert">
						<h1>Product unavailable</h1>
						<p>{error || "This product could not be found."}</p>
						<Link className="button button-primary" href="/">
							<ArrowLeft size={15} /> Back to products
						</Link>
					</div>
				) : (
					<article className="product-details-card">
						<div className="product-details-image">
							<img src={product.imageUrl} alt={product.name} />
							{product.id.startsWith("demo-") && (
								<span className="public-product-sample">Sample product</span>
							)}
						</div>
						<div className="product-details-content">
							<Link className="product-details-back-inline" href="/">
								<ArrowLeft size={15} /> Back to all products
							</Link>
							<p className="product-details-title">{product.title}</p>
							<h1>{product.name}</h1>
							<strong className="product-details-price">
								৳{" "}
								{Number(product.price).toLocaleString("en-BD", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</strong>
							<p className="product-details-description">
								{product.description}
							</p>
							<div className="product-details-facts">
								<div>
									<Tag size={17} />
									<span>
										<small>Brand</small>
										<strong>{product.brand || "Not specified"}</strong>
									</span>
								</div>
								<div>
									<MapPin size={17} />
									<span>
										<small>Location</small>
										<strong>{product.location || "Not specified"}</strong>
									</span>
								</div>
								<div>
									<ArrowUpRight size={17} />
									<span>
										<small>Added</small>
										<strong>
											{new Date(product.createdAt).toLocaleDateString("en-BD", {
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
										</strong>
									</span>
								</div>
							</div>
							<div className="product-details-actions">
								<button
									className="button button-secondary"
									type="button"
									onClick={addToCart}
								>
									{cartMessage === "Added to cart" ? (
										<Check size={17} />
									) : (
										<ShoppingCart size={17} />
									)}
									{cartMessage === "Added to cart" ? "Added to cart" : "Add to Cart"}
								</button>
								<Link
									className="button button-primary"
									href={`/checkout/${product.id}`}
								>
									Buy Now <ArrowUpRight size={17} />
								</Link>
							</div>
							{cartMessage && cartMessage !== "Added to cart" && (
								<p className="product-cart-error" role="alert">
									{cartMessage}
								</p>
							)}
						</div>
					</article>
				)}
			</main>
		</div>
	);
}
