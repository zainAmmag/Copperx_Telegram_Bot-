import express from 'express';
import bodyParser from 'body-parser';
import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from './config';  // Import your token from config

// Create the bot instance
const bot = new Telegraf(BOT_TOKEN);

const app = express();
app.use(bodyParser.json());  // Middleware to parse JSON requests

// Webhook endpoint that will receive updates from Telegram
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;  // Telegram update sent to the webhook
    console.log('Received update:', update);
    
    // Process the update using Telegraf's handleUpdate method
    await bot.handleUpdate(update);
    
    res.send('OK');  // Respond with 'OK' to acknowledge receipt
  } catch (error) {
    console.error('Error processing update:', error);
    res.status(500).send('Error');  // Send error response if something fails
  }
});

// Start the server on a specific port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
