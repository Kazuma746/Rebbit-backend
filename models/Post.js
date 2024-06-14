// models/Post.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], required: true },
  state: { type: String, enum: ['draft', 'published', 'archived'], required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date_created: { type: Date, default: Date.now },
  date_edited: { type: Date },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  images: { type: [String] },
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }] 
});

module.exports = mongoose.model('Post', PostSchema);
