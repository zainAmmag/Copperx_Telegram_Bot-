import { Telegraf } from "telegraf";
import { BOT_TOKEN, COPPERX_API } from "./config";
import { requestOTP, verifyOTP } from "./auth";
import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';

import { storeSession, getSession, deleteSession } from "./session";
import { checkKYC, getBalances, getDefaultWallet, getTransactionHistory, getUserDetail, getWallets, processBankWithdrawal, sendBulkBatchTransfer, SendPaymentWithEmail, SendPaymentWithWallet, setDefaultWalletAddress } from "./kyc";
import { Markup } from 'telegraf';


const bot = new Telegraf(BOT_TOKEN);

// Your webhook URL (replace with your domain or ngrok URL during development)
const webhookUrl = 'https://fruity-laws-know.loca.lt/webhook'; 

// Set the webhook once when starting the bot
async function setWebhook() {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      url: webhookUrl,
    });
    console.log('Webhook set:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
}

// Call setWebhook during bot setup
setWebhook();

// Create an Express server to listen for webhook updates
const app = express();
app.use(bodyParser.json());  // Middleware to handle JSON requests

// Webhook endpoint that will receive updates from Telegram
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received update:', update);
    await bot.handleUpdate(update);
    res.send('OK');
  } catch (error) {
    console.error('Error processing update:', error);
    res.status(500).send('Error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



function isSessionExpired(expireAt: string): boolean {
    return new Date(expireAt) < new Date();
}
interface customerData {
    name?: string;
    businessName?:string;
    email?:string;
    country?:string




}

interface UserState {
    step?: string;
    email?: string;
    sid?: string;
    walletAddress?:string;
    payeeId?:string;
    amount?:any;
    action?: string;  // Add action to the type
    invoiceNumber?:string;
    invoiceUrl?:string;
    quotePayload?:string;
    quoteSignature?:string;
    customerData?:customerData;
    sourceOfFundsFile?:string;
    preferredWalletId?:string;
    note?:string;
    requests?:Array<any>;
    currency?:string
    page?:any;
    WalletData?:any;


  }
  
  const userState: Map<string, UserState> = new Map();

// function isLoggedIn(ctx: any): boolean {
//     // Check if the user has a valid session
//     const chatId = ctx.chat.id.toString();
//     const token :any = getSession(chatId);
//     if step == 'collect_wallet_address'
//     userState.set(chatId, { step: "collect_wallet_address" });


//     return token && !isSessionExpired(token.expireAt);
// }


function isLoggedIn(ctx: any): boolean {
    // Check if the user has a valid session
    const chatId = ctx.chat.id.toString();
    const token: any = getSession(chatId);

    if (!token || isSessionExpired(token.expireAt)) {
        return false;
    }

  return true
}


bot.start((ctx) => {
    ctx.reply("👋 Welcome to CopperX! Use /login to authenticate.");
});


bot.command("login", (ctx) => {
    const chatId = ctx.chat.id.toString();
    if(isLoggedIn(ctx))
        return ctx.reply("📧 You are already logged in. Please use '/logout' to switch to another account.");

    userState.set(chatId, { step: "awaiting_email" });

    ctx.reply("📧 Please enter your email to receive an OTP: \n\n" +
        "📌 Type '❌ Cancel' to exit.");
});


bot.command("menu", (ctx) => {
    // Ensure the user is logged in before showing the menu
    const chatId = ctx.chat.id.toString();
    const token = getSession(chatId);

    if (!token) {
        return ctx.reply("❌ Please login first using /login.");
    }

    // Show the main menu if the user is logged in
    showMainMenu(ctx);
});

bot.command("logout", (ctx) => {
    const chatId = ctx.chat.id.toString();

    // Delete the user's session to log them out

    if(isLoggedIn(ctx))
    {
    deleteSession(chatId);

    // Send confirmation message and show the login prompt again
    ctx.reply("🚪 You have been logged out. Please use /login to authenticate again.");
    }
    else
    ctx.reply("You must be logged in to log out");
});


bot.command("send", (ctx) => {
    // Ensure the user is logged in before showing the menu
 
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);

    // Set user state to track progress
    userState.set(chatId, { step: "collect_email" });

    // Ask the user for their wallet address
    return ctx.reply("🔹 Enter the recipient's email address :\n\nType '❌ Cancel' to stop.");
   
});

bot.command("balance", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    const token: any = getSession(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);

    const WalletDAta: any = await getBalances(token);

  

    const walletDetails = WalletDAta.map((wallet: any) => {
        const balanceDetails = wallet.balances
            .map((balance: any) => {
                return `🪙  ${balance.symbol} : ${balance.balance} (Address: ${balance.address})`;
            })
            .join('\n');

        return `🌐  Network: ${wallet.network} (${wallet.isDefault ? 'Default' : 'Not Default'})
${balanceDetails}`;
    }).join('\n\n');


    ctx.reply(`💰  Wallet Details:\n\n${walletDetails}`);

});

bot.command("withdraw", (ctx) => {
    // Ensure the user is logged in before showing the menu
 
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);

    // Set user state to track progress
    userState.set(chatId, { step: "Wallet_transfer_wallet" });

    // Ask the user for their wallet address
    return ctx.reply("🔹 Enter Wallet address (For Example : 0x9021212.....):\n\nType '❌ Cancel' to stop.");
   
});

bot.command("help", (ctx) => {
    ctx.reply(
        "Here are some available commands:\n\n" +
        "/login - Start the login process\n" +
        "/balance - Check your balance\n" +
        "/send - Send funds\n" +
        "/withdraw - Withdraw funds\n" +
        "/menu - Show the main menu\n\n" +
        "Use inline buttons for further options when available."
    );
});






async function handleUserInput(ctx: any) {
    
        return ctx.reply("❓ Sorry, I didn't quite understand that. Type '/help' for assistance.  '/menu' for  Main Menu");

}
bot.on("message", async (ctx:any) => {
    const chatId = ctx.chat.id.toString();
    let state:any = userState.get(chatId);
    const message = ctx.message.text.trim();

    // Handle cancel option
    if (message.toLowerCase() === "cancel") {
        userState.delete(chatId);
        return ctx.reply("❌ Process has been canceled.");
    }
    if(message.toLowerCase() === 'help')
    {
         return ctx.reply(
            "Here are some available commands:\n\n" +
            "/login - Start the login process\n" +
            "/balance - Check your balance\n" +
            "/send - Send funds\n" +
            "/withdraw - Withdraw funds\n" +
            "/menu - Show the main menu\n\n" +
            "Use inline buttons for further options when available."
        );
    }

    // If no active state, prompt user to start

    console.log(  !isLoggedIn(ctx) ,'!isLoggedIn(ctx)')
    if (!state && !isLoggedIn(ctx)) {
        return ctx.reply("❌ Please start with /login.");
    }

    if (state?.step === "awaiting_transfer_page") {
        const page = parseInt(message);

        if (isNaN(page) || page <= 0) {
            return ctx.reply("⚠️ Invalid page number. Please enter a positive number.");
        }

        userState.set(chatId, { step: "awaiting_transfer_limit", page });

        return ctx.reply(
            "📌 Now enter the number of transfers to fetch per page (e.g., `10`).\n\n" +
            "📌 Type '❌ Cancel' to exit."
        );
    }

    if (state?.step === "awaiting_transfer_limit") {
        const limit = parseInt(message);

        if (isNaN(limit) || limit <= 0 || limit > 100) {
            return ctx.reply("⚠️ Invalid limit. Please enter a number between `1` and `100`.");
        }

        userState.delete(chatId); // Remove state before API call

        ctx.reply("⏳ Fetching transfer listings, please wait...");

        try {
            const response = await fetch(
                `${COPPERX_API}/transfers?page=${state.page}&limit=${limit}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer YOUR_ACCESS_TOKEN` },
                }
            );
            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return ctx.reply("❌ No transfers found for the given page and limit.");
            }

            let messageText = `📌 **Transfer Listings (Page ${data.page} - Limit ${data.limit})** 📌\n\n`;
            
            data.data.forEach((transfer: any, index: number) => {
                messageText += `🔹 **Transfer #${index + 1}**\n`;
                messageText += `🆔 **ID:** ${transfer.id}\n`;
                messageText += `💰 **Amount:** $${transfer.amount} ${transfer.currency}\n`;
                messageText += `🗂 **Status:** ${transfer.status}\n`;
                messageText += `📅 **Created At:** ${new Date(transfer.createdAt).toLocaleString()}\n`;
                messageText += `📤 **Source Country:** ${transfer.sourceCountry} ➡️ ${transfer.destinationCountry}\n`;
                messageText += `👤 **Customer:** ${transfer.customer?.name} (${transfer.customer?.email})\n`;
                messageText += `📄 **Invoice:** [View Here](${transfer.invoiceUrl})\n\n`;
            });

            messageText += data.hasMore ? "🔽 Type `next` to fetch more results." : "✅ No more results available.";

            return ctx.reply(messageText, { parse_mode: "Markdown" });
        } catch (error) {
            console.error(error);
            return ctx.reply("❌ Failed to fetch transfer listings. Please try again later.");
        }
    }




    switch (state?.step) {
        case "awaiting_email": {
            if (!message.includes("@") || !message.includes(".")) {
                return ctx.reply("❌ Invalid email format. Please enter a valid email.\n\n" +
            "📌 Type '❌ Cancel' to exit.");
            }

            const { success, sid } = await requestOTP(message);
            if (success && sid) {
                userState.set(chatId, { step: "awaiting_otp", email: message, sid });
                return ctx.reply("✅ OTP sent to your email. Please enter the OTP: .\n\n" +
            "📌 Type '❌ Cancel' to exit.");
            }
            return ctx.reply("❌ Failed to send OTP. Try again later.");
        }

        case "awaiting_otp": {
            const { email, sid } = state;
            if (!sid) {
                userState.delete(chatId);
                return ctx.reply("⚠️ Session expired. Please use /login again.");
            }
            ctx.reply("Validating OTP Please wait ...");

            const authData = await verifyOTP(email||'', message, sid);
            if (authData) {
                const { accessToken, expireAt, user } = authData;
                storeSession(chatId, accessToken, expireAt);
                userState.delete(chatId);

                await ctx.reply(`✅ Login successful! Welcome, ${user.firstName} ${user.lastName}.\n\n` +
                    `🔹 Email: ${user.email}\n🔹 Role: ${user.role}\n🔹 Status: ${user.status}\n` +
                    `🔹 Wallet: ${user.walletAddress || "No wallet linked"}`);

                const kycStatus = await checkKYC(accessToken);
                if (kycStatus.approved) {
                    await ctx.reply("🎉 KYC verified! You can now use CopperX services.");
                } else {
                    await ctx.reply(`⚠️ KYC pending. Please verify here: ${kycStatus.url}`);
                }
                return showMainMenu(ctx);
            }
            return ctx.reply("❌ Invalid OTP. Please try again..\n\n" +
            "📌 Type '❌ Cancel' to exit.");
        }

        case "Wallet_transfer_wallet": {
            if (!/^0x[a-fA-F0-9]{40}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Ethereum wallet address. Try again.");
            }
            userState.set(chatId, { ...state, step: "Wallet_transfer_Amount", walletAddress: message });
            return ctx.reply("📧 Enter the recipient's email address:");
        }
        case "Wallet_transfer_Amount": {
            const amount = parseFloat(message);
            if (isNaN(amount) || amount <= 0) {
                return ctx.reply("⚠️ Invalid amount. Enter a positive number.");
            }

            userState.set(chatId, { ...state, step: "Wallet_transfer_confirm_details", walletAddress: message });
            const userData :any = userState.get(chatId);
            return ctx.reply(
                `✅ Confirm transaction:\n\n` +
                `🔹 Wallet: ${userData.walletAddress}\n` +
                `💰 Amount: $${userData.amount} USD\n\n` +
                `✔️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.`
            );
        }


        case "collect_payeeId": {
            if (!/^\S{3,50}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Payee ID. It must be 3-50 characters, no spaces.");
            }
            userState.set(chatId, { ...state, step: "collect_amount", payeeId: message });
            return ctx.reply("💰 Enter the amount (USD):");
        }

        case "collect_amount": {
            const amount = parseFloat(message);
            if (isNaN(amount) || amount <= 0) {
                return ctx.reply("⚠️ Invalid amount. Enter a positive number.");
            }
            userState.set(chatId, { ...state, step: "confirm_details", amount: amount.toString() });
            const userData :any = userState.get(chatId);
            return ctx.reply(
                `✅ Confirm transaction:\n\n` +
                `🔹 Wallet: ${userData.walletAddress}\n` +
                `📧 Email: ${userData.email}\n` +
                `🆔 Payee ID: ${userData.payeeId}\n` +
                `💰 Amount: $${userData.amount} USD\n\n` +
                `✔️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.`
            );
        }
        case "Wallet_transfer_confirm_details": {
            if (message.toLowerCase() !== "confirm") {
                return ctx.reply("⚠️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.");
            }

            const finalData = userState.get(chatId);
            if (!finalData?.walletAddress || !finalData?.amount) {
                return ctx.reply("⚠️ Something went wrong. Restart the process.");
            }

            const token :any= getSession(chatId);
            const requestBody = {
                walletAddress: finalData.walletAddress,
              
               
                amount: finalData.amount,
                purposeCode: "self",
                currency: "USD",
            };

            try {
                await SendPaymentWithWallet(token, requestBody);
                userState.delete(chatId);
                return ctx.reply("✅ Email transfer successfully initiated!");
            } catch (error) {
                return ctx.reply("❌ Transaction failed. Try again later.");
            }
        }
        
        case "confirm_details": {
            if (message.toLowerCase() !== "confirm") {
                return ctx.reply("⚠️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.");
            }

            const finalData = userState.get(chatId);
            if (!finalData?.walletAddress || !finalData?.email || !finalData?.payeeId || !finalData?.amount) {
                return ctx.reply("⚠️ Something went wrong. Restart the process.");
            }

            const token :any= getSession(chatId);
            const requestBody = {
                walletAddress: finalData.walletAddress,
                email: finalData.email,
                payeeId: finalData.payeeId,
                amount: finalData.amount,
                purposeCode: "self",
                currency: "USD",
            };

            try {
                await SendPaymentWithEmail(token, requestBody);
                userState.delete(chatId);
                return ctx.reply("✅ Email transfer successfully initiated!");
            } catch (error) {
                return ctx.reply("❌ Transaction failed. Try again later.");
            }
        }







        case "collect_invoice_number":
            if (!/^[a-zA-Z0-9_-]{3,50}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Invoice Number. It must be 3-50 characters (letters, numbers, `_`, `-` allowed).");
            }
            userState.set(chatId, { ...state, step: "collect_invoice_url", invoiceNumber: message });
            return ctx.reply("🔗 Please enter the **Invoice URL**:");

        case "collect_invoice_url":
            if (!/^(https?:\/\/[^\s]+)$/.test(message)) {
                return ctx.reply("⚠️ Invalid URL format. Please enter a valid **Invoice URL** (e.g., https://example.com).");
            }
            userState.set(chatId, { ...state, step: "collect_quote_payload", invoiceUrl: message });
            return ctx.reply("📝 Enter the **Quote Payload**:");

        case "collect_quote_payload":
            if (!/^[a-zA-Z0-9_-]{5,100}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Quote Payload. It must be 5-100 characters.");
            }
            userState.set(chatId, { ...state, step: "collect_quote_signature", quotePayload: message });
            return ctx.reply("✍️ Enter the **Quote Signature**:");

        case "collect_quote_signature":
            if (!/^[a-zA-Z0-9_-]{5,100}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Quote Signature. It must be 5-100 characters.");
            }
            userState.set(chatId, { ...state, step: "collect_wallet_id", quoteSignature: message });
            return ctx.reply("💳 Enter the **Preferred Wallet ID (Ethereum Address)**:");

        case "collect_wallet_id":
            if (!/^0x[a-fA-F0-9]{40}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Wallet Address. It must be a valid **Ethereum address** (0x + 40 hex characters).");
            }
            userState.set(chatId, { ...state, step: "collect_customer_name", preferredWalletId: message });
            return ctx.reply("👤 Enter your **Full Name**:");

        case "collect_customer_name":
            if (!/^[a-zA-Z\s]{3,50}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Name. It must be 3-50 characters (letters & spaces only).");
            }
            userState.set(chatId, { ...state, step: "collect_business_name", customerData: { name: message } });
            return ctx.reply("🏢 Enter your **Business Name** (or type 'N/A' if not applicable):");

        case "collect_business_name":
            userState.set(chatId, { ...state, step: "collect_email", customerData: { ...state.customerData, businessName: message } });
            return ctx.reply("📧 Enter your **Email Address**:");

        case "collect_email":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message)) {
                return ctx.reply("⚠️ Invalid email format. Please enter a valid **Email Address**.");
            }
            userState.set(chatId, { ...state, step: "collect_country", customerData: { ...state.customerData, email: message } });
            return ctx.reply("🌍 Enter your **Country**:");

        case "collect_country":
            if (!/^[a-zA-Z\s]{2,50}$/.test(message)) {
                return ctx.reply("⚠️ Invalid Country Name. It must be **letters only**, between 2-50 characters.");
            }
            userState.set(chatId, { ...state, step: "collect_source_of_funds_file", customerData: { ...state.customerData, country: message } });
            return ctx.reply("📄 Upload the **Source of Funds File** (or type 'skip' to continue without):");

        case "collect_source_of_funds_file":
            if (message.toLowerCase() !== "skip" && !/^(https?:\/\/[^\s]+)$/.test(message)) {
                return ctx.reply("⚠️ Invalid file URL. Please enter a **valid link** or type 'skip'.");
            }
            userState.set(chatId, { ...state, step: "collect_note", sourceOfFundsFile: message });
            return ctx.reply("📝 Enter any **additional Note** (or type 'skip' to continue without):");

        case "collect_note":
            userState.set(chatId, { ...state, step: "confirm_details_for_Withdraw", note: message });

            // Retrieve all data for confirmation
            const withdrawalData = userState.get(chatId);

            return ctx.reply(
                `✅ **Please confirm the withdrawal details:**\n\n` +
                `📄 **Invoice Number:** ${withdrawalData?.invoiceNumber}\n` +
                `🔗 **Invoice URL:** ${withdrawalData?.invoiceUrl}\n` +
                `📝 **Quote Payload:** ${withdrawalData?.quotePayload}\n` +
                `✍️ **Quote Signature:** ${withdrawalData?.quoteSignature}\n` +
                `💳 **Wallet ID:** ${withdrawalData?.preferredWalletId}\n` +
                `👤 **Name:** ${withdrawalData?.customerData?.name}\n` +
                `🏢 **Business Name:** ${withdrawalData?.customerData?.businessName}\n` +
                `📧 **Email:** ${withdrawalData?.customerData?.email}\n` +
                `🌍 **Country:** ${withdrawalData?.customerData?.country}\n` +
                `📄 **Source of Funds File:** ${withdrawalData?.sourceOfFundsFile || "N/A"}\n` +
                `📝 **Note:** ${withdrawalData?.note || "N/A"}\n\n` +
                `✔️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.`
            );

        case "confirm_details_for_Withdraw":
            if (message.toLowerCase() !== "confirm") {
                return ctx.reply("⚠️ Type 'CONFIRM' to proceed or '❌ Cancel' to stop.");
            }

            const finalData = userState.get(chatId);
            if (!finalData?.invoiceNumber || !finalData?.invoiceUrl || !finalData?.quotePayload || !finalData?.quoteSignature || !finalData?.preferredWalletId || !finalData?.customerData?.email) {
                return ctx.reply("⚠️ Missing data. Please restart the process.");
            }

            const token: any = getSession(chatId);

            await processBankWithdrawal(token, finalData);
            userState.delete(chatId);
            return ctx.reply("✅ **Bank withdrawal request submitted successfully!**");
            case "bulk_collect_wallet":
                if (!/^0x[a-fA-F0-9]{40}$/.test(message)) {
                    return ctx.reply("⚠️ **Invalid Wallet Address.** Please enter a valid **Ethereum address**.");
                }
                userState.set(chatId, { ...state, step: "bulk_collect_email", walletAddress: message });
                return ctx.reply("📧 Enter the **Recipient's Email Address**:");
    
            case "bulk_collect_email":
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message)) {
                    return ctx.reply("⚠️ **Invalid Email Format.** Please enter a valid email address.");
                }
                userState.set(chatId, { ...state, step: "bulk_collect_payee_id", email: message });
                return ctx.reply("🆔 Enter the **Payee ID (Bulk Transfer Recipient Identifier)**:");
    
            case "bulk_collect_payee_id":
                if (!/^[a-zA-Z0-9_-]{3,50}$/.test(message)) {
                    return ctx.reply("⚠️ **Invalid Payee ID.** It must be **3-50 alphanumeric characters**.");
                }
                userState.set(chatId, { ...state, step: "bulk_collect_amount", payeeId: message });
                return ctx.reply("💰 Enter the **Transfer Amount (USD)**:");
    
            case "bulk_collect_amount":
                const amount = parseFloat(message);
                if (isNaN(amount) || amount <= 0 || amount > 9223372036854775807) {
                    return ctx.reply("⚠️ **Invalid Amount.** Please enter a valid **number** (max: 9223372036854775807 USD).");
                }
                userState.set(chatId, { ...state, step: "bulk_collect_currency", amount: amount.toString() });
                return ctx.reply("💵 Enter the **Currency (USD only)**:");
    
            case "bulk_collect_currency":
                if (message.toUpperCase() !== "USD") {
                    return ctx.reply("⚠️ **Invalid Currency.** Only **USD** is supported.");
                }
                userState.set(chatId, { ...state, step: "bulk_add_more_or_confirm", currency: message });
    
                const request = {
                    requestId: `bulk-req-${Date.now()}`,
                    request: {
                        walletAddress: state.walletAddress,
                        email: state.email,
                        payeeId: state.payeeId,
                        amount: state.amount,
                        purposeCode: "self",
                        currency: message,
                    },
                };
    
                const updatedRequests = [...(state.requests || []), request];
                userState.set(chatId, { ...state, requests: updatedRequests });
    
                return ctx.reply(
                    `✅ **Bulk Transfer Request Added:**\n` +
                    `🔹 **Wallet:** ${state.walletAddress}\n` +
                    `📧 **Email:** ${state.email}\n` +
                    `🆔 **Payee ID:** ${state.payeeId}\n` +
                    `💰 **Amount:** ${state.amount} ${message}\n\n` +
                    `📌 **Would you like to add another bulk transfer?**\nType **'bulk add'** to add another request or **'bulk confirm'** to proceed with submission.`
                );
    
            case "bulk_add_more_or_confirm":
                if (message.toLowerCase() === "bulk add") {
                    userState.set(chatId, { ...state, step: "bulk_collect_wallet" });
                    return ctx.reply("📤 **Adding another bulk transfer request...**\n\n🔹 Enter the **Wallet Address**:");
                } else if (message.toLowerCase() === "bulk confirm") {
                    if (!state.requests || state.requests.length === 0) {
                        return ctx.reply("⚠️ **You need to add at least one bulk transfer request before confirming.**");
                    }
    
                    const batchData = {
                        requests: state.requests,
                    };
    
                    userState.delete(chatId); // Clear user state before sending request
                    const token: any = getSession(chatId);
    
                    // Simulate API request
                    await sendBulkBatchTransfer(token, batchData);
    
                    return ctx.reply("✅ **Bulk Transfer Request Submitted Successfully!**");
                } else {
                    return ctx.reply("⚠️ **Invalid Input.** Type **'bulk add'** to add another request or **'bulk confirm'** to proceed.");
                }
            
                 default:
            return ctx.reply("❓ Sorry, I didn't understand. Type 'help' for assistance.");
    }
});


bot.on("text", async (ctx :any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    // Check if user is logged in
 

    // Handle login process

});

// Main menu with buttons
function showMainMenu(ctx: any) {
    const keyboard = [
        [
            { text: "1️⃣ Get Details", callback_data: "get_details" },
            { text: "2️⃣ Check KYC Status", callback_data: "check_kyc" }
        ],
        [
            { text: "3️⃣ Get Latest Transactions", callback_data: "get_transactions" }
        ],
        [
            { text: "4️⃣ Wallet Management", callback_data: "wallet_management" },
            { text: "5️⃣ Fund Transfer", callback_data: "fund_transfer" }
        ],
       
        [
            { text: "🚪 Logout", callback_data: "logout" }
        ]


      
    ];

    ctx.reply("🛠️ Menu Settings:", { reply_markup: { inline_keyboard: keyboard } });
}

// Handle menu commands (button presses)
bot.action("show_menu", (ctx) => {
    showMainMenu(ctx);
});

bot.action("wallet_management", (ctx) => {
    
    showWalletMenu(ctx);
});

bot.action("fund_transfer", (ctx) => {
    showFundTransferMenu(ctx);
});

bot.action("get_details",async (ctx:any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    const token:any = getSession(chatId);

    const userDetails:any = await getUserDetail(token);
   


    const formattedDetails = `
    📋  Fetching your details... 

    👤 Name: ${userDetails.firstName || "N/A"} ${userDetails.lastName || "N/A"}
    📧  Email: ${userDetails.email}
    🔑 Status: ${userDetails.status}
    🛡️ Role: ${userDetails.role}
    💼 Type: ${userDetails.type}
    💳 Wallet Address: ${userDetails.walletAddress}
    💼 Wallet Account Type: ${userDetails.walletAccountType}
 
    `;
    
    ctx.reply(formattedDetails);


});

bot.action("check_kyc", async(ctx:any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    const token:any = getSession(chatId);

           const kycStatus = await checkKYC(token);
            if (kycStatus.approved) {
                ctx.reply("🎉 KYC verified! You can now use CopperX services.");
            } else {
                ctx.reply(`⚠️ KYC pending. Please complete verification here: ${kycStatus?.url}`);
            }
});

bot.action("get_transactions",async (ctx:any) => {


    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    const token:any = getSession(chatId);

           const transactionData: any = await getTransactionHistory(token);

           const transactionsToShow = transactionData?.data.slice(0, 10); // Limiting to 10 transactions

           let transactionDetails = "";
           transactionsToShow.forEach((transaction:any, index:any) => {
             transactionDetails += `
             🧾  Transaction ${index + 1}: 
             🔹  Status:  ${transaction.status}
             💵  Amount Sent:  ${transaction.fromAmount} ${transaction.fromCurrency}
             💸  Amount Received:  ${transaction.toAmount} ${transaction.toCurrency}
             \n`;
           });
           
           const userSummary = `

           
            Transactions: 
           ${transactionDetails}
           `;
           if( transactionData?.data?.length === 0)
            ctx.reply("❌ No Transaction to Show ");
             else
           ctx.reply(userSummary);
});

// Wallet Management menu with buttons
function showWalletMenu(ctx: any) {
    const keyboard = [
        [
            { text: "4.1 Get All Wallets", callback_data: "get_all_wallets" },
            { text: "4.2 Get Balances", callback_data: "get_balances" }
        ],
        [
            { text: "4.3 Set Default Wallet", callback_data: "set_default_wallet" },
            { text: "4.4 Get Default Wallet", callback_data: "get_default_wallet" }
        ],
        [
            { text: "📌 View Menu Again", callback_data: "show_menu" }
        ]
    ];

    ctx.reply("🔹 Wallet Management:", { reply_markup: { inline_keyboard: keyboard } });
}

// Fund Transfer menu with buttons
function showFundTransferMenu(ctx: any) {
    const keyboard = [
        [
            { text: "5.1 Email Transfer", callback_data: "email_transfer" },
            { text: "5.2 Wallet Transfer", callback_data: "wallet_transfer" }
        ],
        [
            { text: "5.3 Bank Withdrawal", callback_data: "bank_withdrawal" },
            { text: "5.4 Bulk Transfers", callback_data: "bulk_transfers" }
        ],
        [
            { text: "5.5 Transfer Listing", callback_data: "transfer_listing" }
        ],
        [
            { text: "📌 View Menu Again", callback_data: "show_menu" }
        ]
    ];

    ctx.reply("🔹 Fund Transfer:", { reply_markup: { inline_keyboard: keyboard } });
}

// Handle fund transfer actions (button presses)
bot.action("get_all_wallets", async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if (!isLoggedIn(ctx))
        return ctx.reply(`❌ Please login using '/login' first to check your wallets.`);

    const token: any = getSession(chatId);
    const WalletData: any = await getWallets(token);

    if (!WalletData || WalletData.length === 0) {
        return ctx.reply("⚠️ No wallets found for your account.");
    }

    // Store wallet data in the user session
    userState.set(chatId, { ...state, WalletData });

    const walletDetails = WalletData.map((wallet: any, index: number) => {
        return {
            text: `${index +1 } 🪙 **Network:** ${wallet.network}\n📌 **Address:** \`${wallet.walletAddress}\``,
            walletAddress: wallet.walletAddress,
            index: index // Add index for unique identifier
        };
    });

    const keyboard = walletDetails.map((wallet: any,index:any) => {
        // Use index as the callback_data to avoid long wallet addresses
        return [
            {
                text: `📋 Copy  Wallet Address ${index+1}`,
                callback_data: `copy_${wallet.index}` // Reference by index instead of full address
            }
        ];
    });

    console.log(WalletData, "WalletData");

    // Send the wallets with a copy button
    await ctx.replyWithMarkdownV2(
        `💰 **Your Wallets:**\n\n${walletDetails.map((wallet:any) => wallet.text).join("\n\n")}`,
        {
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
});

bot.action(/^copy_(\d+)$/, async (ctx: any) => {
    try {
        const chatId = ctx.chat.id.toString();
        const state = userState.get(chatId);
        const walletIndex = parseInt(ctx.match[1]);
        const WalletData = state?.WalletData; // Retrieve wallet data from the stored state

        if (!WalletData || !WalletData[walletIndex]) {
            return ctx.answerCbQuery("⚠️ Wallet not found.");
        }

        const walletAddress = WalletData[walletIndex].walletAddress;

        // Send a confirmation message when the address is copied
        await ctx.answerCbQuery(`✅ Address copied: \`${walletAddress}\``);
    } catch (error) {
        console.error("Error answering callback query:", error);
        try {
            // If the query times out or is invalid, we can send an error message to the user
            await ctx.answerCbQuery("⚠️ Oops, this action has expired. Please try again.");
        } catch (e) {
            console.error("Error sending callback query error:", e);
        }
    }
});





bot.action("get_balances", async (ctx:any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    const token: any = getSession(chatId);

    const WalletDAta: any = await getBalances(token);

  

    const walletDetails = WalletDAta.map((wallet: any) => {
        const balanceDetails = wallet.balances
            .map((balance: any) => {
                return `🪙  ${balance.symbol} : ${balance.balance} (Address: ${balance.address})`;
            })
            .join('\n');

        return `🌐  Network: ${wallet.network} (${wallet.isDefault ? 'Default' : 'Not Default'})
${balanceDetails}`;
    }).join('\n\n');


    ctx.reply(`💰  Wallet Details:\n\n${walletDetails}`);


});






bot.action("set_default_wallet", async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);
  
    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    // Set state to monitor user selection
    userState.set(chatId, { action: "set_default_wallet" });
  
    const token: string | null = getSession(chatId);
    if (!token) {
      return ctx.reply("❌ No session token found.");
    }
  
    const walletData: any = await getWallets(token);
  
    if (walletData.length === 0) {
      return ctx.reply("❌ No wallets found to set as default.");
    }
  
    // Show wallets as options
    const walletButtons = walletData.map((wallet: any) => {
      return [Markup.button.callback(`${wallet.network}: ${wallet.walletAddress}`, `select_wallet_${wallet.id}`)];
    });
  
    // Add a cancel button
    walletButtons.push([Markup.button.callback("❌ Cancel", "cancel_set_default_wallet")]);
  
    // Ask the user to select a wallet
    await ctx.reply("🔧 Please choose the wallet you want to set as default:", Markup.inlineKeyboard(walletButtons));
  });
  
  // Action to handle wallet selection
  bot.action(/^select_wallet_(.+)$/, async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);
  
    // Only proceed if the user is in the 'set_default_wallet' state
    if (state?.action !== "set_default_wallet") {
      return ctx.reply("❌ You are not in the correct state to set a default wallet.");
    }
  
    const walletId = ctx.match[1]; // Extract walletId from the callback data
  
    // You may want to validate this walletId against your wallet list here

    const token :any = getSession(chatId)
    const walletData: any = await getWallets(token);
    console.log( walletId ,'dadada'  )
    console.log( walletData[0] ,'walletwallet'  )
    
    const selectedWallet = walletData.find((wallet: any) => wallet.id === walletId);
  
    if (!selectedWallet) {
      return ctx.reply("❌ Invalid wallet selected.");
    }
  
    // Call the function to set this wallet as default
    await setDefaultWalletAddress(token , walletId);
  
    // Confirm the selection to the user
    await ctx.reply(`✅ Wallet ${selectedWallet.network}: ${selectedWallet.walletAddress} has been set as your default wallet.`);
  
    // Reset the state
    userState.set(chatId, { step: "default" });
  });
  
  // Action to handle canceling the set default wallet process
  bot.action("cancel_set_default_wallet", async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
  
    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    // Reset the user's state to end the process
    userState.set(chatId, { step: "default" });
  
    // Notify the user that the process was canceled
    await ctx.reply("❌ The process to set a default wallet has been canceled.");
  });

bot.action("get_default_wallet",async (ctx:any) => {


    const chatId = ctx.chat.id.toString();
    const state = userState.get(chatId);

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    const token: any = getSession(chatId);

    const WalletDAta: any = await getDefaultWallet(token);
    console.log('WalletDAta',WalletDAta)

  




    
    ctx.reply( ` 🔐 Default wallet Address is :  ${WalletDAta?.walletAddress}`   );
});

bot.action("email_transfer", async (ctx: any) => {
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    // Set user state to track progress
    userState.set(chatId, { step: "collect_email" });

    // Ask the user for their wallet address
    return ctx.reply("🔹 Enter the recipient's email address :\n\nType '❌ Cancel' to stop.");
});




// Handle user messages for step-by-step input collection


bot.action("wallet_transfer", (ctx:any) => {
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    // Set user state to track progress
    userState.set(chatId, { step: "Wallet_transfer_wallet" });

    // Ask the user for their wallet address
    return ctx.reply("🔹 Enter Wallet address (For Example : 0x9021212.....):\n\nType '❌ Cancel' to stop.");
});

bot.action("bank_withdrawal", async (ctx:any) => {
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    userState.set(chatId, { step: "collect_invoice_number" });
    return ctx.reply("🏦 Initiating bank withdrawal...\n\n📄 Please enter the **Invoice Number**:");
});

bot.action("bulk_transfers", async (ctx:any) => {
    const chatId = ctx.chat.id.toString();

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    userState.set(chatId, { step: "bulk_collect_wallet", requests: [] });
    return ctx.reply("📤 Initiating **Bulk Transfers**...\n\n🔹 Please enter the **Wallet Address**:");
});


bot.action("transfer_listing", async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
    userState.set(chatId, { step: "awaiting_transfer_page" });

    if(!isLoggedIn(ctx))
        return ctx.reply(` Please login  '/login' first to check balance`);
    return ctx.reply(
        "🔍 Please enter the page number you want to fetch (e.g., `1`).\n\n" +
        "📌 Type '❌ Cancel' to exit."
    );
});

bot.action("logout", (ctx:any) => {
    const chatId = ctx.chat.id.toString();

    // Delete the user's session to log them out

    if(isLoggedIn(ctx))
    {
    deleteSession(chatId);

    // Send confirmation message and show the login prompt again
    ctx.reply("🚪 You have been logged out. Please use /login to authenticate again.");
    }
    else
    ctx.reply("You must be logged in to log out");
});



console.log("🚀 Bot is running...");
