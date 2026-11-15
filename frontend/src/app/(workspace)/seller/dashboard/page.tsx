"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	ArrowRight,
	BarChart3,
	Box,
	PackagePlus,
	Sparkles,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";
import {
	EmptyState,
	ErrorNotice,
	LoadingBlock,
	PageHeading,
} from "@/components/ui";

type SellerSale = {
	id: string;
	amount: number | string;
	currency: string;
	paidAt: string | null;
	product: { id: string; name: string; title: string };
};

type SellerInsight = {
	id: string;
	question: string;
	resultSummary: string | null;
	createdAt: string;
};

type SellerOverview = {
	productCount: number;
	salesCount: number;
	revenue: number;
	recentSales: SellerSale[];
	recentInsights: SellerInsight[];
};

const formatCurrency = (amount: number, currency = "BDT") =>
	new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(amount);

export default function SellerDashboardPage() {
	const [overview, setOverview] = useState<SellerOverview | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		Promise.all([
			apiRequest<SellerOverview>("/seller/dashboard"),
			apiRequest<Product[]>("/seller/products"),
		])
			.then(([dashboardResponse, productResponse]) => {
				if (!active) return;
				setOverview(dashboardResponse.data);
				setProducts(productResponse.data);
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof ApiError
							? caught.message
							: "Seller dashboard could not be loaded.",
					);
				}
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	return (
		<>
			<PageHeading
				eyebrow="SELLER WORKSPACE"
				title="Your business, at a glance."
				description="Review your products, sales, revenue, and latest business insights."
				action={
					<Link className="button button-primary" href="/products/new">
						<PackagePlus size={16} /> Add product
					</Link>
				}
			/>

			{error && <ErrorNotice message={error} />}
			{loading ? (
				<LoadingBlock label="Loading your seller dashboard" />
			) : (
				<>
					<section className="stat-grid" aria-label="Seller business summary">
						<article className="stat-card">
							<div className="stat-icon icon-indigo">
								<Box size={18} />
							</div>
							<div className="stat-label">YOUR PRODUCTS</div>
							<div className="stat-value">{overview?.productCount ?? 0}</div>
							<div className="stat-foot">Products in your catalog</div>
						</article>
						<article className="stat-card">
							<div className="stat-icon icon-mint">
								<BarChart3 size={18} />
							</div>
							<div className="stat-label">PAID SALES</div>
							<div className="stat-value">{overview?.salesCount ?? 0}</div>
							<div className="stat-foot">Completed customer orders</div>
						</article>
						<article className="stat-card seller-revenue-card">
							<div className="stat-icon icon-amber">
								<Sparkles size={18} />
							</div>
							<div className="stat-label">TOTAL REVENUE</div>
							<div className="stat-value">
								{formatCurrency(overview?.revenue ?? 0)}
							</div>
							<div className="stat-foot">From your paid sales</div>
						</article>
					</section>

					<div className="seller-dashboard-grid">
						<section className="panel">
							<div className="panel-heading">
								<div>
									<div className="eyebrow">YOUR CATALOG</div>
									<h2>Products</h2>
								</div>
								<Link className="subtle-link" href="/products/new">
									Add product <ArrowRight size={14} />
								</Link>
							</div>
							{products.length ? (
								<div className="seller-product-list">
									{products.slice(0, 6).map((product) => (
										<div className="seller-product-row" key={product.id}>
											{product.imageUrl ? (
												<img src={product.imageUrl} alt="" />
											) : (
												<span className="seller-product-placeholder">
													<Box size={17} />
												</span>
											)}
											<div>
												<strong>{product.name}</strong>
												<small>{product.brand}</small>
											</div>
											<strong className="seller-product-price">
												{formatCurrency(Number(product.price))}
											</strong>
										</div>
									))}
								</div>
							) : (
								<EmptyState
									title="Your catalog is ready"
									description="Add your first product to start selling."
									action={
										<Link className="button button-secondary" href="/products/new">
											<PackagePlus size={15} /> Add product
										</Link>
									}
								/>
							)}
						</section>

						<section className="panel">
							<div className="panel-heading">
								<div>
									<div className="eyebrow">RECENT ACTIVITY</div>
									<h2>Sales</h2>
								</div>
								<Link className="subtle-link" href="/seller/sales">
									All sales <ArrowRight size={14} />
								</Link>
							</div>
							{overview?.recentSales.length ? (
								<div className="seller-activity-list">
									{overview.recentSales.map((sale) => (
										<div className="seller-activity-row" key={sale.id}>
											<span className="seller-activity-icon">
												<BarChart3 size={15} />
											</span>
											<div>
												<strong>{sale.product.name}</strong>
												<small>
													{sale.paidAt
														? new Date(sale.paidAt).toLocaleDateString()
														: "Recently paid"}
												</small>
											</div>
											<strong className="seller-sale-amount">
												{formatCurrency(Number(sale.amount), sale.currency)}
											</strong>
										</div>
									))}
								</div>
							) : (
								<div className="panel-blank">
									Completed sales will appear here.
								</div>
							)}
						</section>
					</div>

					<section className="panel seller-insights-panel">
						<div className="panel-heading">
							<div>
								<div className="eyebrow">AI BUSINESS ANALYST</div>
								<h2>Your latest insights</h2>
							</div>
							<Link className="subtle-link" href="/conversations">
								Ask your data <ArrowRight size={14} />
							</Link>
						</div>
						{overview?.recentInsights.length ? (
							<div className="seller-insights-list">
								{overview.recentInsights.map((insight) => (
									<article key={insight.id}>
										<span className="seller-insight-icon">
											<Sparkles size={15} />
										</span>
										<div>
											<strong>{insight.question}</strong>
											<p>{insight.resultSummary}</p>
											<small>
												{new Date(insight.createdAt).toLocaleDateString()}
											</small>
										</div>
									</article>
								))}
							</div>
						) : (
							<div className="panel-blank">
								Your saved business analysis will appear here.
							</div>
						)}
					</section>
				</>
			)}
		</>
	);
}
