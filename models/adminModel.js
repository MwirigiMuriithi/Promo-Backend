const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config()
const Schema = mongoose.Schema;

const adminSchema = new Schema({
    admin: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

// Static methods for admin signup and login
adminSchema.statics.signup = async function (adminName, password, secretKey) {
    if (!adminName || !password || !secretKey) {
        throw new Error('All fields must be filled');
    }

    // Check if the provided secret key matches the one stored in the environment variable
    const storedSecretKey = process.env.ADMIN_SECRET_KEY;
    if (secretKey !== storedSecretKey) {
        throw new Error('Invalid secret key');
    }
    const exists = await this.findOne({ admin: adminName });
    if (exists) {
        throw new Error('Admin already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const admin = await this.create({ admin: adminName, password: hash });
    return admin;
};

adminSchema.statics.login = async function (adminName, password) {
    if (!adminName || !password) {
        throw new Error('All fields must be filled');
    }

    const admin = await this.findOne({ admin: adminName });
    if (!admin) {
        throw new Error('Admin not found');
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
        throw new Error('Incorrect password');
    }

    return admin;
};

module.exports = mongoose.model('Admin', adminSchema);
