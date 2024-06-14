// routes/admin.js

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Middleware pour vérifier si l'utilisateur est un administrateur
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Accès refusé, vous n\'êtes pas un administrateur' });
  }
  next();
};

// @route   GET api/admin/users
// @desc    Obtenir la liste de tous les utilisateurs
// @access  Privé (Admin seulement)
router.get('/users', [auth, adminAuth], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/admin/users/:id
// @desc    Editer le nom ou l'email d'un utilisateur
// @access  Privé (Admin seulement)
router.put('/users/:id', [
  auth,
  adminAuth,
  [
    check('pseudo', 'Le nom est requis').not().isEmpty(),
    check('email', 'Veuillez inclure un email valide').isEmail()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pseudo, email } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }

    user.pseudo = pseudo;
    user.email = email;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Supprimer un utilisateur et marquer ses posts et commentaires comme supprimés
// @access  Privé (Admin seulement)
router.delete('/users/:id', [auth, adminAuth], async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: 'Utilisateur non trouvé' });
      }
  
      // Mettre à jour les posts de l'utilisateur
      await Post.updateMany({ user: user._id }, { $set: { content: 'Post supprimé', state: 'archived' } });
  
      // Mettre à jour les commentaires de l'utilisateur
      await Comment.updateMany({ user: user._id }, { $set: { content: 'Commentaire supprimé', isDeleted: true } });
  
      await User.findByIdAndDelete(req.params.id);
  
      res.json({ msg: 'Utilisateur, ses posts et ses commentaires ont été marqués comme supprimés' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

// @route   GET api/admin/users/:id/posts
// @desc    Obtenir tous les posts d'un utilisateur
// @access  Privé (Admin seulement)
router.get('/users/:id/posts', [auth, adminAuth], async (req, res) => {
    try {
      const posts = await Post.find({ user: req.params.id });
      res.json(posts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });  
  
  // @route   GET api/admin/users/:id/comments
  // @desc    Obtenir tous les commentaires d'un utilisateur
  // @access  Privé (Admin seulement)
  router.get('/users/:id/comments', [auth, adminAuth], async (req, res) => {
    try {
      const comments = await Comment.find({ user: req.params.id });
      res.json(comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });
  
// @route   DELETE api/admin/comments/:id
// @desc    Supprimer un commentaire
// @access  Privé (Admin seulement)
router.delete('/comments/:id', [auth, adminAuth], async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) {
        return res.status(404).json({ msg: 'Commentaire non trouvé' });
      }
      await Comment.findByIdAndDelete(req.params.id);
      res.json({ msg: 'Commentaire supprimé' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });  

  // @route   GET api/admin/users/:id
// @desc    Obtenir les détails d'un utilisateur spécifique
// @access  Privé (Admin seulement)
router.get('/users/:id', [auth, adminAuth], async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({ msg: 'Utilisateur non trouvé' });
      }
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

module.exports = router;
