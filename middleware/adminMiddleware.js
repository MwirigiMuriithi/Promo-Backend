const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

const requireAdminAuth = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authorization.split(' ')[1];
    try {
        const { _id } = jwt.verify(token, process.env.SECRET);
        const admin = await Admin.findOne({ _id });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        req.admin = admin;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Request is not authorized' });
    }
};

module.exports = requireAdminAuth;
