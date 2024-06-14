// models/Upvote.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UpvoteSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'posts'
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: 'comments'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('upvote', UpvoteSchema);
