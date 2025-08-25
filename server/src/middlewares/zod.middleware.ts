import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateSchema = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("body", req.body);
      console.log("schema", schema);
      req.body = schema.parse(req.body); // parse = validate + sanitize
      next();
    } catch (err: any) {
      console.log(err);
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors,
      });
    }
  };
};
