"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	ArrowRight,
	ArrowUpRight,
	BarChart3,
	Database,
	LayoutDashboard,
	LogOut,
	MessageSquareText,
	Search,
	ShoppingCart,
	Sparkles,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import { demoProducts } from "@/lib/demo-products";
import type { Product, User } from "@/lib/types";
import { AccountMenu } from "@/components/account-menu";

const capabilities = [
	{
		icon: Database,
		label: "Connect your data",
		description: "Bring your business information together in one workspace.",
	},
	{
		icon: MessageSquareText,
		label: "Ask better questions",
		description: "Explore your data in plain language with an AI analyst.",
	},
	{
		icon: BarChart3,
		label: "Share clear insights",
		description: "Turn answers into dashboards your whole team can use.",
	},
];

export default function HomePage() {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [sessionLoading, setSessionLoading] = useState(true);
	const [products, setProducts] = useState<Product[]>([]);
	const [productsLoading, setProductsLoading] = useState(true);
	const [productsError, setProductsError] = useState("");
	const [productSearch, setProductSearch] = useState("");
	const [minimumPrice, setMinimumPrice] = useState("");
	const [maximumPrice, setMaximumPrice] = useState("");
	const [selectedBrand, setSelectedBrand] = useState("");
	const [selectedLocation, setSelectedLocation] = useState("");
	const [loggingOut, setLoggingOut] = useState(false);
	const [logoutError, setLogoutError] = useState("");
	const [cartProductIds, setCartProductIds] = useState<string[]>([]);
	const [cartOpen, setCartOpen] = useState(false);
	const [cartError, setCartError] = useState("");
	const isAuthenticated = currentUser !== null;
	const showAdminDashboard = isAuthenticated && currentUser?.role !== "COUSTOMER";
	const catalogProducts =
		!productsLoading && !productsError && products.length === 0
			? demoProducts
			: products;
	const brands = [
		...new Set(catalogProducts.map((product) => product.brand).filter(Boolean)),
	].sort((first, second) => first.localeCompare(second));
	const locations = [
		...new Set(catalogProducts.map((product) => product.location).filter(Boolean)),
	].sort((first, second) => first.localeCompare(second));

	const filteredProducts = catalogProducts.filter((product) => {
		const search = productSearch.trim().toLowerCase();
		const searchableText =
			`${product.name} ${product.title} ${product.description} ${product.brand} ${product.location}`.toLowerCase();
		const price = Number(product.price);

		return (
			(!search || searchableText.includes(search)) &&
			(!selectedBrand || product.brand === selectedBrand) &&
			(!selectedLocation || product.location === selectedLocation) &&
			(minimumPrice === "" || price >= Number(minimumPrice)) &&
			(maximumPrice === "" || price <= Number(maximumPrice))
		);
	});

	const productFilters = (
		<div className="customer-product-filters">
			<label className="customer-filter-field">
				<span>Brand</span>
				<select
					value={selectedBrand}
					onChange={(event) => setSelectedBrand(event.target.value)}
				>
					<option value="">All brands</option>
					{brands.map((brand) => (
						<option key={brand} value={brand}>
							{brand}
						</option>
					))}
				</select>
			</label>
			<label className="customer-filter-field">
				<span>Location</span>
				<select
					value={selectedLocation}
					onChange={(event) => setSelectedLocation(event.target.value)}
				>
					<option value="">All locations</option>
					{locations.map((location) => (
						<option key={location} value={location}>
							{location}
						</option>
					))}
				</select>
			</label>
			<div className="customer-filter-field">
				<span>Price range (৳)</span>
				<div className="customer-price-range">
					<input
						type="number"
						min="0"
						placeholder="Min"
						aria-label="Minimum product price"
						value={minimumPrice}
						onChange={(event) => setMinimumPrice(event.target.value)}
					/>
					<input
						type="number"
						min="0"
						placeholder="Max"
						aria-label="Maximum product price"
						value={maximumPrice}
						onChange={(event) => setMaximumPrice(event.target.value)}
					/>
				</div>
			</div>
			{(productSearch ||
				selectedBrand ||
				selectedLocation ||
				minimumPrice ||
				maximumPrice) && (
				<button
					className="customer-filter-reset"
					type="button"
					onClick={() => {
						setProductSearch("");
						setSelectedBrand("");
						setSelectedLocation("");
						setMinimumPrice("");
						setMaximumPrice("");
					}}
				>
					Clear filters
				</button>
			)}
		</div>
	);

	const handleLogout = async () => {
		setLogoutError("");
		setLoggingOut(true);
		try {
			await apiRequest("/auth/logout", { method: "POST" });
			window.location.assign("/login");
		} catch (error) {
			console.error("Customer sign out failed:", error);
			setLogoutError(
				error instanceof ApiError
					? error.message
					: "Sign out failed. Please try again.",
			);
			setLoggingOut(false);
		}
	};

	useEffect(() => {
		let active = true;
		apiRequest<User>("/auth/me")
			.then(({ data: user }) => {
				if (active) setCurrentUser(user);
			})
			.catch((error: unknown) => {
				if (
					active &&
					(!(error instanceof ApiError) || error.status !== 401)
				) {
					console.error("Session check failed:", error);
				}
			})
			.finally(() => {
				if (active) setSessionLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		let active = true;
		apiRequest<Product[]>("/products")
			.then(({ data }) => {
				if (active) setProducts(data);
			})
			.catch((error: unknown) => {
				if (active) {
					console.error("Product catalog failed to load:", error);
					setProductsError("Products could not be loaded right now.");
				}
			})
			.finally(() => {
				if (active) setProductsLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const syncCart = () => {
			try {
				const savedCart: unknown = JSON.parse(
					window.localStorage.getItem("noviq:cart") ?? "[]",
				);
				if (!Array.isArray(savedCart)) {
					throw new TypeError("Saved cart must be an array.");
				}
				setCartProductIds(
					[...new Set(savedCart.filter((item): item is string => typeof item === "string"))],
				);
				setCartError("");
			} catch (error) {
				console.error("Could not load the saved cart:", error);
				setCartError("Your cart could not be loaded.");
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

	return (
		<div
			className={`public-home ${isAuthenticated ? "public-home-customer" : ""}`}
		>
			{isAuthenticated && (
				<aside className="public-customer-sidebar">
					<div className="nav-label">WORKSPACE</div>
					<nav className="main-nav" aria-label="Customer navigation">
						<Link
							className="nav-link"
							href="/dashboard"
							aria-label="Open dashboard"
						>
							<LayoutDashboard size={18} strokeWidth={1.8} />
							<span>Dashboard</span>
						</Link>
					</nav>
					<div className="customer-filter-heading">FILTER PRODUCTS</div>
					{productFilters}
					<div className="sidebar-spacer" />
					<div className="sidebar-footer">
						<Link className="sidebar-profile-link" href="/profile">
							<span className="user-avatar">
								{currentUser.imageUrl ? (
									<img src={currentUser.imageUrl} alt="" />
								) : (
									currentUser.name.trim().charAt(0).toUpperCase()
								)}
							</span>
							<span className="user-copy">
								<strong>{currentUser.name}</strong>
								<small>{currentUser.role.replaceAll("_", " ")}</small>
							</span>
						</Link>
						<button
							className="icon-button logout-button"
							type="button"
							title="Sign out"
							aria-label="Sign out"
							disabled={loggingOut}
							onClick={() => void handleLogout()}
						>
							<LogOut size={17} />
						</button>
					</div>
					{logoutError && (
						<p className="sidebar-error" role="alert">
							{logoutError}
						</p>
					)}
				</aside>
			)}
			{isAuthenticated ? (
				<header className="topbar public-customer-navbar">
					<Link className="brand public-customer-brand" href="/" aria-label="Noviq home">
						<span className="brand-mark">
							<Sparkles size={18} />
						</span>
						<span className="brand-name">
							noviq<span>.</span>
						</span>
					</Link>
					<label className="customer-navbar-search">
						<Search size={17} aria-hidden="true" />
						<input
							type="search"
							placeholder="Search products..."
							aria-label="Search products"
							value={productSearch}
							onChange={(event) => setProductSearch(event.target.value)}
						/>
					</label>
					<div className="customer-navbar-actions">
						<div className="customer-cart">
							<button
								className="customer-cart-button"
								type="button"
								aria-label={`Shopping cart, ${cartProductIds.length} items`}
								aria-expanded={cartOpen}
								onClick={() => setCartOpen((open) => !open)}
							>
								<ShoppingCart size={19} />
								<span className="customer-cart-label">Cart</span>
								<span className="customer-cart-count">{cartProductIds.length}</span>
							</button>
							{cartOpen && (
								<div className="customer-cart-popover">
									<strong>Your cart</strong>
									{cartError ? (
										<p role="alert">{cartError}</p>
									) : productsLoading ? (
										<p>Loading your cart...</p>
									) : cartProductIds.length === 0 ? (
										<p>Your cart is empty.</p>
									) : (
										<ul>
											{cartProductIds.map((productId) => {
												const product = catalogProducts.find(
													(item) => item.id === productId,
												);
												return (
													<li key={productId}>
														<span>{product?.name ?? "Product unavailable"}</span>
														{product && (
															<Link href={`/checkout/${encodeURIComponent(product.id)}`}>
																Checkout
															</Link>
														)}
													</li>
												);
											})}
										</ul>
									)}
								</div>
							)}
						</div>
						{currentUser && (
							<AccountMenu
								user={currentUser}
								onLogout={() => void handleLogout()}
								logoutPending={loggingOut}
							/>
						)}
					</div>
				</header>
			) : (
				<header className="public-topbar">
					<Link className="brand public-brand" href="/" aria-label="Noviq home">
						<span className="brand-mark">
							<Sparkles size={18} />
						</span>
						<span className="brand-name">
							noviq<span>.</span>
						</span>
					</Link>
					<nav className="public-nav" aria-label="Main navigation">
						<Link className="public-nav-current" href="/">
							Home
						</Link>
						{showAdminDashboard ? (
							<Link className="button button-primary" href="/dashboard">
								Dashboard <ArrowUpRight size={15} />
							</Link>
						) : (
							<div className="public-auth-links">
								<Link className="button button-quiet" href="/login">
									Log in
								</Link>
								<Link className="button button-primary" href="/register">
									Sign up <ArrowUpRight size={15} />
								</Link>
							</div>
						)}
					</nav>
				</header>
			)}

			<main className={`public-dashboard ${isAuthenticated ? "public-storefront-dashboard" : ""}`}>
				{!isAuthenticated && !sessionLoading && <section className="public-hero">
					<div className="public-hero-copy">
						<div className="eyebrow">
							<span className="eyebrow-dot" /> BUSINESS INTELLIGENCE, IN FOCUS
						</div>
						<h1>
							A clearer view
							<br />
							of your <span>business.</span>
						</h1>
						<p>
							Bring your data into focus. Ask better questions, find the story
							in the numbers, and share what matters.
						</p>
						{!currentUser && <div className="public-hero-actions">
							<Link className="button button-primary" href="/register">
								Get started <ArrowRight size={16} />
							</Link>
							<Link className="button button-secondary" href="/login">
								Log in to your workspace
							</Link>
						</div>}
					</div>
					<div className="public-preview" aria-label="Noviq workspace preview">
						<div className="public-preview-header">
							<div>
								<span className="public-preview-kicker">YOUR WORKSPACE</span>
								<h2>Business overview</h2>
							</div>
							<span className="public-live-badge">
								<span /> INSIGHT-READY
							</span>
						</div>
						<div className="public-preview-question">
							<span className="public-preview-icon">
								<Sparkles size={16} />
							</span>
							<div>
								<small>ASK YOUR DATA</small>
								<strong>What should I know about my business?</strong>
							</div>
							<ArrowRight size={16} />
						</div>
						<div className="public-preview-grid">
							{capabilities.map(({ icon: Icon, label }) => (
								<div className="public-preview-tile" key={label}>
									<Icon size={17} />
									<span>{label}</span>
								</div>
							))}
						</div>
						<div className="public-preview-chart" aria-hidden="true">
							<div className="public-chart-label">
								<span>Clear answers, grounded in your data</span>
								<span>•••</span>
							</div>
							<div className="public-chart-bars">
								{[34, 48, 39, 64, 52, 75, 61, 88, 70, 96, 77, 100].map(
									(height, index) => (
										<i key={index} style={{ height: `${height}%` }} />
									),
								)}
							</div>
						</div>
					</div>
				</section>}

				<section className="public-products" aria-labelledby="public-products-title">
					{isAuthenticated && (
						<div className="customer-mobile-filters">
							<strong>Filter products</strong>
							{productFilters}
						</div>
					)}
					<div className="public-section-heading">
						<div>
							{!isAuthenticated && (
								<div className="eyebrow">FEATURED FOR YOU</div>
							)}
							<h2 id="public-products-title">
								{isAuthenticated ? "Shop products" : "Explore our products."}
							</h2>
						</div>
						<span>
							{filteredProducts.length}{" "}
							{filteredProducts.length === 1 ? "product" : "products"} found
						</span>
					</div>
					{productsLoading ? (
						<p className="public-products-message" role="status">
							Loading products…
						</p>
					) : productsError ? (
						<p className="public-products-message public-products-error" role="alert">
							{productsError}
						</p>
					) : filteredProducts.length ? (
						<div className="public-product-grid">
							{filteredProducts.map((product) => (
								<Link
									className="public-product-card"
									href={`/product-details/${product.id}`}
									key={product.id}
								>
									<div className="public-product-photo">
										<img src={product.imageUrl} alt={product.name} loading="lazy" />
										{product.id.startsWith("demo-") && (
											<span className="public-product-sample">Sample</span>
										)}
									</div>
									<div className="public-product-copy">
										<div className="public-product-title">{product.title}</div>
										<h3>{product.name}</h3>
										<div className="public-product-meta">
											{product.brand && <span>{product.brand}</span>}
											{product.location && <span>{product.location}</span>}
										</div>
										<p>{product.description}</p>
										<strong className="public-product-price">
											৳ {Number(product.price).toLocaleString("en-BD", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</strong>
									</div>
								</Link>
							))}
						</div>
					) : (
						<p className="public-products-message">
							{catalogProducts.length
								? "No products match these filters. Try changing your search or price range."
								: "Our product selection will appear here soon."}
						</p>
					)}
				</section>

				{!isAuthenticated && !sessionLoading && <section className="public-capabilities" aria-label="What you can do">
					<div className="public-section-heading">
						<div>
							<div className="eyebrow">ONE PLACE TO FIND THE SIGNAL</div>
							<h2>Your business, in context.</h2>
						</div>
						<span>Everything you need to move from data to direction.</span>
					</div>
					<div className="public-capability-grid">
						{capabilities.map(({ icon: Icon, label, description }, index) => (
							<article className="public-capability-card" key={label}>
								<div className={`public-capability-icon public-tone-${index}`}>
									<Icon size={18} />
								</div>
								<h3>{label}</h3>
								<p>{description}</p>
							</article>
						))}
					</div>
				</section>}
			</main>

			{!sessionLoading && (
				<footer
					className={`public-footer ${isAuthenticated ? "public-customer-footer" : ""}`}
				>
					<span>
						<Sparkles size={13} /> NOVIQ
					</span>
					<span>
						{isAuthenticated ? (
							<>
								Developed by <strong>Rakib, Asad &amp; Rasel</strong>
							</>
						) : (
							"Your data stays yours"
						)}
					</span>
				</footer>
			)}
		</div>
	);
}
