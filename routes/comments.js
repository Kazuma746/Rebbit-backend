// routes/comments.js

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');

// @route   POST api/comments
// @desc    Ajouter un commentaire
// @access  Privé
router.post(
  '/',
  [
    auth,
    [
      check('post', 'Le post est requis').not().isEmpty(),
      check('content', 'Le contenu est requis').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await Post.findById(req.body.post);
      if (!post) {
        return res.status(404).json({ msg: 'Post non trouvé' });
      }

      const newComment = new Comment({
        post: req.body.post,
        user: req.user.id,
        content: req.body.content
      });

      const comment = await newComment.save();
      post.comments.unshift(comment.id);
      await post.save();

      const populatedComment = await comment.populate('user', ['pseudo']); // Peuplage de l'utilisateur

      res.json(populatedComment); // Renvoi du commentaire peuplé
    } catch (err) {
      console.error('Error creating comment:', err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

// @route   GET api/comments/:postId
// @desc    Récupérer tous les commentaires d'un post
// @access  Public
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId, isDeleted: false })
      .populate('user', ['pseudo'])
      .sort({ date_created: -1 });
    res.json(comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/comments/:id
// @desc    Mettre à jour un commentaire
// @access  Privé
router.put(
  '/:id',
  [
    auth,
    [
      check('content', 'Le contenu est requis').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;

    try {
      let comment = await Comment.findById(req.params.id);

      if (!comment) return res.status(404).json({ msg: 'Commentaire non trouvé' });

      // Vérifier l'utilisateur
      if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Utilisateur non autorisé' });
      }

      comment.content = content;
      comment.date_edited = Date.now();

      await comment.save();

      const populatedComment = await Comment.findById(req.params.id).populate('user', ['pseudo']); // Peuplage de l'utilisateur

      res.json(populatedComment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  }
);

// @route   DELETE api/comments/:id
// @desc    Supprimer un commentaire
// @access  Privé
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ msg: 'Commentaire non trouvé' });
    }

    // Vérifier l'utilisateur
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Utilisateur non autorisé' });
    }

    await Comment.deleteOne({ _id: req.params.id });

    // Mettre à jour le post pour retirer le commentaire supprimé
    const post = await Post.findById(comment.post);
    if (post) {
      post.comments = post.comments.filter(
        (commentId) => commentId.toString() !== req.params.id
      );
      await post.save();
    }

    const updatedCommentCount = await Comment.countDocuments({ post: comment.post });

    res.json({ msg: 'Commentaire supprimé', commentCount: updatedCommentCount });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Commentaire non trouvé' });
    }
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/comments/upvote/:id
// @desc    Upvoter un commentaire
// @access  Privé
router.put('/upvote/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ msg: 'Commentaire non trouvé' });
    }

    if (comment.upvotedBy.includes(req.user.id)) {
      // Si l'utilisateur a déjà upvoté, on retire son upvote
      comment.upvotedBy = comment.upvotedBy.filter(userId => userId.toString() !== req.user.id);
      comment.upvotes -= 1;
    } else {
      // Sinon, on ajoute son upvote
      comment.upvotedBy.push(req.user.id);
      comment.upvotes += 1;
    }

    await comment.save();

    const populatedComment = await Comment.findById(req.params.id).populate('user', ['pseudo']); // Peuplage de l'utilisateur

    res.json(populatedComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   GET api/comments/user
// @desc    Get comments by the logged-in user
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ user: req.user.id }).populate('post', 'title');
    const formattedComments = comments.map(comment => ({
      ...comment._doc,
      postTitle: comment.post.title,
      postId: comment.post._id
    }));
    res.json(formattedComments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;