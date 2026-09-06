import { paginationQuery } from "./common.schema.js";
import type { z } from "zod";

export const listLikesQuery = paginationQuery(20);

export type ListLikesQuery = z.output<typeof listLikesQuery>;
