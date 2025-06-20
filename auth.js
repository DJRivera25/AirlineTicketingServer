// Import jsonwebtoken package for creating and verifying JWTs
const jwt = require("jsonwebtoken");

// [SECTION] Environment Setup
// Loads environment variables from a .env file into process.env
require("dotenv").config();

/**
 * Create a JWT access token based on the user object
 * Used for authenticating users in protected routes
 */
module.exports.createAccessToken = (user) => {
  console.log(`user in createAccessToken`, user);
  const data = {
    id: user._id, // User ID from MongoDB
    fullName: user.fullName,
    email: user.email, // User email`
    mobileNo: user.mobileNo,
    isAdmin: user.isAdmin, // user isAdmin
  };

  // Sign token with the secret key (set in .env)
  // {} allows optional options (e.g., expiresIn)
  return jwt.sign(data, process.env.JWT_SECRET_KEY, {});
};

/**
 * Middleware to verify the JWT from Authorization header
 * Allows only users with valid tokens to proceed
 */
module.exports.verify = (req, res, next) => {
  let token = req.headers.authorization;

  // No token found
  if (typeof token === "undefined") {
    return res.status(401).send({ auth: "Failed. No Token" });
  } else {
    // Strip "Bearer " from token string
    token = token.slice(7, token.length);

    // Validate the token
    jwt.verify(token, process.env.JWT_SECRET_KEY, function (err, decodedToken) {
      if (err) {
        // Invalid or expired token
        return res.status(403).send({
          auth: "Failed",
          message: err.message,
        });
      } else {
        // Valid token, attach user data to request
        req.user = decodedToken;
        console.log(`req.user from verify:`, req.user);
        next(); // Proceed to next middleware or route
      }
    });
  }
};

/**
 * Middleware to verify if user is an admin
 * Only users with isAdmin flag set to true can proceed
 */
module.exports.verifyAdmin = (req, res, next) => {
  console.log("User in verify admin:", req.user);
  if (req.user.isAdmin) {
    next(); // User is admin, proceed
  } else {
    return res.status(403).send({
      auth: "Failed",
      error: "Action Forbidden", // User is not admin
    });
  }
};

/**
 * Centralized error handler middleware
 * Sends a formatted error response when something goes wrong
 */
module.exports.errorHandler = (err, req, res, next) => {
  console.error(err); // Log error to console for debugging
  const statusCode = err.status || 500;
  const errormessage = err.message || `Internal Server Error`;

  res.status(statusCode).json({
    error: "Failed in Find",
    details: {
      stringValue: err?.stringValue || null,
      valueType: typeof err?.value,
      kind: err?.kind || null,
      value: err?.value || null,
      path: err?.path || null,
      reason: err?.reason || null,
      name: err?.name || null,
      message: err?.message || "Unknown error",
      errorCode: err?.code || "SERVER_ERROR",
      details: err?.details || null,
    },
  });
};

/**
 * Middleware to check if user is authenticated
 * Mainly used for sessions (e.g., after Google OAuth login)
 */
module.exports.isLoggedIn = (req, res, next) => {
  if (req.user) {
    next(); // User is logged in
  } else {
    res.status(401); // Unauthorized access
  }
};
