// REFERENCE: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();

mongoose.connect(process.env.mongo_url).then(() => {
  console.log('Connected to database');
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

const Item = mongoose.model('items', ItemSchema);

app.use(express.json({ limit: '10mb' }));
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);

app.use((err, req, res, next) => {
  if (err.code === 'entity.too.large' || err.type === 'entity.too.large') {
    res.status(413).json({
      message: 'File too large. Choose a smaller image and try again.',
    });
    return;
  }

  next(err);
});

app.get('/', (req, resp) => {
  resp.send('App is working');
});

app.post('/create-item', async (req, resp) => {
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

    resp.status(201).json(result);
  } catch (e) {
    resp
      .status(500)
      .send({ message: 'Something went wrong', error: e.message });
  }
});

app.get('/items', async (req, resp) => {
  try {
    const items = await Item.find();
    resp.json(items);
  } catch (e) {
    resp.status(500).json({ message: 'Failed to fetch', error: e.message });
  }
});

app.listen(5000, () => {
  console.log('App is running on port 5000');
});
