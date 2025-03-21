import axios from "axios";
import { COPPERX_API } from "./config";

// Check KYC Status
export async function checkKYC(token: string): Promise<{ approved: boolean; url?: string }> {
    try {
        const response = await axios.get(`${COPPERX_API}/kycs`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data?.status === "approved") {
            return { approved: true };
        } else {
            return { approved: false, url: "https://payout.copperx.io/app/kyc" }; // Redirect link
        }
    } catch (error: any) {
        console.error("KYC Check Failed:", error.response?.data || error.message);
        return { approved: false };  // Default to not approved in case of error
    }
}

// Get Wallets
export async function getWallets(token: string): Promise<any> {
    try {
        const response = await axios.get(`${COPPERX_API}/wallets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;  // Return the list of wallets
    } catch (error: any) {
        console.error("Get Wallets Failed:", error.response?.data || error.message);
        return null;
    }
}

export async function getUserDetail(token: string): Promise<any> {
    try {
        const response = await axios.get(`${COPPERX_API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;  // Return the list of wallets
    } catch (error: any) {
        console.error("Get Wallets Failed:", error.response?.data || error.message);
        return null;
    }
}

// Get Balances
export async function getBalances(token: string): Promise<any> {
    try {
        const response = await axios.get(`${COPPERX_API}/wallets/balances`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;  // Return the balance details
    } catch (error: any) {
        console.error("Get Balances Failed:", error.response?.data || error.message);
        return null;
    }
}

// Get Default Wallet
export async function getDefaultWallet(token: string): Promise<any> {
    try {
        const response = await axios.get(`${COPPERX_API}/wallets/default`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;  // Return the default wallet details
    } catch (error: any) {
        console.error("Get Default Wallet Failed:", error.response?.data || error.message);
        return null;
    }
}

// Get Transaction History
export async function getTransactionHistory(token: string): Promise<any> {
    try {
        const response = await axios.get(`${COPPERX_API}/transfers`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;  // Return the transaction history
    } catch (error: any) {
        console.error("Get Transaction History Failed:", error.response?.data || error.message);
        return null;
    }
}

export async function setDefaultWalletAddress(token: string, walletid: string): Promise<any> {
    try {
        const response = await axios.post(`${COPPERX_API}/wallets/default`, {
            "walletId": walletid
          },{
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(response.data ,'response.data' )
        return response.data;  // Return the transaction history

    } catch (error: any) {
        console.error("Get Transaction History Failed:", error.response?.data || error.message);
        return null;
    }
}

export async function SendPaymentWithEmail(token: string, data: any): Promise<any> {


}

export async function SendPaymentWithWallet(token: string, data: any): Promise<any> {
    

}
export async function processBankWithdrawal(token: string, data: any): Promise<any> {
    

}


export async function sendBulkBatchTransfer(token: string, data: any): Promise<any> {
    

}




