// routes/users.js

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const bcrypt = require('bcryptjs');

// @route   POST api/users/by-ids
// @desc    Get user pseudos by IDs
// @access  Public
router.post('/by-ids', async (req, res) => {
  try {
    const userIds = req.body.ids; // frontend envoie un tableau d'IDs
    const users = await User.find({ _id: { $in: userIds } }, '_id pseudo'); // On récupère seulement les champs _id et pseudo
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/users/pseudo
// @desc    Update user pseudo
// @access  Private
router.put('/pseudo', [
  auth,
  [check('pseudo', 'Le pseudo est requis').not().isEmpty()]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pseudo } = req.body;

  try {
    let user = await User.findById(req.user.id);
    user.pseudo = pseudo;
    await user.save();
    res.json({ msg: 'Pseudo mis à jour avec succès', pseudo: user.pseudo });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/users/password
// @desc    Update user password
// @access  Private
router.put('/password', [
  auth,
  [
    check('password', 'Le mot de passe est requis et doit contenir au moins 6 caractères').isLength({ min: 6 })
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { password } = req.body;

  try {
    let user = await User.findById(req.user.id);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.json({ msg: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   DELETE api/users
// @desc    Delete user account
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    await Post.deleteMany({ user: req.user.id });
    await Comment.deleteMany({ user: req.user.id });
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: 'Compte supprimé avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/users/:id/posts
// @desc    Get posts by user ID
// @access  Private
router.get('/:id/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.id }).sort({ date_created: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/users/:id/comments
// @desc    Get comments by user ID
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ user: req.params.id }).sort({ date_created: -1 });
    res.json(comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/users/:id/upvotes
// @desc    Get upvotes by user ID
// @access  Private
router.get('/:id/upvotes', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find posts upvoted by the user
    const upvotedPosts = await Post.find({ upvotedBy: userId }).populate('user');

    // Find comments upvoted by the user
    const upvotedComments = await Comment.find({ upvotedBy: userId }).populate('post');

    const upvotes = [
      ...upvotedPosts.map(post => ({ type: 'Post', content: post.title, date: post.date_created, postId: post._id })),
      ...upvotedComments.map(comment => ({ type: 'Commentaire', content: comment.content, date: comment.date_created, postId: comment.post._id }))
    ];

    res.json(upvotes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

module.exports = router;
