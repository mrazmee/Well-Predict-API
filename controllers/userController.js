const jwt = require("jsonwebtoken");
const saltRounds = 10;
const bcrypt = require("bcrypt");
const { knex } = require("../configs/db");
const { validateEmail, validatePassword } = require("../validate/validate");

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

module.exports = { register, login }