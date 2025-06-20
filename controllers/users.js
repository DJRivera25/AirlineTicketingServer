const bcrypt = require("bcrypt"); // Library for hashing passwords securely
const User = require("../models/User.js"); // Mongoose User model schema
const auth = require("../auth.js"); // Authentication utilities (e.g., JWT handling)
const mongoose = require("mongoose"); // MongoDB object modeling tool
/* const { sendVerificationEmail, passwordResetCode } = require("../emailAuthentication.js"); // Function to send verification emails
const crypto = require("crypto"); // Node.js built-in module for generating cryptographically strong random values */

/* ============================== Register a new user ============================== */
module.exports.registerUser = async (req, res) => {
  try {
    const { email, password, fullName, mobileNo } = req.body;

    // Check for missing fields
    if (!fullName || !email || !password || !mobileNo) {
      return res.status(400).send({ error: "All fields must be provided" });
    }

    // Validate email, password length, and mobile number format
    if (!email.includes("@")) {
      return res.status(400).send({ error: "Email is invalid" });
    }
    if (password.length < 8) {
      return res.status(400).send({ error: "Password must be at least 8 characters" });
    }
    /*  if (mobileNo.length !== 11) {
      return res.status(400).send({ error: "Mobile number must be 11 digits" });
    } */

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email already exists" });
    }

    /* // Generate email verification token valid for 10 minutes
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now */

    // Create new user document
    const newUser = new User({
      fullName,
      email,
      mobileNo,
      password: bcrypt.hashSync(password, 10),
      // verificationToken,
      // verificationTokenExpiration,
    });

    // Save the user and send the verification email

    const savedUser = await newUser.save();

    return res.status(200).send({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
};

/* ============================== User login with email and password ============================== */
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email format
    if (!email || !email.includes("@")) {
      return res.status(400).send({ error: "Invalid Email" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(404).send({ error: "No Email Found" });
    }

    // Check if user's email is verified
    /*  if (!user.isVerified) {
      return res.status(403).send({ error: "Email not verified. Verify email first." });
    } */

    // Compare provided password with stored hashed password
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).send({ error: "Email and password do not match" });
    }

    // Generate and send access token on successful login
    return res.json({
      access: auth.createAccessToken(user),
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
/* ============================== Get user details by ID (excluding password) ============================== */
module.exports.getDetails = async (req, res) => {
  try {
    // Find user by ID, exclude the password field
    const user = await User.findById(req.user.id).select("-password");

    // If user not found, respond with 404
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Send user details (without password)
    res.status(200).send(user);
  } catch (error) {
    // Delegate error handling
    errorHandler(error, req, res);
  }
};
module.exports.updateDetails = async (req, res) => {
  try {
    const userId = req.user.id; // assuming auth middleware adds user info to req

    const { firstName, lastName, email, mobileNo, addressLine1, addressLine2, city, stateRegion, zipcode, country } =
      req.body;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.mobileNo = mobileNo || user.mobileNo;

    // Update address as embedded subdocument
    user.address = {
      addressLine1: addressLine1 || user.address?.addressLine1 || "",
      addressLine2: addressLine2 || user.address?.addressLine2 || "",
      city: city || user.address?.city || "",
      stateRegion: stateRegion || user.address?.stateRegion || "",
      zipcode: zipcode || user.address?.zipcode || "",
      country: country || user.address?.country || "",
    };

    await user.save();

    // Return updated user info (exclude sensitive info like password)
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNo: user.mobileNo,
        address: user.address,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error(error);
    // Your error handler middleware or send generic error response
    res.status(500).json({ message: "Server error updating profile" });
  }
};

/* ============================== Promote a user to admin by ID ============================== */
module.exports.updateUserAdmin = async (req, res) => {
  try {
    const id = req.params.id;

    // Update user's isAdmin to true and return the updated document
    const updatedUser = await User.findByIdAndUpdate(id, { isAdmin: true }, { new: true });

    // If no user found with the given ID
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }

    // If user was already admin, notify accordingly
    if (updatedUser.isAdmin === false) {
      return res.status(200).send(`User NAME: ${updatedUser.firstName} ${updatedUser.lastName} is already an admin`);
    }

    // Successfully updated to admin, return updated user info
    return res.status(200).send({ updatedUser });
  } catch (error) {
    errorHandler(error, req, res);
  }
};

/* ============================== Generate and send a password reset code ============================== */
module.exports.resetPasswordCode = async (req, res) => {
  // Generate a random 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  console.log(`req.user in resetPasswordCode`, req.user);

  try {
    // Find the user by ID from the authenticated request
    const user = await User.findById(req.user.id);
    console.log(`user in resetPasswordCode`, user);

    // Return 404 if user not found
    if (!user) {
      return res.status(404).json({ message: `User not Found` });
    }

    // Set the reset code and expiry time (3 minutes from now)
    user.passwordResetCode = verificationCode;
    user.passwordResetExpires = Date.now() + 180 * 1000;

    // Save updated user
    await user.save();

    // Send the verification code to user's email
    await passwordResetCode(user.email, verificationCode);

    console.log(`verificationCode in resetPasswordCode`, verificationCode);
    console.log(`user with code in resetPasswordCode`, user);

    // Respond success message
    res.status(200).json({
      message: "A 6-digit verification code has been sent to your email address. Please check your inbox to proceed.",
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Error in resetPasswordCode:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================== 
   Update user's password after verifying reset code 
   ============================== */
module.exports.updatePassword = async (req, res) => {
  try {
    const { code, newPass, confirmNewPass, oldPass } = req.body;
    const { id } = req.user;
    console.log(`req.user in updatePassword`, req.user);

    // Validate required fields presence
    if (!newPass || !confirmNewPass || !oldPass || !code) {
      return res.status(400).send({ error: "All fields are required" });
    }

    // Check if new password and confirmation match
    if (newPass !== confirmNewPass) {
      return res.status(400).send({ error: "Passwords do not match" });
    }

    // Find user by ID and verify that reset code matches and is not expired
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(id),
      passwordResetCode: parseInt(code), // Ensure numeric comparison
      passwordResetExpires: { $gt: new Date() }, // Code not expired
    });

    console.log(`user in updatePassword`, user);

    // If no user found with valid code and expiry, respond with error
    if (!user) {
      return res.status(404).json({ message: "Invalid or expired verification code" });
    }

    // Verify the old password is correct
    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: "Old password is incorrect" });
    }

    // Hash the new password and update user record
    const hashedPassword = await bcrypt.hash(newPass, 10);
    user.password = hashedPassword;

    // Clear reset code and expiry fields
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;

    // Save the updated user
    await user.save();

    console.log(`user in resetPasswordCode`, user);

    // Return success message
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Update Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================== Verify user's email using token from query parameters ============================== */
module.exports.verifyEmail = async (req, res) => {
  const token = req.query.token;

  try {
    // Check if token is provided
    if (!token) {
      return res.status(404).send(`Verify Token Missing`);
    }

    // Find user by token and check if token is still valid (not expired)
    const verifiedUser = await User.findOneAndUpdate(
      {
        verificationToken: token,
        verificationTokenExpiration: { $gt: new Date() }, // Token expiration check
      },
      {
        $set: { isVerified: true }, // Mark email as verified
        $unset: { verificationToken: "", verificationTokenExpiration: "" }, // Remove token fields
      }
    );

    // If user not found
    if (!verifiedUser) {
      return res.status(403).send({ error: `Token Expired` });
    }
    // If already verified, inform user
    if (verifiedUser.isVerified) {
      return res.status(200).send({ message: `Email already verified` });
    }
    //Successful email verification
    return res.status(200).send({ message: `Email Verified! Thank you` });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================== Get all users (Admin only) ============================== */
module.exports.getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      role = "", // 'admin' or 'customer'
      sortBy = "fullName",
      sortOrder = "asc", // 'asc' or 'desc'
      page = 1,
      limit = 5,
    } = req.query;

    const query = {
      $or: [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
    };

    if (role === "admin") query.isAdmin = true;
    else if (role === "customer") query.isAdmin = false;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const users = await User.find(query)
      .select("-password")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      users,
      currentPage: parseInt(page),
      totalPages,
      totalUsers,
    });
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    res.status(500).json({ message: "Server error" });
  }
};
