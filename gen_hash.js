
import bcrypt from 'bcrypt';
const password = 'nova@2026';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) console.error(err);
    console.log('HASH:', hash);
});
