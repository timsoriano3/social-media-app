const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { validateRegisterInput, validateLoginInput } = require('../../utils/validators')
const { SECRET_KEY } = require('../../config');
const User = require('../../models/User');
const { UserInputError } = require('apollo-server');

function generateToken(user){
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        }, 
        SECRET_KEY, 
        { expiresIn: '1h' }
    );
}

module.exports = {
    Mutation: {
        async login(_, { username, password }){
            const {valid, errors} = validateLoginInput(username, password);
            const user = await User.findOne({ username });

            if(!valid){
                throw new UserInputError('Errors', { errors });
            }

            if(!user){
                errors.general = 'User not found';
                throw new UserInputError('User not found', { errors });
            }

            const match = await bcrypt.compare(password, user.password);
            if(!match) {
                errors.general = 'Incorrect credentials';
                throw new UserInputError('Incorrect credentials', { errors });
            }

            const token = generateToken(user);

            return {
                ...user._doc,
                id: user._id,
                token
            };
        },
        async register(_, 
            { 
                registerInput : {username, email, password, confirmPassword } 
            }, 
            context, 
            info
        ){
            // TODO Validate user data
            const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword);
            if(!valid){
                throw new UserInputError('Errors', { errors });
            }
            // TODO hash password and create an auth token
            password = await bcrypt.hash(password, 12);

            const newUser = new User({
                email,
                username,
                password,
                createdAt: new Date().toISOString()
            });

            const res = await newUser.save();

            const token = generateToken(res);

            return {
                ...res._doc,
                id: res._id,
                token
            };
        }
    }
}