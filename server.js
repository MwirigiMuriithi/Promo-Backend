require('dotenv').config()
const connection = require('./db.js')
const User = require('./models/userModel');
const cors = require('cors');
const Payment = require("./models/payments");
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Referral = require('./models/referral')
const bodyParser = require('body-parser');

const express = require('express')
const mongoose = require('mongoose')
const workoutRoutes = require('./routes/workouts')
const userRoutes = require('./routes/user')
const salesRoutes = require('./routes/sales.js')

// Import routes for user points and leaderboard
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin'); // Import admin routes
const contactRoutes = require('./routes/contact.js')
const blogPostsRouter = require('./routes/blogPost');

// express app
const app = express()

connection()

// middleware
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

// Allow cross-origin requests
app.use(cors());

// routes
//message routes
app.use('/api/workouts', workoutRoutes)
app.use('/api/user', userRoutes)
app.use('/api/sales', salesRoutes)

// Use dashboard routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes); // Use admin routes


//contact routes
app.use('/api/contact', contactRoutes);

//blog routes 
app.use('/api/blog', blogPostsRouter);


//payment processingfunction

  
  app.use(bodyParser.json()); // Use body-parser for JSON parsing
  app.use(bodyParser.urlencoded({ extended: true })); // Use body-parser for URL-encoded data
  app.use(cors());
  
  const generateToken = async (req, res, next) => {
    const secret = process.env.MPESASECRETKEY;
    const consumerkey = process.env.MPESA_CONSUMER_KEY;
    const auth = Buffer.from(`${consumerkey}:${secret}`, "utf-8").toString("base64");
    try {
        const response = await axios.get("https:/api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        req.token = response.data.access_token;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate token' });
    }
};
  
  let processPaymentPromise = null; // Promise to store process payment data
  let callbackDataPromise = null; // Promise to store callback data
  
  // Route to process payment
  app.post('/process-payment', generateToken, async (req, res, next) => {
      try {
          console.log('Request Body for Process Payment:', req.body);
          const { phoneNumber, referralCode, username } = req.body;
  
          // Access phone number from request body
          const phone = phoneNumber;
  
          // Remove leading zero and add country code
          const formattedPhone = `254${phone.slice(1)}`;
  
          const date = new Date();
          const timestamp = date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2);
  
          const amount = "1"
          const shortcode = process.env.STORENUMBER;
          const till = process.env.TILL;
          const passkey = process.env.MPESA_PASSKEY;
          const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");
  
          const response = await axios.post(
              "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
              {
                  BusinessShortCode: shortcode,
                  Password: password,
                  Timestamp: timestamp,
                  TransactionType: "CustomerBuyGoodsOnline",
                  Amount: amount,
                  PartyA: formattedPhone,
                  PartyB: till,
                  PhoneNumber: formattedPhone,
                  CallBackURL: "https://9d3f-105-163-0-74.ngrok-free.app/sales/callback",
                  AccountReference: formattedPhone,
                  TransactionDesc: "Promopay",
              },
              {
                  headers: {
                      Authorization: `Bearer ${req.token}`
                  },
              }
          );
          console.log('Response for Process Payment:', response.data);
          res.status(200).json(response.data);
  
          // Set the processPaymentPromise to resolve
          processPaymentPromise = Promise.resolve();
          next();
  
      } catch (error) {
          console.error('Error processing payment:', error);
          res.status(400).json({ error: 'Failed to initiate STK push' });
      }
  });
  
  // Callback route to receive payment data
  app.post("/callback", async (req, res) => {
      try {
          const callbackData = req.body;
          console.log('Callback Data:', callbackData);
  
          // Store the callback data temporarily and resolve the promise
          callbackDataPromise = new Promise((resolve) => {
              // Resolve the promise with the received data
              resolve(callbackData);
          });
  
          res.status(200).json({ success: true });
      } catch (error) {
          console.error('Error processing callback:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
  
  // Route to confirm payment using the stored callback data
  app.post('/confirm-payment', async (req, res) => {
      try {
          // Ensure that callback data is available by waiting for the promise to resolve
          const callbackData = await callbackDataPromise;
  
          // Extract necessary information from the callback data
          console.log('Request Body for Callback:', callbackData); // Log the callback data
          const { phoneNumber, referralCode, username } = req.body
  
          // Your payment confirmation logic here...
          if (!callbackData.Body.stkCallback.CallbackMetadata) {
              console.log(callbackData.Body);
              return res.status(400).json({ error: 'Payment failed' });
            }
        
            console.log(callbackData.Body.stkCallback.CallbackMetadata);
        
            const phone = callbackData.Body.stkCallback.CallbackMetadata.Item[4].Value;
            const amount = callbackData.Body.stkCallback.CallbackMetadata.Item[0].Value;
            const transactionId = callbackData.Body.stkCallback.CallbackMetadata.Item[1].Value;
        
            // Payment was successful
            // Generate referral code for the user
            const generatedReferralCode = generateReferralCode();
        
            // Update the user with the referral code
            const user = await User.findOneAndUpdate({ phoneNumber: phone }, { referralCode: generatedReferralCode }, { new: true });
        
            // If a referral code was provided, update the referrer's points
            if (user.referralCode) {
              const referrer = await User.findOne({ referralCode: user.referralCode });
              if (referrer) {
                // Add points to the referrer's balance
                const pointsToAdd = 100; // You can customize this value
                await User.findByIdAndUpdate(referrer._id, { $inc: { points: pointsToAdd } });
        
                // Log the points addition in the database
                const logEntry = {
                  description: `Earned ${pointsToAdd} points for referring a user (${user._id})`,
                  timestamp: new Date(),
                };
        
                // Push the log entry to the referrer's pointsLog
                referrer.pointsLog.push(logEntry);
                await referrer.save();
              }
            }
        
            // Save the payment with referralCode and username
            const payment = new Payment({ phoneNumber: phone, referralCode: generatedReferralCode, amount, transactionId, username });
            await payment.save();
        
          res.status(200).json({ success: true });
      } catch (error) {
          console.error('Error processing callback:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  });
// connect to db
const port = process.env.PORT || 4000;

app.listen(port, () => console.log(`Hello Motherfucker! fuck you and write some code!`))
module.exports = app;
