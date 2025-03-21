import axios from "axios";
import { COPPERX_API } from "./config";

export async function requestOTP(email: string): Promise<{ success: boolean; sid?: string }> {
    try {
        const response = await axios.post(`${COPPERX_API}/auth/email-otp/request`, { email });

        if (response.status === 200 && response.data?.sid) {
            return { success: true, sid: response.data.sid };
        } else {
            return { success: false };
        }
    } catch (error: any) {
        console.error("OTP Request Failed:", error.response?.data || error.message);
        return { success: false };
    }
}



export async function verifyOTP(email: string, otp: string, sid: string): Promise<{
    accessToken: string;
    expireAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        profileImage: string;
        organizationId: string;
        role: string;
        status: string;
        type: string;
        walletAddress: string;
        walletId: string;
    };
} | null> {
    try {
        const response = await axios.post(`${COPPERX_API}/auth/email-otp/authenticate`, { email, otp, sid });

        return response.data;
    } catch (error: any) {
        console.error("OTP Verification Failed:", error.response?.data || error.message);
        return null;
    }
}
