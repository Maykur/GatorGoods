// REFERENCE: https://www.geeksforgeeks.org/reactjs/how-to-connect-mongodb-with-reactjs/
// https://medium.com/@bhupendra_Maurya/password-hashing-using-bcrypt-e36f5c655e09
// https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require("dotenv").config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require("cors");
const bcrypt = require ('bcrypt');

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
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const ItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
    },
    itemCost: {
        type: String,
        required: true,
    },
    itemCondition: {
        type: String,
        required: true,
    },
    itemLocation: {
        type: String,
        required: true,
    },
    itemPicture: {
        type: String,
        required: true,
    },
    itemDescription: {
        type: String,
        required: true,
    },
    itemDetails: {
        type: String,
        required: true,
    },
    userPublishingID: {
        type: String,
        required: true,
    },
    userPublishingName: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model('users', UserSchema);
const Item = mongoose.model('items', ItemSchema);

// Express setup
app.use(express.json({limit: "10mb"}));
app.use(cors({
    origin: 'http://localhost:3000' // React frontend URL
}));

// Error middleware for entity.too.large errors
app.use((err, req, res, next) => {
    if (err.code === "entity.too.large" || err.type === "entity.too.large") {
        res.status(413).json({
            message: "File too large. Choose a smaller image and try again.",
        });
        return;
    }
    next(err);
});

// Sample route to check if the backend is working
app.get("/", (req, resp) => {
    resp.send("App is working");
});

// API to register a user
app.post("/register", async (req, resp) => {
  try {
    const { name, email, password } = req.body;
    const passEncrypt = await bcrypt.hash(password, 10);
    const result = await User.create({ name, email, password: passEncrypt });
    if (result) {
      resp.status(201).send({
        _id: result._id,
        name: result.name,
        email: result.email,
        date: result.date,
      });
    } else {
      console.log("User already registered");
      resp.status(400).send("User already registered");
    }
  } catch (e) {
    resp
      .status(500)
      .send({ message: "Something went wrong", error: e.message });
  }
});

// API to login user
app.post("/login", async (req, resp) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return resp.status(400).json({ message: "Invalid email/password" });
    }
    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch) {
      return resp.status(400).json({ message: "Invalid email/password" });
    }
    resp.json({
      message: "Successful login",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    resp
      .status(500)
      .send({ message: "Something went wrong", error: e.message });
  }
});

// API to verify email dupe
app.get("/emailverf", async (req, resp) => {
  const { email } = req.query;
  const existing = await User.findOne({ email });
  resp.send({ exists: !!existing });
});

// API to create item listing
app.post("/create-item", async (req, resp) => {
  try {
    const {
      itemName,
      itemCost,
      itemCondition,
      itemLocation,
      itemPicture,
      itemDescription,
      itemDetails,
      userPublishingID,
      userPublishingName,
    } = req.body;
    const result = await Item.create({
      itemName,
      itemCost,
      itemCondition,
      itemLocation,
      itemPicture,
      itemDescription,
      itemDetails,
      userPublishingID,
      userPublishingName,
    });
    if (result) {
      resp.status(201).send(result);
    } else {
      console.log("User already registered");
      resp.status(400).send("Item already registered");
    }
  } catch (e) {
    resp
      .status(500)
      .send({ message: "Something went wrong", error: e.message });
  }
});

// API to grab item listings
app.get("/items", async (req, resp) => {
  try {
    const items = await Item.find();
    resp.json(items);
  } catch (e) {
    resp.status(500).json({ message: "Failed to fetch", error: e.message });
  }
});

// Start the server
app.listen(5000, () => {
  console.log("App is running on port 5000");
});
