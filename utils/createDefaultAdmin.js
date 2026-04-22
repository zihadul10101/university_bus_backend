const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

const createDefaultAdmin = async () => {
  try {
    const exists = await Admin.findOne({ role: 'super_admin' });

    if (!exists) {
      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_ADMIN_PASSWORD,
        10
      );

      await Admin.create({
        name: 'Super Admin',
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'super_admin',
        permissions: {
          canManageDrivers: true,
          canManageBuses: true,
          canPostNotices: true,
          canManageSchedules: true
        }
      });

      console.log('✅ Default Super Admin Created');
    } else {
      console.log('ℹ️ Super Admin already exists');
    }
  } catch (err) {
    console.error('Error creating default admin:', err.message);
  }
};

module.exports = createDefaultAdmin;
