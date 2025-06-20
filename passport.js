const User = require("./models/User.js"); // Mongoose User model schema
const auth = require("./auth.js"); // Authentication utilities (e.g., JWT handling)

// Load environment variables from .env file (like CLIENT_ID and CLIENT_SECRET)
require("dotenv").config();

const PORT = process.env.PORT;
const URL = process.env.CLIENT_API;
// Import Passport for authentication
const passport = require("passport");

// Import the Google OAuth 2.0 strategy for Passport
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Configure Passport to use the Google strategy
passport.use(
  new GoogleStrategy(
    {
      // Google OAuth Client ID (from Google Cloud Console)

      clientID: process.env.CLIENT_ID,
      // Google OAuth Client Secret
      clientSecret: process.env.CLIENT_SECRET,

      // The URL Google will redirect to after user grants permission
      callbackURL: `${URL}/users/google/callback`,

      // Allows us to pass the original request to the callback (optional)
      passReqToCallback: true,
    },

    // This function runs after Google authenticates the user
    // It receives the access token, refresh token, and user profile
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        // 1. Try to find user by Google ID
        let user = await User.findOne({ googleId: profile.id });

        // 2. If user not found, create a new one
        if (!user) {
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            profilePicture: profile.photos[0].value,
            // passwordResetCode: undefined,
            // passwordResetExpires: undefined,
            // isVerified: true,
            isOAuthUser: true,
          });
          await user.save();
        }

        user._doc.token = auth.createAccessToken(user); // Attach token to the user object

        // 3. Return user
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Tells Passport how to store user data in the session (usually just the user ID)
// This is called after `done(null, user)` in the GoogleStrategy callback
passport.serializeUser(function (user, done) {
  // In a real app, you'd typically store user.id instead of the whole user object
  done(null, user);
});

// Tells Passport how to retrieve full user info from what's stored in the session
// Runs on every request that needs user data (e.g., checking if user is logged in)
passport.deserializeUser(function (user, done) {
  // Here we're simply passing the user object as-is
  // In a real app, you might query the database to get full user info
  done(null, user);
});
