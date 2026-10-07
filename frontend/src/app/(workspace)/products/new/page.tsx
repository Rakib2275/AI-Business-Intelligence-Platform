"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Product } from "@/lib/types";
import { PageHeading } from "@/components/ui";

const acceptedPhotoTypes = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
];
const maxPhotoSize = 10 * 1024 * 1024;

export default function AddProductPage() {
	const { user } = useSession();
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [brand, setBrand] = useState("");
	const [location, setLocation] = useState("");
	const [price, setPrice] = useState("");
	const [photo, setPhoto] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [saving, setSaving] = useState(false);
	const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

	useEffect(() => {
		if (!isAdmin) router.replace("/dashboard");
	}, [isAdmin, router]);

	useEffect(() => {
		if (!photo) {
			setPreviewUrl("");
			return;
		}
		const objectUrl = URL.createObjectURL(photo);
		setPreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [photo]);

	const handlePhotoChange = (selectedPhoto: File | undefined) => {
		setError("");
		setSuccess("");
		if (!selectedPhoto) return;
		if (!acceptedPhotoTypes.includes(selectedPhoto.type)) {
			setPhoto(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			setError("Choose a JPEG, PNG, WebP, GIF, or AVIF image.");
			return;
		}
		if (selectedPhoto.size > maxPhotoSize) {
			setPhoto(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
			setError("Product photos must be 10 MB or smaller.");
			return;
		}
		setPhoto(selectedPhoto);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setSuccess("");
		if (!photo) {
			setError("Choose a product photo before adding the product.");
			return;
		}

		setSaving(true);
		const formData = new FormData();
		formData.append("name", name);
		formData.append("title", title);
		formData.append("description", description);
		formData.append("brand", brand);
		formData.append("location", location);
		formData.append("price", price);
		formData.append("photo", photo);

		try {
			const response = await apiRequest<Product>("/products", {
				method: "POST",
				body: formData,
			});
			setSuccess(`${response.data.name} was added to the product catalog.`);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "The product could not be added. Please try again.",
			);
		} finally {
			setSaving(false);
		}
	};

	const resetForm = () => {
		setName("");
		setTitle("");
		setDescription("");
		setBrand("");
		setLocation("");
		setPrice("");
		setPhoto(null);
		setSuccess("");
		setError("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	if (!isAdmin) return null;

	return (
		<>
			<PageHeading
				eyebrow="PRODUCT CATALOG"
				title="Add a product"
				description="Add a product and its photo to the public catalog."
				action={
					<Link className="button button-secondary" href="/dashboard">
						<ArrowLeft size={15} /> Back to dashboard
					</Link>
				}
			/>

			<form className="add-product-form panel" onSubmit={handleSubmit}>
				<div className="add-product-fields">
					<label>
						<span>Product name</span>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={150}
							required
						/>
					</label>
					<label>
						<span>Product title</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							maxLength={180}
							required
						/>
					</label>
					<label>
						<span>Brand</span>
						<input
							value={brand}
							onChange={(event) => setBrand(event.target.value)}
							maxLength={120}
							required
						/>
					</label>
					<label>
						<span>Location</span>
						<input
							value={location}
							onChange={(event) => setLocation(event.target.value)}
							maxLength={180}
							required
						/>
					</label>
					<label>
						<span>Price (৳)</span>
						<input
							type="number"
							min="0"
							max="9999999999.99"
							step="0.01"
							value={price}
							onChange={(event) => setPrice(event.target.value)}
							required
						/>
					</label>
					<label className="add-product-description">
						<span>Description</span>
						<textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							maxLength={5000}
							rows={5}
							required
						/>
					</label>
				</div>

				<div className="add-product-photo">
					<div className="add-product-photo-preview">
						{previewUrl ? (
							<img src={previewUrl} alt="Selected product photo preview" />
						) : (
							<ImagePlus size={28} />
						)}
					</div>
					<div className="add-product-photo-copy">
						<strong>{photo?.name || "Product photo"}</strong>
						<p>JPEG, PNG, WebP, GIF, or AVIF. Maximum file size: 10 MB.</p>
					</div>
					<input
						ref={fileInputRef}
						className="profile-picture-input"
						type="file"
						accept={acceptedPhotoTypes.join(",")}
						aria-label="Choose a product photo"
						onChange={(event) =>
							handlePhotoChange(event.currentTarget.files?.[0])
						}
					/>
					<button
						className="button button-secondary"
						type="button"
						onClick={() => fileInputRef.current?.click()}
					>
						<ImagePlus size={15} /> Choose photo
					</button>
				</div>

				{error && (
					<div className="profile-picture-message profile-picture-error" role="alert">
						{error}
					</div>
				)}
				{success && (
					<div className="profile-picture-message profile-picture-success" role="status">
						{success}
					</div>
				)}

				<div className="add-product-actions">
					{success && (
						<button
							className="button button-secondary"
							type="button"
							onClick={resetForm}
						>
							Add another product
						</button>
					)}
					<button
						className="button button-primary"
						type="submit"
						disabled={saving || Boolean(success)}
					>
						<Upload size={15} /> {saving ? "Adding product…" : "Add product"}
					</button>
				</div>
			</form>
		</>
	);
}
