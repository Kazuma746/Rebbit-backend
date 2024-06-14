// models/MyList.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MyListSchema = new Schema({
  pseudo: { type: Schema.Types.ObjectId, ref: 'User' },
  post: { type: Schema.Types.ObjectId, ref: 'Post' },
  comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  tags: { type: [String], required: true }
});

module.exports = mongoose.model('MyList', MyListSchema);
