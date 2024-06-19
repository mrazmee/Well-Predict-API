const jwt = require("jsonwebtoken");
const saltRounds = 10;
const bcrypt = require("bcrypt");
const { knex } = require("../configs/db");
const { validateEmail, validatePassword } = require("../validate/validate");
const axios = require('axios');

const register = async (req, res) => {
    const { name, email, password } = req.body;
    
    //checking all atributes
    if(!name || !email || !password){
        return res.status(400).send({
            code: '400',
            status: 'Bad Request',
            errors:{
                message: 'Missing attribute'
            }
        })
    }

    //validate email format
    if(validateEmail(email)){
        return res.status(400).send({
            code: "400",
            status: 'Bad Request',
            errors:{
                message: 'Invalid format email'
            }
        })
    }

    //validate password
    if(validatePassword(password)){
        return res.status(400).send({
            code: '400',
            status: 'Bad Request',
            errors: {
                message: 'The password must be between 8-16 characters and contain numbers'
            }
        })
    }

    //validate email exist
    const verifEmail = await knex('users').where('email', email);
    if(verifEmail.length !== 0){
        return res.status(400).send({
            code: '409',
            status: 'Conflict',
            errors:{
                message: 'Email already exist'
            }
        })
    }

    const user = {
        name,
        email,
        password
    }

    bcrypt.genSalt(saltRounds, function(err, salt){
        bcrypt.hash(user.password, salt, function(err, hash){
            if(err) throw err;
            user.password = hash;
            //Store data user to database
            knex('users').insert(user).then(res.status(200).send({
                code: '200',
                status: 'success',
                data:{
                    message: 'Register succes. please log in'
                }
            }))
        })
    })
}

const login = async (req, res) => {
    const { email, password } = req.body;

    //validate email
    const validationEmail = await knex('users').where('email',email);
    if(validationEmail.length === 0){
        return res.status(401).send({
            code: '401',
            status: 'Unauthorized',
            errors: {
                message: 'Inccorect email or password'
            }
        })
    }

    //validate password
    bcrypt.compare(password, validationEmail[0].password, function(err, result){
        if(result){
            const user = {
                user_id: validationEmail[0].user_id,
                email: validationEmail[0].email,
                name: validationEmail[0].name,
                password: validationEmail[0].password,
                createdAt: validationEmail[0].createdAt
            }

            //Create JWT
            const accesToken = jwt.sign(user, process.env.ACCES_TOKEN_KEY, {expiresIn: '1hr'});
            const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_KEY, {expiresIn: '365d'});

            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY, function(err, decoded){
                const data = {
                    user_id: validationEmail[0].user_id,
                    token: refreshToken,
                    created_at: new Date(decoded.iat * 1000).toISOString()
                    .slice(0, 19).replace('T', ' '),
                    expires_at: new Date(decoded.exp * 1000).toISOString()
                    .slice(0, 19).replace('T', ' '),
                }
                knex('tokens').insert(data).then(res.status(200).send({
                    code: '200',
                    status: 'ok',
                    data: {
                        accesToken: accesToken,
                        refreshToken: refreshToken
                    }
                }))
            })
        }else{
            return res.status(401).send({
                code:'401',
                status: 'Unauthorized',
                errors:{
                    message: 'Incorrect email or password'
                }
            })
        }
    })
}

const token = async (req, res) => {
    const { name, email, user_id } = req;
    const user = {
        user_id,
        name,
        email
    }

    //create JWT
    const accesToken = jwt.sign(user, process.env.ACCES_TOKEN_KEY, {expiresIn: '1hr'});
    return res.status(200).send({
        code: '200',
        status: 'success',
        data: {
            accesToken: accesToken
        }
    })
}

const logout = async (req, res) => {
    const refreshToken = req.refreshToken;
    try{
        const result = await knex('tokens').where('token', refreshToken).del();

        if(result == 1){
            return res.status(200).send({
                code: '200',
                status: 'succes',
                data:{
                    message: 'Sign out success'
                }
            })
        }
    }catch(err){
        return res.status(500).send({
            code: '500',
            status: 'Internal Server Error',
            errors:{
                message: 'An error occurred while fetching data'
            }
        })
    }
}

const getSymptoms = async (req, res) => {
    const symptoms = await knex('symptoms').select('*');

    return res.status(200).json({
        code: '200',
        status: 'ok',
        symptoms : symptoms
    })
}

const predict = async (req, res) => {
    const data = req.body;
    const { user_id } = req;

    //check input must be an array
    if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
        return res.status(400).send({
            code: '400',
            status: 'fail',
            message: 'Invalid symptoms input',
        });
    }

    try {
        // Sending data to model endpoints using Axios
        const response = await axios.post('https://predict-api-sgvhineptq-et.a.run.app/predict', data);

        // Store the response of the endpoint model in a variable
        const result = response.data.Prediction;
        const userHistories = {
            user_id: user_id,
            symptoms: JSON.stringify(data.symptoms),
            result: result
        }

        // Store user history to database
        await knex('histories').insert(userHistories);

        res.status(200).send({
            code: '200',
            status: 'ok',
            data: {
                userHistories
            }
        });

    } catch (error) {
        if (error.message.includes('knex')) {
            console.error('Fail to store data:', error.message);
            res.status(400).send({
                code: '400',
                status: 'fail',
                errors: {
                    message: 'Fail to store data'
                }
            });
        } else {
            console.error('Error in sending data to model endpoints:', error.message);
            res.status(400).send({
                code: '400',
                status: 'fail',
                errors: {
                    message: 'Error in sending data to endpoint B'
                }
            });
        }
    }
}

const getHistories = async (req, res) => {
    const { user_id } = req;

    try{
        const histories = await knex('histories').select('histories.history_id', 'histories.user_id', 'users.name', 'histories.symptoms', 'histories.result', 'histories.created_at').innerJoin('users', 'histories.user_id', 'users.user_id').where('histories.user_id', user_id);

        res.status(200).send({
            code: '200',
            status: 'success',
            data : histories
        })

    }catch(error){
        console.log('Error fetching histories with users:', error.message);
        res.status(400).send({
            code: '400',
            status: 'fail',
            errors:{
                message: 'Error fetching histories with users'
            }
        })
    }
}

module.exports = { register, login, token, logout, getSymptoms, predict, getHistories }