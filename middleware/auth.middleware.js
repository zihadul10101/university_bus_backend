// authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
//console.log("Is next a function?", typeof next === 'function');
    try {
      const authHeader = req.headers.authorization;
   //   console.log(authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
      }

      const token = authHeader.split(' ')[1];
   //   console.log("token",token);
         
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
   console.log(decoded);

      req.user = {
        id: decoded.id,
        role: decoded.role,
        permissions: decoded.permissions || []
      };

    
      if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }

      next();
     console.log("Calling next");
      
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
  };
};

module.exports = authMiddleware;


