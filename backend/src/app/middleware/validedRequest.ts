import z from "zod";
import { catchAsync } from "../utils/catchAsync.js";
import { NextFunction, Request, Response } from "express";

export const validedRequest = (zodSchema : z.ZodObject) =>{
	return catchAsync((req: Request,res: Response,next:NextFunction)=>{

			const payload = req.body ?? {}

		const result = zodSchema.safeParse(payload)
		
		if(!result.success){
			throw result.error
		}

		req.body = result.data
		next()

	})
}