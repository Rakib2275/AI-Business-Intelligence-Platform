import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import * as XLSX from "xlsx";

import {
  createBusinessDataSchema,
  updateBusinessDataSchema,
} from "./businessData.validation";
import type { AuditRequestContext } from "../audit/audit.service";
import { auditService } from "../audit/audit.service";


// ======================================================
// TYPES
// ======================================================

type RowData = Record<string, unknown>;


// ======================================================
// HELPER: GENERATE TABLE NAME
// ======================================================

const generateTableName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};


// ======================================================
// HELPER: DETECT COLUMN TYPE
// ======================================================

const detectColumnType = (values: unknown[]): string => {
  if (!values.length) {
    return "TEXT";
  }

  // NUMBER
  const allNumbers = values.every((value) => {
    if (typeof value === "number") {
      return true;
    }

    if (typeof value === "string") {
      return value.trim() !== "" && !isNaN(Number(value));
    }

    return false;
  });

  if (allNumbers) {
    return "NUMBER";
  }


  // BOOLEAN
  const allBoolean = values.every((value) => {
    return (
      value === true ||
      value === false ||
      value === "true" ||
      value === "false" ||
      value === "TRUE" ||
      value === "FALSE"
    );
  });

  if (allBoolean) {
    return "BOOLEAN";
  }


  // DATE
  const allDates = values.every((value) => {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }

    if (typeof value !== "string") {
      return false;
    }

    const date = new Date(value);

    return !isNaN(date.getTime());
  });

  if (allDates) {
    return "DATE";
  }


  // DEFAULT
  return "TEXT";
};


// ======================================================
// 1. CREATE BUSINESS DATA
// ======================================================

const createBusinessData = async (
  userId: string,
  payload: unknown,
  context: AuditRequestContext = {},
) => {

  const validatedData =
    createBusinessDataSchema.parse(payload);


  // Check duplicate table name
  const existingData =
    await prisma.businessData.findFirst({
      where: {
        userId,
        tableName: validatedData.tableName,
      },
    });


  if (existingData) {
    throw new Error(
      "You already have a dataset with this table name"
    );
  }


  const businessData =
    await prisma.businessData.create({
      data: {
        userId,

        name: validatedData.name,

        description:
          validatedData.description,

        tableName:
          validatedData.tableName,

        data: [],

        rowCount: 0,

        columnCount: 0,
      },

      include: {
        metadata: true,
      },
    });


  await auditService.log({
    userId,
    action: "BUSINESS_DATA_CREATED",
    category: "DATA",
    resourceType: "BusinessData",
    resourceId: businessData.id,
    description: "Business dataset created.",
    metadata: { name: businessData.name, tableName: businessData.tableName },
    ...context,
  });
  return businessData;
};


// ======================================================
// 2. GET ALL BUSINESS DATA
// ======================================================

const getAllBusinessData = async (
  userId: string
) => {

  const businessData =
    await prisma.businessData.findMany({
      where: {
        userId,
      },

      select: {
        id: true,
        name: true,
        tableName: true,
        description: true,
        rowCount: true,
        columnCount: true,
        createdAt: true,
        updatedAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });


  return businessData;
};


// ======================================================
// 3. GET SINGLE BUSINESS DATA
// ======================================================

const getSingleBusinessData = async (
  userId: string,
  id: string
) => {

  const businessData =
    await prisma.businessData.findFirst({
      where: {
        id,
        userId,
      },

      include: {
        metadata: true,
      },
    });


  if (!businessData) {
    throw new Error(
      "Business data not found"
    );
  }


  return businessData;
};


// ======================================================
// 4. UPDATE BUSINESS DATA
// ======================================================

const updateBusinessData = async (
  userId: string,
  id: string,
  payload: unknown,
  context: AuditRequestContext = {},
) => {

  const validatedData =
    updateBusinessDataSchema.parse(payload);


  // Check ownership
  const existing =
    await prisma.businessData.findFirst({
      where: {
        id,
        userId,
      },
    });


  if (!existing) {
    throw new Error(
      "Business data not found"
    );
  }


  // Check duplicate table name
  if (
    validatedData.tableName &&
    validatedData.tableName !== existing.tableName
  ) {

    const duplicate =
      await prisma.businessData.findFirst({
        where: {
          userId,

          tableName:
            validatedData.tableName,

          NOT: {
            id,
          },
        },
      });


    if (duplicate) {
      throw new Error(
        "This table name already exists"
      );
    }
  }


  const updated =
    await prisma.businessData.update({
      where: {
        id,
      },

      data: {

        ...(validatedData.name !== undefined && {
          name: validatedData.name,
        }),

        ...(validatedData.description !== undefined && {
          description:
            validatedData.description,
        }),

        ...(validatedData.tableName !== undefined && {
          tableName:
            validatedData.tableName,
        }),
      },

      include: {
        metadata: true,
      },
    });


  await auditService.log({
    userId,
    action: "BUSINESS_DATA_UPDATED",
    category: "DATA",
    resourceType: "BusinessData",
    resourceId: id,
    description: "Business dataset updated.",
    metadata: { changedFields: Object.keys(validatedData) },
    ...context,
  });
  return updated;
};


// ======================================================
// 5. DELETE BUSINESS DATA
// ======================================================

const deleteBusinessData = async (
  userId: string,
  id: string,
  context: AuditRequestContext = {},
) => {

  // Check ownership
  const existing =
    await prisma.businessData.findFirst({
      where: {
        id,
        userId,
      },
    });


  if (!existing) {
    throw new Error(
      "Business data not found"
    );
  }


  await prisma.businessData.delete({
    where: {
      id,
    },
  });

  await auditService.log({
    userId,
    action: "BUSINESS_DATA_DELETED",
    category: "DATA",
    resourceType: "BusinessData",
    resourceId: id,
    description: "Business dataset deleted.",
    metadata: { name: existing.name, tableName: existing.tableName },
    ...context,
  });

  return null;
};


// ======================================================
// 6. UPLOAD CSV / EXCEL
// ======================================================

const uploadBusinessData = async (
  userId: string,
  file: Express.Multer.File,
  name: string,
  description?: string,
  context: AuditRequestContext = {},
) => {

  // --------------------------------------------------
  // CHECK FILE
  // --------------------------------------------------

  if (!file) {
    throw new Error(
      "CSV or Excel file is required"
    );
  }


  // --------------------------------------------------
  // CHECK FILE TYPE
  // --------------------------------------------------

  const allowedMimeTypes = [
    "text/csv",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];


  const fileName =
    file.originalname.toLowerCase();


  const isAllowedFile =
    allowedMimeTypes.includes(file.mimetype) ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls");


  if (!isAllowedFile) {
    throw new Error(
      "Only CSV, XLS and XLSX files are allowed"
    );
  }


  // --------------------------------------------------
  // READ EXCEL / CSV FILE
  // --------------------------------------------------

  const workbook =
    XLSX.read(file.buffer, {
      type: "buffer",

      cellDates: true,
    });


  // --------------------------------------------------
  // CHECK SHEET
  // --------------------------------------------------

  const sheetName =
    workbook.SheetNames[0];


  if (!sheetName) {
    throw new Error(
      "Uploaded file contains no sheet"
    );
  }


  const worksheet =
    workbook.Sheets[sheetName];


  // --------------------------------------------------
  // CONVERT SHEET TO JSON
  // --------------------------------------------------

  const rows: RowData[] =
    XLSX.utils.sheet_to_json<RowData>(
      worksheet,
      {
        defval: null,

        raw: false,
      }
    );


  // --------------------------------------------------
  // CHECK DATA
  // --------------------------------------------------

  if (!rows.length) {
    throw new Error(
      "Uploaded file contains no data"
    );
  }


  // --------------------------------------------------
  // GET COLUMNS
  // --------------------------------------------------

  const firstRow =
    rows[0];


  const columns =
    Object.keys(firstRow);


  if (!columns.length) {
    throw new Error(
      "No columns found in uploaded file"
    );
  }


  // --------------------------------------------------
  // GENERATE COLUMN METADATA
  // --------------------------------------------------

  const columnMetadata =
    columns.map((column) => {

      const values =
        rows
          .map(
            (row) =>
              row[column]
          )
          .filter(
            (value) =>
              value !== null &&
              value !== undefined &&
              value !== ""
          );


      return {
        name: column,

        type:
          detectColumnType(values),

        nullable:
          values.length !== rows.length,
      };
    });


  // --------------------------------------------------
  // GENERATE TABLE NAME
  // --------------------------------------------------

  const tableName =
    generateTableName(name);


  if (!tableName) {
    throw new Error(
      "Invalid dataset name"
    );
  }


  // --------------------------------------------------
  // CHECK DUPLICATE
  // --------------------------------------------------

  const existing =
    await prisma.businessData.findFirst({
      where: {
        userId,

        tableName,
      },
    });


  if (existing) {
    throw new Error(
      "A dataset with this name already exists"
    );
  }


  // --------------------------------------------------
  // CREATE BUSINESS DATA + METADATA
  // --------------------------------------------------

  const businessData =
    await prisma.businessData.create({
      data: {

        userId,

        name,

        description,

        fileName:
          file.originalname,

        tableName,

        data:
          rows as Prisma.InputJsonValue,

        rowCount:
          rows.length,

        columnCount:
          columns.length,

        metadata: {
          create: {

            tableName,

            description:
              description ||
              `Metadata for ${name}`,

            columns:
              columnMetadata,
          },
        },
      },

      include: {
        metadata: true,
      },
    });


  await auditService.log({
    userId,
    action: "BUSINESS_DATA_UPLOADED",
    category: "DATA",
    resourceType: "BusinessData",
    resourceId: businessData.id,
    description: "Business dataset uploaded.",
    metadata: {
      fileName: file.originalname,
      rowCount: rows.length,
      columnCount: columns.length,
    },
    ...context,
  });
  return businessData;
};


// ======================================================
// EXPORT
// ======================================================

export const businessDataService = {

  createBusinessData,

  getAllBusinessData,

  getSingleBusinessData,

  updateBusinessData,

  deleteBusinessData,

  uploadBusinessData,
};