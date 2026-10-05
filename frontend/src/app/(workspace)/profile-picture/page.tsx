"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { PageHeading } from "@/components/ui";

export default function ProfilePicturePage() {
	const { user, updateProfileImage } = useSession();
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!file) {
			setPreviewUrl("");
			return;
		}
		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [file]);

	const handleFileChange = (selectedFile: File | undefined) => {
		setError("");
		setSuccess("");
		if (!selectedFile) return;
		if (!selectedFile.type.startsWith("image/")) {
			setFile(null);
			setError("Choose an image file to continue.");
			return;
		}
		setFile(selectedFile);
	};

	const handleUpload = async () => {
		if (!file) {
			setError("Choose a photo before saving.");
			return;
		}

		setError("");
		setSuccess("");
		setUploading(true);
		const formData = new FormData();
		formData.append("profileImage", file);

		try {
			const response = await apiRequest<User>("/user/profile-image", {
				method: "PATCH",
				body: formData,
			});
			if (!response.data.imageUrl) {
				throw new ApiError(
					"The uploaded photo URL was missing from the response.",
					500,
				);
			}
			updateProfileImage(response.data.imageUrl);
			router.replace("/dashboard");
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: "Your profile picture could not be updated.",
			);
		} finally {
			setUploading(false);
		}
	};

	const initial = user?.name.trim().charAt(0).toUpperCase() || "U";

	return (
		<>
			<PageHeading
				eyebrow="YOUR ACCOUNT"
				title="Profile picture"
				description="Choose a photo that helps your team recognize you."
				action={
					<Link className="button button-secondary" href="/dashboard">
						<ArrowLeft size={15} /> Back to workspace
					</Link>
				}
			/>

			<section className="profile-picture-card panel">
				<div className="profile-picture-preview">
					{previewUrl ? (
						<img src={previewUrl} alt="Selected profile photo preview" />
					) : user?.imageUrl ? (
						<img src={user.imageUrl} alt={`${user.name}'s profile`} />
					) : (
						<span>{initial}</span>
					)}
				</div>

				<div className="profile-picture-details">
					<div className="profile-picture-heading">
						<span className="profile-picture-icon">
							<UserRound size={17} />
						</span>
						<div>
							<h2>{user?.name || "Your profile"}</h2>
							<p>{user?.email}</p>
						</div>
					</div>

					<div className="profile-picture-picker">
						<input
							ref={fileInputRef}
							className="profile-picture-input"
							type="file"
							accept="image/*"
							aria-label="Choose a profile picture"
							onChange={(event) =>
								handleFileChange(event.currentTarget.files?.[0])
							}
						/>
						<div>
							<strong>{file ? file.name : "Choose a photo"}</strong>
							<p>
								{file
									? "Preview the image, then save it to your profile."
									: "Select an image from your device. Image formats are supported."}
							</p>
						</div>
						<button
							className="button button-secondary"
							type="button"
							onClick={() => fileInputRef.current?.click()}
						>
							<ImagePlus size={15} /> Browse
						</button>
					</div>

					{error && (
						<div
							className="profile-picture-message profile-picture-error"
							role="alert"
						>
							{error}
						</div>
					)}
					{success && (
						<div
							className="profile-picture-message profile-picture-success"
							role="status"
						>
							{success}
						</div>
					)}

					<div className="profile-picture-actions">
						<button
							className="button button-primary"
							type="button"
							disabled={!file || uploading}
							onClick={() => void handleUpload()}
						>
							<Upload size={15} />
							{uploading ? "Uploading…" : "Save profile picture"}
						</button>
					</div>
				</div>
			</section>
		</>
	);
}
