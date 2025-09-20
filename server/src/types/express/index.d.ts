import { User } from "../../db/schema/User.schema";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: string;
      email?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
