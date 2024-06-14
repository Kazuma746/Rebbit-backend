const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const MyList = require('../models/MyList');

// @route   PUT api/mylist/posts/:id
// @desc    Ajouter ou retirer un post dans MyList
// @access  Privé
router.put('/posts/:id', auth, async (req, res) => {
  try {
    const mylist = await MyList.findOne({ pseudo: req.user.id });

    if (!mylist) {
      return res.status(404).json({ msg: 'Liste non trouvée' });
    }

    if (mylist.post.includes(req.params.id)) {
      mylist.post.pull(req.params.id);
    } else {
      mylist.post.push(req.params.id);
    }

    await mylist.save();
    res.json(mylist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/mylist/comments/:id
// @desc    Ajouter ou retirer un commentaire dans MyList
// @access  Privé
router.put('/comments/:id', auth, async (req, res) => {
  try {
    const mylist = await MyList.findOne({ pseudo: req.user.id });

    if (!mylist) {
      return res.status(404).json({ msg: 'Liste non trouvée' });
    }

    if (mylist.comment.includes(req.params.id)) {
      mylist.comment.pull(req.params.id);
    } else {
      mylist.comment.push(req.params.id);
    }

    await mylist.save();
    res.json(mylist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

// @route   PUT api/mylist/tags
// @desc    Ajouter ou retirer des tags dans MyList
// @access  Privé
router.put('/tags', [auth, [check('tags', 'Les tags sont requis').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const mylist = await MyList.findOne({ pseudo: req.user.id });

    if (!mylist) {
      return res.status(404).json({ msg: 'Liste non trouvée' });
    }

    const tags = req.body.tags.split(',').map(tag => tag.trim());
    mylist.tags = tags;

    await mylist.save();
    res.json(mylist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur du serveur');
  }
});

module.exports = router;
