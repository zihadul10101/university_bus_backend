
module.exports = (permissionName) => {
  return (req, res, next) => {
    if (!req.user.permissions || !req.user.permissions[permissionName]) {
      return res.status(403).json({
        message: `Forbidden: Missing permission (${permissionName})`
      });
    }
    next();
  };
};

exports.permit = (permission) => (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  if (req.user.role === 'sub_admin' && req.user.permissions[permission]) return next();

  return res.status(403).json({ message: 'Forbidden: You do not have permission' });
};



