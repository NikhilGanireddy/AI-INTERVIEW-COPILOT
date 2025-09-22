// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

declare global {
    var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export const connectDB = async () => {
    if (!global.__mongooseConn) {
        global.__mongooseConn = mongoose.connect(MONGODB_URI, {
            dbName: "interview_coach",
        });
    }
    return global.__mongooseConn;
};
