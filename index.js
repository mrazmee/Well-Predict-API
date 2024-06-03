const express = require("express");
require("dotenv").config();
const { knex } = require("./configs/db")
const userRoute = require("./route/userRoute")

// Test the connection
knex.raw('SELECT 1+1 AS result')
    .then((results) => {
      console.log('Connection to database successful.');
    })
    .catch((error) => {
      console.error('Error connecting to the database:', error);
    });

const app = express();
const port = process.env.PORT;

const v1Router = express.Router();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.status(200).send({
        code: "200",
        status: 'success',
        message: 'Welcome to Well Predict API'
    })
})

v1Router.use('/user', userRoute);

app.use('/v1', v1Router);

app.use((req, res, next) => {
    res.status(404).send({
        code: '404',
        status: 'fail',
        message: 'The page or resource you\'re looking for could not be found.'
    })
})

app.listen(port, () => {
    console.log(`Well Predict app listening at http://localhost:${port}`);
})