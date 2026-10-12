import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinry.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/appError.js";
import { type AuditRequestContext, auditService } from "../audit/audit.service.js";
import { createProductSchema } from "./product.validation.js";

const uploadProductPhoto = (buffer: Buffer) =>
	new Promise<UploadApiResponse>((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					folder: "products",
					resource_type: "image",
				},
				(error, result) => {
					if (error) return reject(error);
					if (!result)
						return reject(new Error("No result returned from Cloudinary"));
					resolve(result);
				},
			)
			.end(buffer);
	});

const createProduct = async (
	userId: string,
	payload: unknown,
	photo: Buffer,
	context: AuditRequestContext = {},
) => {
	const productData = createProductSchema.parse(payload);
	const uploadedPhoto = await uploadProductPhoto(photo);

	const product = await prisma.product.create({
		data: {
			...productData,
			imageUrl: uploadedPhoto.secure_url,
			imagePublicId: uploadedPhoto.public_id,
		},
		select: {
			id: true,
			name: true,
			title: true,
			description: true,
			brand: true,
			location: true,
			price: true,
			imageUrl: true,
			createdAt: true,
		},
	});

	await auditService.log({
		userId,
		action: "PRODUCT_CREATED",
		category: "DATA",
		resourceType: "Product",
		resourceId: product.id,
		description: "Product added to the public catalog.",
		metadata: { name: product.name, title: product.title },
		...context,
	});

	return product;
};

const getPublicProducts = async () => {
	return prisma.product.findMany({
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			title: true,
			description: true,
			brand: true,
			location: true,
			price: true,
			imageUrl: true,
			createdAt: true,
		},
	});
};

const requirePhoto = (photo: Express.Multer.File | undefined) => {
	if (!photo) {
		throw new AppError("Product photo is required.", 400);
	}

	if (
		![
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/gif",
			"image/avif",
		].includes(photo.mimetype)
	) {
		throw new AppError(
			"Product photo must be a JPEG, PNG, WebP, GIF, or AVIF image.",
			400,
		);
	}

	return photo.buffer;
};

export const productService = {
	createProduct,
	getPublicProducts,
	requirePhoto,
};
