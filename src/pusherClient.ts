import axios from 'axios';
import Pusher from 'pusher-js';

const PUSHER_KEY = 'e089376087cac1a62785';  // Pusher Key
const PUSHER_CLUSTER = 'ap1';  // Pusher Cluster

// Assuming you have a token for authorization
const token = 'your_jwt_token'; // Token for user authentication

// Initialize Pusher client with authentication
const pusherClient = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  authorizer: (channel) => ({
    authorize: async (socketId: string, callback: Function) => {
      try {
        // Make the authentication request to your backend
        const response = await axios.post('/api/notifications/auth', {
          socket_id: socketId,
          channel_name: channel.name,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,  // Add token to request headers
          }
        });

        if (response.data) {
          callback(null, response.data);  // Successfully authenticated
        } else {
          callback(new Error('Pusher authentication failed'), null);  // Failed to authenticate
        }
      } catch (error) {
        console.error('Pusher authorization error:', error);
        callback(error, null);  // Handle error
      }
    }
  })
});

// Example to subscribe to the organization’s private channel
const organizationId = 'your_organization_id';  // Replace with actual organization ID
const channel = pusherClient.subscribe(`private-org-${organizationId}`);

// Bind to the subscription succeeded event
channel.bind('pusher:subscription_succeeded', () => {
  console.log('Successfully subscribed to private channel');
});

// Bind to the subscription error event
channel.bind('pusher:subscription_error', (error) => {
  console.error('Subscription error:', error);
});

// Bind to the 'deposit' event
channel.bind('deposit', (data: any) => {
  console.log('New deposit received:', data);

  // Here you can call your bot to send a message about the deposit
  bot.sendMessage(chatId, 
    `💰*New Deposit Received*\n\n` +
    `${data.amount} USDC deposited on Solana`
  );
});
