import { isValidObjectId } from "mongoose";
import { badRequest } from "./AppError.js";

// Express 5 types req.params values as `string | string[] | undefined` because of wildcard routes,
// so every :id read has to be narrowed before it reaches Mongoose. Without this a malformed id
// reaches the driver and surfaces as a CastError -> 500, when it should be a 400.
export const requireObjectId = (
    value: string | string[] | undefined,
    label = "id"
): string => {
    if (typeof value !== "string" || !isValidObjectId(value)) {
        throw badRequest(`Invalid ${label}`);
    }
    return value;
};
