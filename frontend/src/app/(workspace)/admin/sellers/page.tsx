"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
	Building2,
	Check,
	Pencil,
	ShieldCheck,
	Store,
	UsersRound,
	UserRound,
	X,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type { User } from "@/lib/types";
import {
	ErrorNotice,
	LoadingBlock,
	Modal,
	PageHeading,
	StatusPill,
} from "@/components/ui";

type Seller = User & {
	status: "ACTIVE" | "BLOCKED" | "DELETED";
	createdAt: string;
};

type SellerDraft = {
	name: string;
	username: string;
	email: string;
	contactNumber: string;
	companyName: string;
	businessType: string;
	businessAddress: string;
};

const emptyDraft: SellerDraft = {
	name: "",
	username: "",
	email: "",
	contactNumber: "",
	companyName: "",
	businessType: "",
	businessAddress: "",
};

const getBusinessProfile = (seller: Seller) => {
	const profile = seller.businessProfile;
	return profile && typeof profile === "object" ? profile : {};
};

export default function SellerManagementPage() {
	const [sellers, setSellers] = useState<Seller[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [createDraft, setCreateDraft] = useState(emptyDraft);
	const [initialPassword, setInitialPassword] = useState("");
	const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
	const [editDraft, setEditDraft] = useState<SellerDraft>(emptyDraft);

	const loadSellers = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const response = await apiRequest<Seller[]>("/admin/sellers");
			setSellers(response.data);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Seller accounts could not be loaded.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadSellers();
	}, [loadSellers]);

	const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await apiRequest<Seller>("/admin/sellers", {
				method: "POST",
				body: {
					name: createDraft.name.trim(),
					username: createDraft.username.trim(),
					email: createDraft.email.trim(),
					initialPassword,
					contactNumber: createDraft.contactNumber.trim() || undefined,
					businessProfile: {
						companyName: createDraft.companyName.trim(),
						businessType: createDraft.businessType.trim(),
						address: createDraft.businessAddress.trim(),
					},
				},
			});
			setCreateDraft(emptyDraft);
			setInitialPassword("");
			setNotice("Seller account created. They must change the initial password after sign-in.");
			await loadSellers();
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Seller account could not be created.",
			);
		} finally {
			setBusy(false);
		}
	};

	const startEditing = (seller: Seller) => {
		const profile = getBusinessProfile(seller);
		setEditingSeller(seller);
		setEditDraft({
			name: seller.name,
			username: seller.username || "",
			email: seller.email,
			contactNumber: seller.contactNumber || "",
			companyName:
				typeof profile.companyName === "string" ? profile.companyName : "",
			businessType:
				typeof profile.businessType === "string" ? profile.businessType : "",
			businessAddress:
				typeof profile.address === "string" ? profile.address : "",
		});
	};

	const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!editingSeller) return;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await apiRequest<Seller>(`/admin/sellers/${editingSeller.id}`, {
				method: "PATCH",
				body: {
					name: editDraft.name.trim(),
					username: editDraft.username.trim(),
					email: editDraft.email.trim(),
					contactNumber: editDraft.contactNumber.trim(),
					businessProfile: {
						...getBusinessProfile(editingSeller),
						companyName: editDraft.companyName.trim(),
						businessType: editDraft.businessType.trim(),
						address: editDraft.businessAddress.trim(),
					},
				},
			});
			setEditingSeller(null);
			setNotice("Seller account updated.");
			await loadSellers();
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Seller account could not be updated.",
			);
		} finally {
			setBusy(false);
		}
	};

	const setSellerStatus = async (seller: Seller) => {
		const nextStatus = seller.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
		setBusy(true);
		setError("");
		setNotice("");
		try {
			if (nextStatus === "BLOCKED") {
				await apiRequest(`/admin/sellers/${seller.id}`, { method: "DELETE" });
			} else {
				await apiRequest(`/admin/sellers/${seller.id}`, {
					method: "PATCH",
					body: { status: nextStatus },
				});
			}
			setNotice(
				nextStatus === "ACTIVE"
					? "Seller account reactivated."
					: "Seller account deactivated.",
			);
			await loadSellers();
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Seller status could not be updated.",
			);
		} finally {
			setBusy(false);
		}
	};

	const renderFields = (
		draft: SellerDraft,
		setDraft: (draft: SellerDraft) => void,
	) => (
		<div className="seller-form-grid">
			<label>
				<span>Seller name</span>
				<input
					value={draft.name}
					placeholder="e.g. Ayesha Rahman"
					onChange={(event) => setDraft({ ...draft, name: event.target.value })}
					minLength={2}
					maxLength={80}
					autoComplete="name"
					required
				/>
			</label>
			<label>
				<span>Username</span>
				<input
					value={draft.username}
					placeholder="e.g. ayesha-store"
					onChange={(event) =>
						setDraft({ ...draft, username: event.target.value })
					}
					minLength={3}
					maxLength={30}
					autoComplete="username"
					required
				/>
			</label>
			<label>
				<span>Email</span>
				<input
					type="email"
					value={draft.email}
					placeholder="seller@company.com"
					onChange={(event) => setDraft({ ...draft, email: event.target.value })}
					autoComplete="email"
					required
				/>
			</label>
			<label>
				<span>Contact number</span>
				<input
					type="tel"
					value={draft.contactNumber}
					placeholder="+880 1XXX-XXXXXX"
					onChange={(event) =>
						setDraft({ ...draft, contactNumber: event.target.value })
					}
					maxLength={30}
					autoComplete="tel"
				/>
			</label>
			<label>
				<span>Business name</span>
				<input
					value={draft.companyName}
					placeholder="Company or store name"
					onChange={(event) =>
						setDraft({ ...draft, companyName: event.target.value })
					}
				/>
			</label>
			<label>
				<span>Business type</span>
				<input
					value={draft.businessType}
					placeholder="e.g. Retail, Fashion"
					onChange={(event) =>
						setDraft({ ...draft, businessType: event.target.value })
					}
				/>
			</label>
			<label className="seller-form-wide">
				<span>Business address</span>
				<input
					value={draft.businessAddress}
					onChange={(event) =>
						setDraft({ ...draft, businessAddress: event.target.value })
					}
				/>
			</label>
		</div>
	);

	return (
		<div className="seller-management">
			<PageHeading
				eyebrow="ADMINISTRATION"
				title="Seller management"
				description="Onboard sellers, maintain their business details, and manage account access."
			/>

			{error && (
				<ErrorNotice message={error} onRetry={() => void loadSellers()} />
			)}
			{notice && (
				<div
					className="profile-picture-message profile-picture-success"
					role="status"
				>
					<Check size={15} /> {notice}
				</div>
			)}

			<section className="panel seller-create-panel">
				<div className="panel-heading seller-create-heading">
					<div className="seller-panel-heading-copy">
						<div className="eyebrow">NEW ACCOUNT</div>
						<h2>Create a seller account</h2>
						<p>Add account credentials and business information for a new seller.</p>
					</div>
					<span className="seller-secure-badge">
						<ShieldCheck size={15} /> Admin managed
					</span>
				</div>
				<form className="seller-create-form" onSubmit={handleCreate}>
					{renderFields(createDraft, setCreateDraft)}
					<div className="seller-create-password">
						<label>
							<span>Initial password</span>
							<input
								type="password"
								autoComplete="new-password"
								placeholder="Choose a temporary password"
								minLength={8}
								maxLength={20}
								value={initialPassword}
								onChange={(event) => setInitialPassword(event.target.value)}
								required
							/>
						</label>
						<p>
							Use 8–20 characters with uppercase, lowercase, a number, and a
							special character. The seller will be asked to change it after
							their first sign-in.
						</p>
					</div>
					<div className="seller-form-actions">
						<button
							className="button button-primary"
							type="submit"
							disabled={busy}
						>
							<UserRound size={15} />
							{busy ? "Creating…" : "Create seller account"}
						</button>
					</div>
				</form>
			</section>

			<section className="panel seller-list-panel">
				<div className="panel-heading">
					<div className="seller-list-heading-copy">
						<div className="eyebrow">SELLER ACCOUNTS</div>
						<h2>All sellers</h2>
						<p>Review seller profiles and account status.</p>
					</div>
					<span className="seller-count">
						<UsersRound size={15} />
						{sellers.length} {sellers.length === 1 ? "seller" : "sellers"}
					</span>
				</div>
				{loading ? (
					<LoadingBlock label="Loading seller accounts" />
				) : sellers.length ? (
					<div className="seller-table-scroll">
						<table className="seller-table">
							<thead>
								<tr>
									<th>Seller</th>
									<th>Username</th>
									<th>Business</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{sellers.map((seller) => {
									const business = getBusinessProfile(seller);
									return (
										<tr key={seller.id}>
											<td>
												<div className="seller-table-identity">
													<span className="seller-table-avatar">
														{seller.name.charAt(0).toUpperCase()}
													</span>
													<span>
														<strong>{seller.name}</strong>
														<small>{seller.email}</small>
													</span>
												</div>
											</td>
											<td>
												<code>{seller.username || "—"}</code>
											</td>
											<td>
												<span className="seller-business-cell">
													<Building2 size={14} />
													{typeof business.companyName === "string" &&
													business.companyName
														? business.companyName
														: "—"}
												</span>
											</td>
											<td>
												<StatusPill status={seller.status} />
											</td>
											<td>
												<div className="seller-row-actions">
													<button
														className="button button-secondary seller-action-button"
														type="button"
														aria-label={`Edit ${seller.name}`}
														disabled={busy}
														onClick={() => startEditing(seller)}
													>
														<Pencil size={14} /> Edit
													</button>
													<button
														className={`button ${seller.status === "ACTIVE" ? "button-danger" : "button-secondary"} seller-action-button`}
														type="button"
														aria-label={`${seller.status === "ACTIVE" ? "Deactivate" : "Reactivate"} ${seller.name}`}
														disabled={busy}
														onClick={() => void setSellerStatus(seller)}
													>
														{seller.status === "ACTIVE" ? (
															<>
																<ShieldCheck size={14} /> Deactivate
															</>
														) : (
															<>
																<Check size={14} /> Reactivate
															</>
														)}
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="panel-blank seller-empty-state">
						<span className="seller-empty-icon">
							<Store size={21} />
						</span>
						<strong>No seller accounts yet</strong>
						<p>Create your first seller account using the form above.</p>
					</div>
				)}
			</section>

			{editingSeller && (
				<Modal
					title="Edit seller"
					description={`Update account and business information for ${editingSeller.name}.`}
					onClose={() => setEditingSeller(null)}
				>
					<form className="seller-edit-form" onSubmit={handleUpdate}>
						{renderFields(editDraft, setEditDraft)}
						<div className="seller-form-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={() => setEditingSeller(null)}
							>
								<X size={15} /> Cancel
							</button>
							<button className="button button-primary" type="submit" disabled={busy}>
								<Check size={15} /> {busy ? "Saving…" : "Save changes"}
							</button>
						</div>
					</form>
				</Modal>
			)}
		</div>
	);
}
