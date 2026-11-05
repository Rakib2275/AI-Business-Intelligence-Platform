import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { userService } from "./user.service.js";
import { getAuditRequestContext } from "../audit/audit.service.js";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
    console.log(req.file, "req.file");
	if(!req.file){
		throw new Error("No File Provide")
	}

	const userId = req.user?.userId;

	const result = await userService.uploadProfileImage(req.file.buffer,userId!,getAuditRequestContext(req))
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New token generate successfully",
		data:result
	})
})

const updateProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("User information is missing from the request.");
	const result = await userService.updateProfile(userId, req.body, getAuditRequestContext(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully.",
		data: result,
	});
});

export const UserController = {
	 uploadProfileImage,
	 updateProfile,
}
