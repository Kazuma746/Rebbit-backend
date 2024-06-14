const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

module.exports = (transporter) => {
  const router = express.Router();

  // @route   POST api/auth/register
  // @desc    Register user
  // @access  Public
  router.post('/register', [
    check('pseudo', 'Le pseudo est requis').not().isEmpty(),
    check('email', 'Veuillez entrer un email valide').isEmail(),
    check('password', 'Veuillez entrer un mot de passe de plus de 6 caractères').isLength({ min: 6 }),
    check('birthdate', 'Veuillez entrer votre date de naissance').not().isEmpty()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pseudo, nom, prenom, email, password, birthdate, role } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'Ce pseudo existe déjà' }] });
      }

      user = new User({
        pseudo,
        nom,
        prenom,
        email,
        password,
        birthdate,
        role
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
        (err, token) => {
          if (err) throw err;

          // Send confirmation email
          const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Confirmation d\'inscription',
            text: `Bonjour ${prenom} ${nom},\n\nMerci pour votre inscription sur Rebbit.\n\nVotre pseudo: ${pseudo}\nVotre email: ${email}\n\nCordialement,\nL'équipe Rebbit`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              return console.log(error);
            }
            console.log('Email sent: ' + info.response);
          });

          res.json({ token, pseudo: user.pseudo });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  // @route   POST api/auth/login
  // @desc    Authenticate user & get token
  // @access  Public
  router.post('/login', [
    check('email', 'Veuillez entrer un email valide').isEmail(),
    check('password', 'Le mot de passe est requis').exists()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ errors: [{ msg: 'Identifiants incorrects' }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Identifiants incorrects' }] });
      }

      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, pseudo: user.pseudo });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

  // @route   POST api/auth/forgot-password
  // @desc    Request password reset
  // @access  Public
  router.post('/forgot-password', [
    check('email', 'Veuillez entrer un email valide').isEmail()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ errors: [{ msg: 'Utilisateur non trouvé' }] });
      }

      const payload = {
        user: {
          id: user.id
        }
      };

      const resetToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Send password reset email
      const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Réinitialisation du mot de passe',
        text: `Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le lien suivant pour réinitialiser votre mot de passe : \n\n${resetUrl}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log('Email sent: ' + info.response);
      });

      res.json({ msg: 'Email de réinitialisation envoyé' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   POST api/auth/reset-password
  // @desc    Reset password
  // @access  Public
  router.post('/reset-password', [
    check('token', 'Token est requis').not().isEmpty(),
    check('newPassword', 'Veuillez entrer un nouveau mot de passe de plus de 6 caractères').isLength({ min: 6 })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user.id);

      if (!user) {
        return res.status(400).json({ errors: [{ msg: 'Utilisateur non trouvé' }] });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      res.json({ msg: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   PUT api/auth/change-email
  // @desc    Change user email
  // @access  Private
  router.put('/change-email', [auth, [
    check('newEmail', 'Veuillez inclure un e-mail valide').isEmail()
  ]], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newEmail } = req.body;

    try {
      let user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ msg: 'Utilisateur non trouvé' });
      }

      user.email = newEmail;
      await user.save();
      res.json({ msg: 'Adresse e-mail mise à jour avec succès' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route    GET api/auth/user
  // @desc     Get user by token
  // @access   Private
  router.get('/user', auth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   PUT api/auth/change-password
  // @desc    Change user password
  // @access  Private
  router.put('/change-password', [
    auth,
    check('currentPassword', 'Le mot de passe actuel est requis').not().isEmpty(),
    check('newPassword', 'Le nouveau mot de passe est requis').not().isEmpty()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Le mot de passe actuel est incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      res.json({ msg: 'Mot de passe changé avec succès' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   PUT api/auth/change-pseudo
  // @desc    Change user pseudo
  // @access  Private
  router.put('/change-pseudo', auth, async (req, res) => {
    const { newPseudo } = req.body;

    try {
      const user = await User.findById(req.user.id);

      if (!newPseudo) {
        return res.status(400).json({ msg: 'Le pseudo est requis' });
      }

      user.pseudo = newPseudo;
      await user.save();

      res.json({ msg: 'Pseudo changé avec succès' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   DELETE api/auth/delete-account
  // @desc    Supprimer le compte utilisateur
  // @access  Private
  router.delete('/delete-account', auth, async (req, res) => {
    try {
      await User.findByIdAndDelete(req.user.id);
      res.json({ msg: 'Compte supprimé avec succès' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erreur du serveur');
    }
  });

  // @route   GET api/auth/test-token
  // @desc    Test token generation and verification
  // @access  Public
  router.get('/test-token', (req, res) => {
    const payload = {
      user: {
        id: 'testUserId',
        role: 'testRole'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;

        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          res.json({ token, decoded });
        } catch (err) {
          res.status(401).json({ msg: 'Token non valide' });
        }
      }
    );
  });

  // Route pour générer un nouveau jeton JWT
  router.get('/generate-token', auth, (req, res) => {
    const payload = {
      user: {
        id: req.user.id,
        role: req.user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  });

  return router;
};
