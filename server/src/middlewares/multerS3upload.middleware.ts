import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import express, { Request } from "express";
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Use AWS SDK v3 (recommended)
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE, // Add this line
    metadata: (
      req: express.Request,
      file: Express.Multer.File,
      cb: (error: any, metadata?: any) => void
    ) => {
      const authReq = req as AuthenticatedRequest;
      cb(null, {
        userId: authReq.user?.id,
        fieldName: file.fieldname,
        contentType: file.mimetype, // Add content type to metadata
      });
    },
    key: (
      req: express.Request,
      file: Express.Multer.File,
      cb: (error: any, key?: string) => void
    ) => {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      const fileName = `products/${userId}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (
    _req: express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Only allow image files
    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});
export const documentUpload = {
  upload,
};
