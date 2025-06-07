const bcrypt = require('bcrypt');

async function createPasswordHash() {
  const password = '123456';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password hash for 123456:', hash);
}

createPasswordHash().catch(console.error);