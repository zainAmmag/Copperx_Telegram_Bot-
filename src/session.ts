import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";

type SessionData = {
    [chatId: string]: { token: string; expireAt: string };
};

// Initialize the adapter and database with an empty object as default data
const adapter = new JSONFileSync<SessionData>("session.json");
const db = new LowSync<SessionData>(adapter, {});

db.read(); // Initialize the data from the file
db.data ||= {}; // Ensure the data is initialized to an empty object if not present

// Function to store a session
export function storeSession(chatId: string, token: string, expireAt: string) {
    db.data[chatId] = { token, expireAt };
    db.write(); // Write the updated data to the file
}

// Function to get a session token
export function getSession(chatId: string): string | null {
    return db.data[chatId]?.token || null;
}

// Function to delete a session
export function deleteSession(chatId: string) {
    delete db.data[chatId];
    db.write(); // Write the updated data to the file
}
