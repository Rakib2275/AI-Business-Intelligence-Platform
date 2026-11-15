import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LoginZodSchema } from "../auth/authValidation.js";
import {
	createSellerSchema,
	updateSellerProfileSchema,
	verifySellerEmailSchema,
} from "./seller.validation.js";

describe("seller account validation", () => {
	it("accepts seller username login while preserving email login", () => {
		const password = "Seller123!";
		assert.equal(
			LoginZodSchema.safeParse({ username: "my-seller", password }).success,
			true,
		);
		assert.equal(
			LoginZodSchema.safeParse({ email: "seller@example.com", password })
				.success,
			true,
		);
		assert.equal(
			LoginZodSchema.safeParse({
				email: "seller@example.com",
				username: "my-seller",
				password,
			}).success,
			false,
		);
	});

	it("normalizes the seller username and email at account creation", () => {
		const result = createSellerSchema.safeParse({
			name: "Seller Name",
			username: "My.Seller",
			initialPassword: "Seller123!",
			email: "SELLER@example.com",
			businessProfile: { companyName: "Example Store" },
		});
		assert.equal(result.success, true);
		if (!result.success) return;
		assert.equal(result.data.username, "my.seller");
		assert.equal(result.data.email, "seller@example.com");
	});

	it("rejects empty profile updates and mismatched email verification input", () => {
		assert.equal(updateSellerProfileSchema.safeParse({}).success, false);
		assert.equal(
			verifySellerEmailSchema.safeParse({
				email: "seller@example.com",
				otp: "12345",
			}).success,
			false,
		);
	});
});
