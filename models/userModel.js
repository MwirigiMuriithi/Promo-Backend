const mongoose = require('mongoose')

const validator = require ('validator')

const bcrypt = require('bcrypt')

const Schema = mongoose.Schema


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    
    phoneNumber: {
        type: String,
        default: null
    },
    points: {
        type: Number,
        default: 0
    },
    pointsLog: [
        {
            description: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    referralCode: {
        type: String,
        default: null
    },
    isNew: {
        type: Boolean,
        default: true // Set to true by default for new users
    }
})

// Schedule a task to update isNew field for existing users
const updateIsNewField = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
    await User.updateMany({ createdAt: { $lt: twentyFourHoursAgo }, isNew: true }, { isNew: false });
};

// Run the task every 24 hours
setInterval(updateIsNewField, 24 * 60 * 60 * 1000);


//static signup method
userSchema.statics.signup = async function (username, password){

    // validation
    if(!username || !password){
        throw Error('All fields must be filled')
    }
    if (!validator.isStrongPassword(password)){
        throw Error('weak password')
    }
    const exists = await this.findOne({ username })

    if (exists) {
        throw Error('Username already in use')
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await this.create({ username, password: hash})

    return user
}

//static login method
userSchema.statics.login = async function (username, password){
    
    // validation
    if(!username || !password){
        throw Error('All fields must be filled')
    }

    const user = await this.findOne({ username })

    if(!user){
        throw Error(' Username not found')
    }

    const match = await bcrypt.compare(password, user.password)
    if(!match){
        throw Error('Incorrect password')
    }

    return user
}



module.exports = mongoose.model ('User', userSchema)