const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User.js");
const auth = require("./auth.js");
require("dotenv").config();

const PORT = process.env.PORT;
const URL = process.env.SERVER_URL;
const callbackUrl = `${URL}/users/google/callback`;

console.log("✅ Google Strategy redirect_uri:", callbackUrl);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: callbackUrl,
      passReqToCallback: true,
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        // 1. Look for an existing user by Google ID
        let user = await User.findOne({ googleId: profile.id });

        // 2. If no user, create a new one
        if (!user) {
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            profilePicture: profile.photos[0].value,
            isOAuthUser: true,
          });

          await user.save();
        }

        // 3. Attach JWT to user object for downstream use
        user._doc.token = auth.createAccessToken(user);

        // 4. Pass user to Passport
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user info into the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user info from session
passport.deserializeUser((user, done) => {
  done(null, user);
});
