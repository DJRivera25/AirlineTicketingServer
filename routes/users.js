const express = require("express");
const passport = require("passport");
const router = express.Router();
const auth = require("../auth.js");
const { verify, verifyAdmin, isLoggedIn } = require("../auth.js");
const userController = require("../controllers/users.js");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/details", verify, userController.getDetails);
router.get("/all", verify, verifyAdmin, userController.getAllUsers);
// router.patch("/details", verify, userController.updateDetails);
// router.patch("/:id/set-as-admin", verify, verifyAdmin, userController.updateUserAdmin);
// router.get("/update-password", verify, userController.resetPasswordCode);
// router.patch("/update-password", verify, userController.updatePassword);
// router.patch("/verify-email", userController.verifyEmail);

// ==========================
// Start Google OAuth login process
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"], // What we request from Google
    prompt: "select_account", // Always prompt account chooser
  })
);

// Callback route after Google login
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/users/failed",
    session: false,
  }),
  (req, res) => {
    const user = req.user;

    // ✅ Create token right here
    const token = auth.createAccessToken(user);

    // Optional: Also send name/picture to frontend
    const redirectUrl = new URL("http://localhost:3000/google-login");
    redirectUrl.searchParams.append("token", token);
    res.redirect(redirectUrl.toString());
  }
);

// Route hit when Google login fails
router.get("/failed", (req, res) => {
  console.log("User is not authenticated");
  res.status(401).send("Failed");
});

// Route hit when Google login succeeds
router.get("/success", isLoggedIn, (req, res) => {
  const user = req.user;
  console.log("You are now Logged in!");
  console.log(req.user); // Google profile
  res.status(200).json({
    message: `Welcome ${user.displayName || user.firstName}`,
    access: user.token, // here's the JWT
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
    },
  });
});

// Route hit when logged out
router.get("/logout", (req, res) => {
  // Destroy the session stored on the server
  req.session.destroy((err) => {
    if (err) {
      console.log("Error while destroying session:", err);
    } else {
      // Passport.js method to log out the user (removes req.user)
      req.logout(() => {
        console.log("You are logged out");
        res.redirect("/"); // Redirect to homepage (or login page)
      });
    }
  });
});

module.exports = router;
