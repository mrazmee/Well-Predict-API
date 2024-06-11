const jwt = require("jsonwebtoken");
const { knex } = require("../configs/db")

const authenticateAccesToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(token === null){
        return res.status(401).send({
            code: '401',
            status: 'Unauthorized',
            errors:{
                message: 'No token provided'
            }
        })
    }

    jwt.verify(token, process.env.ACCES_TOKEN_KEY, function(err, decoded){
        if(err){
            if(err.name === 'TokenExpiredError'){
                //handler for token expired
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errrors:{
                        message: 'Token expired. Please get new access token'
                    }
                })
            }else if(err.name === 'JsonWebTokenError'){
                //handler for invalid token
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errors:{
                        message: 'Invalid Token'
                    }
                })
            }else{
                console.log(err);
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errors:{
                        message: 'Unknown Error'
                    }
                })
            }
        }

        req.email = decoded.email;
        req.name = decoded.name;
        req.user_id = decoded.user_id;
        req.created_at = decoded.created_at;
        next()
    })
}

const authenticateRefreshToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(token === null){
        return res.status(401).send({
            code: '401',
            status: 'Unauthorized',
            errors:{
                message: 'No token provided'
            }
        })
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_KEY, async function(err, decoded){
        if(err){
            if(err.name === 'TokenExpiredError'){
                //handler for token expired
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errrors:{
                        message: 'Token expired. Please sign in again'
                    }
                })
            }else if(err.name === 'JsonWebTokenError'){
                //handler for invalid token
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errors:{
                        message: 'Token invalid. Please sign in again'
                    }
                })
            }else{
                console.log(err);
                return res.status(401).send({
                    code: '401',
                    status: 'Unauthorized',
                    errors:{
                        message: 'Unknown Error. Please sign in again'
                    }
                })
            }
        }

        const checkDatabase = await knex('tokens').where('token', token);
        if(checkDatabase.length == 0){
            return res.status(401).send({
              code: '401',
              status: 'Unauthorized',
              errors: {
                message: 'Token Revoked. Please sign in again',
              },
            });
        }else{
            req.refreshToken = token;
        }

        req.email = decoded.email;
        req.name = decoded.name;
        req.user_id = decoded.user_id;
        req.created_at = decoded.created_at;
        next()
    })
}

module.exports = { authenticateAccesToken, authenticateRefreshToken }