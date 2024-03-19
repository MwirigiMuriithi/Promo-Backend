const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

const createToken = (_id) => {
    return jwt.sign({ _id }, process.env.SECRET, { expiresIn: '7d' });
};

const loginAdmin = async (req, res) => {
    const { admin, password } = req.body;
    try {
        const adminUser = await Admin.login(admin, password);
        const token = createToken(adminUser._id);
        res.status(200).json({ admin, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const signupAdmin = async (req, res) => {
    const { admin, password, secretKey } = req.body;
    try {
        const newAdmin = await Admin.signup(admin, password, secretKey);
        const token = createToken(newAdmin._id);
        res.status(200).json({ admin, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { loginAdmin, signupAdmin };
