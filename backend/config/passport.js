import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getDB } from './db.js';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await getDB().collection('users').findOne({ email: email.toLowerCase() });
      if (!user) return done(null, false, { message: 'Invalid credentials.' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Invalid credentials.' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getDB()
      .collection('users')
      .findOne({ _id: new ObjectId(id) });
    if (!user) return done(null, false);
    const safeUser = { ...user };
    delete safeUser.password;
    done(null, safeUser);
  } catch (err) {
    done(err);
  }
});
