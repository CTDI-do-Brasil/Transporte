
import bcrypt from 'bcrypt';
const password = 'nova@2026';
bcrypt.hash(password, 10).then(hash => console.log('HASH:', hash));
