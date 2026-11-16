
import app from "./app.js";
import config from "./app/config/index.js";
import { transporter } from "./app/lib/nodeMailer.js";
import { prisma } from "./app/lib/prisma.js";
import { redisClient } from "./app/lib/redis.js";
import { seedAdmin, seedSuperAdmin } from "./app/utils/seed.js";

const PORT = config.port;

const connectRedis = async () => {
	try {
		await redisClient.connect();
		if (!redisClient.isReady) {
			throw new Error("Redis connection did not become ready.");
		}
		console.log("Redis Connect Successfully");
	} catch (error) {
		console.error(
			"Redis is required for OTP authentication. Backend startup aborted.",
			error instanceof Error ? error.message : error,
		);
		throw error;
	}
};

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await connectRedis();

		try {
			await transporter.verify();
			console.log("NodeMailer Connect Successfully");
		} catch (error) {
			console.warn(
				"Email is unavailable because SMTP authentication failed. The server will start, but email-based features will fail until SMTP_USER and SMTP_PASSWORD are corrected.",
			);
			console.warn(error instanceof Error ? error.message : error);
		}

		await seedSuperAdmin();
		await seedAdmin();

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
