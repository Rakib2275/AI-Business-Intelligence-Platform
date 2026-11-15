"use client";

import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { ErrorNotice, LoadingBlock, PageHeading } from "@/components/ui";

type SellerSale = {
	id: string;
	amount: number | string;
	currency: string;
	status: string;
	paidAt: string | null;
	createdAt: string;
	product: { id: string; name: string; title: string };
};

const formatCurrency = (amount: number | string, currency: string) =>
	new Intl.NumberFormat(undefined, {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number(amount));

export default function SellerSalesPage() {
	const [sales, setSales] = useState<SellerSale[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		apiRequest<SellerSale[]>("/seller/sales")
			.then((response) => {
				if (active) setSales(response.data);
			})
			.catch((caught: unknown) => {
				if (active) {
					setError(
						caught instanceof ApiError
							? caught.message
							: "Your sales could not be loaded.",
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
				title="Your sales"
				description="Review orders for your products and their payment status."
			/>
			{error && <ErrorNotice message={error} />}
			{loading ? (
				<LoadingBlock label="Loading your sales" />
			) : sales.length ? (
				<section className="panel seller-list-panel">
					<div className="seller-table-scroll">
						<table className="seller-table">
							<thead>
								<tr>
									<th>Product</th>
									<th>Order date</th>
									<th>Paid date</th>
									<th>Status</th>
									<th>Amount</th>
								</tr>
							</thead>
							<tbody>
								{sales.map((sale) => (
									<tr key={sale.id}>
										<td>
											<div className="seller-sale-product">
												<strong>{sale.product.name}</strong>
												<small>{sale.product.title}</small>
											</div>
										</td>
										<td>{new Date(sale.createdAt).toLocaleDateString()}</td>
										<td>
											{sale.paidAt
												? new Date(sale.paidAt).toLocaleDateString()
												: "—"}
										</td>
										<td>
											<span className={`status-pill ${sale.status === "PAID" ? "status-good" : "status-neutral"}`}>
												{sale.status}
											</span>
										</td>
										<td className="seller-sale-amount">
											{formatCurrency(sale.amount, sale.currency)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : (
				<section className="panel panel-empty">
					<div className="empty-state">
						<h3>No sales yet</h3>
						<p>Orders for your products will appear here.</p>
					</div>
				</section>
			)}
		</>
	);
}
