// routes/posts.js

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// @route   POST api/posts
// @desc    Créer un post
// @access  Privé
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Le titre est requis').not().isEmpty(),
      check('content', 'Le contenu est requis').not().isEmpty(),
      check('tags', 'Les tags sont requis').isArray().not().isEmpty(),
      check('state', 'L\'état est requis').not().isEmpty().isIn(['draft', 'published', 'archived']),
      check('images', 'Les images doivent être un tableau').optional().isArray()
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      // Nettoyer et normaliser les tags
      const normalizedTags = req.body.tags.map(tag => tag.toLowerCase().trim());

      const newPost = new Post({
        title: req.body.title,
        content: req.body.content,
        tags: normalizedTags,
        user: req.user.id,
        state: req.body.state,
        images: req.body.images || [],
      });

      const post = await newPost.save();

      res.json(post);
    } catch (err) {
      console.error('Error creating post:', err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

// @route   GET api/posts/tags/:tag
// @desc    Get posts by tag
// @access  Public
router.get('/tags/:tag', async (req, res) => {
  try {
    const posts = await Post.find({ tags: req.params.tag }).sort({ date_created: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/tags/popular
// @desc    Get popular tags
// @access  Public
router.get('/tags/popular', async (req, res) => {
  try {
    const posts = await Post.find().select('tags');
    const tagCounts = {};

    posts.forEach(post => {
      post.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const popularTags = sortedTags.map(tag => ({ name: tag[0], count: tag[1] }));

    res.json(popularTags);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts
// @desc    Récupérer tous les posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('user', 'pseudo').sort({ date_created: -1 });
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/posts/:id
// @desc    Get a single post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'pseudo').populate('comments');
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/upvote/:id
// @desc    Upvote a post
// @access  Private
router.put('/upvote/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    console.log(`User ID: ${req.user.id}`);
    console.log(`Post before update: ${post}`);

    // Check if the post has already been upvoted by this user
    if (post.upvotedBy.some(userId => userId.toString() === req.user.id)) {
      console.log('User has already upvoted. Removing upvote...');
      // If the user has already upvoted, remove the upvote
      post.upvotedBy = post.upvotedBy.filter(userId => userId.toString() !== req.user.id);
      post.upvotes -= 1;
    } else {
      console.log('Adding upvote...');
      // Otherwise, add the upvote
      post.upvotedBy.push(req.user.id);
      post.upvotes += 1;
    }

    // Ensure user field is present
    post.user = post.user || req.user.id; // Make sure the user field is set

    await post.save();
    console.log('Post after update:', post);
    res.json(post);
  } catch (err) {
    console.error('Error in upvote route:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/posts/:id
// @desc    Supprimer un post
// @access  Privé
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post non trouvé' });
    }

    // Vérifier l'utilisateur ou l'admin
    const user = await User.findById(req.user.id).select('-password');
    if (post.user.toString() !== req.user.id && user.role !== 'admin') {
      return res.status(401).json({ msg: 'Utilisateur non autorisé' });
    }

    // Supprimer les commentaires associés
    console.log(`Deleting comments for post: ${req.params.id}`);
    const deleteCommentsResult = await Comment.deleteMany({ post: req.params.id });
    console.log(`Deleted comments result: ${JSON.stringify(deleteCommentsResult)}`);

    console.log(`Deleting post: ${req.params.id}`);
    const deletePostResult = await Post.deleteOne({ _id: req.params.id });
    console.log(`Deleted post result: ${JSON.stringify(deletePostResult)}`);

    res.json({ msg: 'Post et commentaires supprimés' });
  } catch (err) {
    console.error('Error deleting post:', err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/posts/state/:id
// @desc    Mettre à jour l'état d'un post
// @access  Privé
router.put(
  '/state/:id',
  [
    auth,
    [
      check('state', 'L\'état est requis').not().isEmpty().isIn(['draft', 'published', 'archived']),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { state } = req.body;

    try {
      let post = await Post.findById(req.params.id);

      if (!post) return res.status(404).json({ msg: 'Post non trouvé' });

      // Vérifier l'utilisateur ou l'admin
      const user = await User.findById(req.user.id).select('-password');
      if (post.user.toString() !== req.user.id && user.role !== 'admin') {
        return res.status(401).json({ msg: 'Utilisateur non autorisé' });
      }

      post.state = state;
      post.date_edited = Date.now();  // Mettre à jour la date de modification

      await post.save();

      res.json(post);
    } catch (err) {
      console.error('Error updating post:', err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

// @route   PUT api/posts/:id
// @desc    Mettre à jour un post
// @access  Privé
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Le titre est requis').not().isEmpty(),
      check('content', 'Le contenu est requis').not().isEmpty(),
      check('tags', 'Les tags sont requis').not().isEmpty(),
      check('state', 'L\'état est requis').not().isEmpty().isIn(['draft', 'published', 'archived'])
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tags, state } = req.body;

    // Construire l'objet post
    const postFields = {};
    if (title) postFields.title = title;
    if (content) postFields.content = content;
    if (Array.isArray(tags)) {
      postFields.tags = tags;
    } else if (typeof tags === 'string') {
      postFields.tags = tags.split(',').map((tag) => tag.trim());
    }
    if (state) postFields.state = state;

    // Ajouter la date de modification
    postFields.date_edited = Date.now();

    try {
      let post = await Post.findById(req.params.id);

      if (!post) return res.status(404).json({ msg: 'Post non trouvé' });

      // Vérifier l'utilisateur ou l'admin
      const user = await User.findById(req.user.id).select('-password');
      if (post.user.toString() !== req.user.id && user.role !== 'admin') {
        return res.status(401).json({ msg: 'Utilisateur non autorisé' });
      }

      post = await Post.findByIdAndUpdate(
        req.params.id,
        { $set: postFields },
        { new: true }
      );

      res.json(post);
    } catch (err) {
      console.error('Error updating post:', err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

module.exports = router;
