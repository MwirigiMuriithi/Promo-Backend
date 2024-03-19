const express = require('express')

//controllers
const { signupUser, loginUser } = require('../controllers/userController')

const router = express.Router()


//login router
router.post('/login', loginUser)

//signup route
router.post('/signup', signupUser)



module.exports = router