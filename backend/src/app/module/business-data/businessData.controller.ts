import { Request, Response } from "express";
import { ZodError } from "zod";

import { businessDataService } from "./businessData.service.js";
import { getAuditRequestContext } from "../audit/audit.service.js";

const getUserId = (req: Request) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
};

const getRouteId = (req: Request) => {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
};

// ========================================
// CREATE
// ========================================

const createBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const result =
      await businessDataService.createBusinessData(
        userId,
        req.body,
        getAuditRequestContext(req),
      );

    res.status(201).json({
      success: true,
      message:
        "Business data created successfully",
      data: result,
    });

  } catch (error: any) {

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create business data",
    });
  }
};


// ========================================
// GET ALL
// ========================================

const getAllBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const result =
      await businessDataService.getAllBusinessData(
        userId
      );

    res.status(200).json({
      success: true,
      message:
        "Business data retrieved successfully",
      data: result,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to retrieve business data",
    });
  }
};


// ========================================
// GET SINGLE
// ========================================

const getSingleBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const id = getRouteId(req);

    const result =
      await businessDataService.getSingleBusinessData(
        userId,
        id
      );

    res.status(200).json({
      success: true,
      message:
        "Business data retrieved successfully",
      data: result,
    });

  } catch (error: any) {

    res.status(404).json({
      success: false,
      message:
        error.message ||
        "Business data not found",
    });
  }
};


// ========================================
// UPDATE
// ========================================

const updateBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const id = getRouteId(req);

    const result =
      await businessDataService.updateBusinessData(
        userId,
        id,
        req.body,
        getAuditRequestContext(req),
      );

    res.status(200).json({
      success: true,
      message:
        "Business data updated successfully",
      data: result,
    });

  } catch (error: any) {

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to update business data",
    });
  }
};


// ========================================
// DELETE
// ========================================

const deleteBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const id = getRouteId(req);

    await businessDataService.deleteBusinessData(
      userId,
      id,
      getAuditRequestContext(req),
    );

    res.status(200).json({
      success: true,
      message:
        "Business data deleted successfully",
    });

  } catch (error: any) {

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to delete business data",
    });
  }
};


// ========================================
// UPLOAD
// ========================================

const uploadBusinessData = async (
  req: Request,
  res: Response
) => {
  try {

    const userId = getUserId(req);

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message:
          "CSV or Excel file is required",
      });
    }


    const name =
      req.body.name ||
      file.originalname
        .replace(/\.[^/.]+$/, "");


    const description =
      req.body.description;


    const result =
      await businessDataService.uploadBusinessData(
        userId,
        file,
        name,
        description,
        getAuditRequestContext(req),
      );


    res.status(201).json({
      success: true,
      message:
        "Business data uploaded successfully",
      data: result,
    });

  } catch (error: any) {

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to upload business data",
    });
  }
};


export const businessDataController = {
  createBusinessData,
  getAllBusinessData,
  getSingleBusinessData,
  updateBusinessData,
  deleteBusinessData,
  uploadBusinessData,
};