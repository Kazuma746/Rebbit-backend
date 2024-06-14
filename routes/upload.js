const express = require('express');
const router = express.Router();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/', upload.array('images', 10), (req, res) => {
  try {
    const fileNames = req.files.map(file => file.filename);
    res.json({ fileNames });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement des images' });
  }
});

module.exports = router;
