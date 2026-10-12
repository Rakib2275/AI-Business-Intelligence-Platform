import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import config from "../config/index.js";

const createConfiguredAdmin = async (
	name: string | undefined,
	email: string | undefined,
	password: string | undefined,
	role: Role,
) => {
	if (!name && !email && !password) {
		if (role === Role.ADMIN) {
			console.warn(
				"Admin account seed skipped. Configure TESTER_ADMIN_NAME, TESTER_ADMIN_EMAIL, and TESTER_ADMIN_PASSWORD.",
			);
			return;
		}
		const existingSuperAdmin = await prisma.user.findFirst({
			where: { role: Role.SUPER_ADMIN },
		});
		if (existingSuperAdmin) {
			console.log("SUPER_ADMIN account already exists.");
			return;
		}
		throw new Error(
			"SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD are required to seed a Super Admin.",
		);
	}
	if (!name || !email || !password) {
		throw new Error(`Name, email, and password are required to seed ${role}.`);
	}

	const normalizedEmail = email.trim().toLowerCase();
	const existingUser = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});
	if (existingUser) {
		if (existingUser.role !== role) {
			throw new Error(
				`Cannot seed ${role}: the configured email is already assigned to ${existingUser.role}.`,
			);
		}
		console.log(`${role} account already exists.`);
		return;
	}

	const existingRole =
		role === Role.SUPER_ADMIN
			? await prisma.user.findFirst({ where: { role } })
			: null;
	if (existingRole) {
		console.log(`${role} account already exists.`);
		return;
	}

	const passwordHash = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);
	const user = await prisma.user.create({
		data: {
			name: name.trim(),
			email: normalizedEmail,
			passwordHash,
			role,
		},
		select: { id: true, email: true, role: true },
	});

	console.log(`${role} account created: ${user.email}.`);
};

export const seedSuperAdmin = async () => {
	await createConfiguredAdmin(
		config.super_admin_name,
		config.super_admin_email,
		config.super_admin_password,
		Role.SUPER_ADMIN,
	);
};

export const seedAdmin = async () => {
	await createConfiguredAdmin(
		config.tester_admin_name,
		config.tester_admin_email,
		config.tester_admin_password,
		Role.ADMIN,
	);
};
