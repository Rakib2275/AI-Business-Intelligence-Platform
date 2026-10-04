import type { UploadApiResponse } from "cloudinary"
import { cloudinary } from "../../lib/cloudinry"
import { prisma } from "../../lib/prisma"
import { auditService } from "../audit/audit.service"
import type { AuditRequestContext } from "../audit/audit.service"

const uploadProfileImage = async (
    buffer: Buffer,
    userId: string,
    context: AuditRequestContext = {},
) =>{
    // cloudinary.uploader.upload_stream(
    //     {
    //         resource_type : "auto"
    //     },
    //     async (error,result) =>{
    //         if(error){
    //             console.log(error)
    //             throw new Error(error.message)
    //         }
    //         console.log(result)

    //         const updateUser = await prisma.user.update({
    //             where :{
    //                 id : userId
    //             },
    //             data : {
    //                imageUrl : result?.secure_url,
    //                imagePublicId : result?.public_id 
    //             }
    //         })

    //         console.log(updateUser)

    //         // return result
    //     }
    // ).end(buffer)

    const currentUser = await prisma.user.findUnique({
        where :{
            id: userId
        },
        select:{
            imagePublicId:true,
            imageUrl: true
        }
    })

    const cloudinaryResult = await new Promise<UploadApiResponse>((resolve,reject) =>{
        cloudinary.uploader.upload_stream(
        {
            resource_type : "auto"
        },
        async (error,result) =>{
            if(error){
                return reject(error)
            }
            if(!result){
                return reject(new Error("no result returned from cloudinary"))
            }
            resolve(result)
            // console.log(result)
        }
    ).end(buffer)
    })

    const updateUser = await prisma.user.update({
                where :{
                    id : userId
                },
                data : {
                   imageUrl : cloudinaryResult?.secure_url,
                   imagePublicId : cloudinaryResult?.public_id 
                },
                omit :{
                        passwordHash : true
                }
            })
            if(currentUser?.imagePublicId && currentUser.imageUrl){
                await cloudinary.uploader.destroy(currentUser.imagePublicId)
            }

    await auditService.log({
        userId,
        action: "USER_UPDATED",
        category: "USER",
        resourceType: "User",
        resourceId: userId,
        description: "User profile image updated.",
        metadata: { changedFields: ["imageUrl"] },
        ...context,
    })

    return updateUser

}


export const userService = {
    uploadProfileImage,
}