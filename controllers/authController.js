const User = require("../models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/otpUtils");

const signup = async (req, res) => {
  const { fullname, username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email or username." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
      oneTimePasswords: [{ otp: otpCode, expiresAt: otpExpiresAt }],
    });

    // Save user
    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, otpCode);

    res.status(201).json({
      message: "User registered successfully. OTP sent to email.",
      user: {
        id: newUser._id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendVerificationEmail = async (email, otpCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_EMAIL_USER,
      pass: process.env.NODEMAILER_EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; width: 400px; margin: auto;">
        <h2 style="color: #4caf50; text-align: center;">Verification Code</h2>
        <p>Dear User,</p>
        <p>Your OTP code is:</p>
        <div style="font-size: 24px; font-weight: bold; color: #4caf50; text-align: center; padding: 10px 0;">
          ${otpCode}
        </div>
        <p>This code is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 12px; color: #888;">
          If you did not request this, please ignore this email or contact support.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to:", email);
  } catch (error) {
    console.error("Failed to send OTP:", error);
  }
};

const sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Update user's OTP
    user.oneTimePasswords.push({ otp: otpCode, expiresAt: otpExpiresAt });
    await user.save();

    // Send OTP via email
    await sendVerificationEmail(email, otpCode);

    res.status(200).json({
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const validOTP = user.oneTimePasswords.find(
      (entry) => entry.otp === otp && entry.expiresAt > Date.now()
    );

    if (!validOTP) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    user.isVerified = true;
    user.oneTimePasswords = user.oneTimePasswords.filter(
      (entry) => entry.otp !== otp
    );
    await user.save();

    res.status(200).json({ message: "OTP verified successfully!" });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Email not verified. Please verify first." });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    res.status(200).json({
      message: "Signin successful!",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { signup, sendOTP, verifyOTP, signin };
