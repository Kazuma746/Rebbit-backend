// models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  pseudo: { type: String, required: true },
  nom: { type: String },
  prenom: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthdate: { type: Date, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user', required: true }
});

module.exports = mongoose.model('User', UserSchema);

