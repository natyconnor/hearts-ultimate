import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Add auth routes for handling OAuth callbacks, etc.
auth.addHttpRoutes(http);

export default http;
