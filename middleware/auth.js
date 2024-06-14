// middleware/auth.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    console.error('No token, authorization denied');
    return res.status(401).json({ msg: 'Pas de token, accès refusé' });
  }

  try {
    console.log('Token received:', token);
    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log('Token decoded:', decoded);
    next();
  } catch (err) {
    console.error('Token is not valid!');
    res.status(401).json({ msg: 'Token non valide' });
  }
};
