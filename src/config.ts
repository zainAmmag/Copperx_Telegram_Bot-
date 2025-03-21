import dotenv from "dotenv";

dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN as string;
export const COPPERX_API = process.env.COPPERX_API as string;
