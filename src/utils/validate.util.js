const validateRegister = ({ name, email, password, role }) => {
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push('Nama minimal 2 karakter');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('Format email tidak valid');

  if (!password || password.length < 6)
    errors.push('Password minimal 6 karakter');

  if (role && !['OWNER', 'KARYAWAN'].includes(role))
    errors.push('Role harus OWNER atau KARYAWAN');

  return errors;
};

const validateLogin = ({ email, password }) => {
  const errors = [];

  if (!email) errors.push('Email wajib diisi');
  if (!password) errors.push('Password wajib diisi');

  return errors;
};

module.exports = { validateRegister, validateLogin };