// REFERENCE: https://www.geeksforgeeks.org/reactjs/how-to-connect-mongodb-with-reactjs/
require("dotenv").config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require("cors");

const app = express();

// MongoDB connection
mongoose.connect(process.env.mongo_url).then(() => {
    console.log('Connected to database');
});

// Schema for users of the app
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model('users', UserSchema);

// Express setup
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000' // React frontend URL
}));

// Sample route to check if the backend is working
app.get("/", (req, resp) => {
    resp.send("App is working");
});

// API to register a user
app.post("/register", async (req, resp) => {
    try {
        const user = new User(req.body);
        let result = await user.save();
        if (result) {
            delete result.password;
            resp.status(201).send(result);
        } else {
            console.log("User already registered");
            resp.status(400).send("User already registered");
        }
    } catch (e) {
        resp.status(500).send({ message: "Something went wrong", error: e.message });
    }
});

app.get("/emailverf", async (req, resp) => {
    const {email} = req.query;
    const existing = await User.findOne({email});
    resp.send({exists: !!existing});
});

// Start the server
app.listen(5000, () => {
    console.log("App is running on port 5000");
});