import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import crypto from "node:crypto"
import { redisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodeMailer";
import ejs from "ejs"
import path from "node:path";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;
	
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const expirationSeconds = 5 * 60

	const otpKey = `patient-registration-otp:${email}`
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds
		}
	})

	const patientRegistrationKey = `patient-registration-data:${email}`
	const redisUserDataPayload = {
		name,
		email,
		password: hashedPassword,
	}

	await redisClient.set(
		patientRegistrationKey, 
		JSON.stringify(redisUserDataPayload), 
		{
			expiration: {
				type: "EX",
				value: expirationSeconds
			}
		}
	)


	const tempatePath = path.join(process.cwd(), "src/app/templates/registation-user-otp.ejs")

	const templateData = {
		name,
		email,
		otp : otpValue,
		expirationMinutes: expirationSeconds / 60

	}

	const html = await ejs.renderFile(tempatePath, templateData)

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Email Verification",
		// text : `Your OTP is ${otp}`
		// html: `<h1>Your OTP is ${otp}</h1>`
		html
	})
	
};

const verifyPatientEmail = async (payload : IVerifyEmailPayload) => {

	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === "BLOCKED") {
		throw new Error("User is Blocked")
	}

	if (isUserExist?.status === UserStatus.DELETED) {
		throw new Error("User is Deleted")
	}

	const otpKey = `patient-registration-otp:${email}`

	const redisOtp = await redisClient.get(otpKey)

	if (!redisOtp) {
		throw new Error("Invalid OTP")
	}

	if (redisOtp !== otp) {
		throw new Error("OTP Does Not Match")
	}

	await redisClient.del(otpKey)

	const patientRegistrationKey = `patient-registration-data:${email}`

	const redisPatientData = await redisClient.get(patientRegistrationKey)

	if(!redisPatientData){
		throw new Error ("Patient Doesnt Exist");
	}

	const patientPayload : IRegisterPatientPayload = JSON.parse(redisPatientData)

	const createdUser = await prisma.user.create({
		data: {
			name : patientPayload.name,
			email : patientPayload.email,
            passwordHash: patientPayload.password,
			role: Role.COUSTOMER,
			status: UserStatus.ACTIVE,
		},
		select: { id: true, name: true, email: true, role: true, status: true },
	});

	await redisClient.del(patientRegistrationKey)

	const tempatePath = path.join(process.cwd(), "src/app/templates/patient-welcome-email.ejs")

	const templateData = {
		name : createdUser.name,
	}

	const html = await ejs.renderFile(tempatePath, templateData)

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome To PH Healthcare System",
		// text : `Your OTP is ${otp}`
		// html: `<h1>Your OTP is ${otp}</h1>`
		html
	})

	const jwtPayload = {
		userId: createdUser.id,
		name: createdUser.name,
		email: createdUser.email,
		role: createdUser.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user: createdUser,
		accessToken,
		refreshToken,
	};

}


const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async(payload : IForgotPasswordPayload) =>{
	const {email} = payload;

	const isUserExists = await prisma.user.findUnique({
		where :{
			email
		}
	})

	if(!isUserExists){
		throw new Error("User Does not Exist!")
	}

	if(isUserExists.status === "BLOCKED"){
		throw new Error("User is Blocked")
	}

	if(isUserExists.status === UserStatus.DELETED){
		throw new Error("User is Deleted")
	}

	const otp = crypto.randomInt(100000,1000000).toString();
	const key = `forgot-password-otp:${isUserExists.email}`

	const expirationSeconds = 5*60

	await redisClient.set(key,otp,{
		expiration:{
			type: "EX",
			value : expirationSeconds
		}
	})

	const tempatePath = path.join(process.cwd(), "src/app/templates/forgot-password.ejs")

	const templateData = {
		name : isUserExists.name,
		otp,
		expirationMinutes : expirationSeconds / 60
	}
	const html = await ejs.renderFile(tempatePath,templateData)

	await transporter.sendMail({
		from : config.email_sender,
		to : isUserExists.email,
		subject : "Forgot Password",
		html
	})

	
}

const resetPassword =async (payload : IResetPasswordPayload) =>{
	const {email, otp, newPassword} = payload;

	const isUserExists = await prisma.user.findUnique({
		where :{
			email
		}
	})

	if(!isUserExists){
		throw new Error("User Does not Exist!")
	}

	if(isUserExists.status === "BLOCKED"){
		throw new Error("User is Blocked")
	}

	if(isUserExists.status === UserStatus.DELETED){
		throw new Error("User is Deleted")
	}

	const key = `forgot-password-otp:${isUserExists.email}`

	const redisOtp = await redisClient.get(key)

	if(!redisOtp){
		throw new Error("Invalid OTP")
	}

	if(redisOtp !== otp){
		throw new Error("OTP Does Not Match")
	}

	const hashedNewPassword = await bcrypt.hash(newPassword,Number(config.bcrypt_salt_rounds))

	await prisma.user.update({
		where:{
			email : isUserExists.email
		},
		data:{
			passwordHash : hashedNewPassword
		}
	})

	await redisClient.del([key])

	const tempatePath = path.join(process.cwd(), "src/app/templates/reset-password-success.ejs")

	const templateData = {
		name : isUserExists.name
	}
	const html = await ejs.renderFile(tempatePath,templateData)

	await transporter.sendMail({
		from : config.email_sender,
		to : isUserExists.email,
		subject : "Password Changed",
		html
	})

}

export const AuthService = {
	registerPatient,
	verifyPatientEmail,
	loginUser,
	getMe,
	refreshToken,
	forgotPassword,
	resetPassword
};
