// generateToken.js
require('dotenv').config()
const axios = require('axios');

const generateToken = async () => {
    const secret = process.env.MPESASECRETKEY;
    const consumerkey = process.env.MPESA_CONSUMER_KEY;
    const auth = Buffer.from(`${consumerkey}:${secret}`, "utf-8").toString("base64");
    try {
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        return response.data.access_token;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to generate token');
    }
};

module.exports = generateToken;
