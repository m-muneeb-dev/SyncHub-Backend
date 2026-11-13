const mongoose = require('mongoose')
const User = require('../models/user.model')
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library')

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
)

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);
    const { exp } = jwt.decode(token); // cookie expiry always matches the JWT
    const expiresAt = new Date(exp * 1000)
    return res
        .status(statusCode)
        .cookie("token", token, {
            expires: expiresAt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/"
        })
        .json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                authProvider: user.authProvider
            }
        });    
};


const signUp = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password"
            })
        }
        else if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ success: false, message: "Invalid email or password format" });
        }
        const normalizedEmail = email.toLowerCase().trim();


        const existingUser = await User.findOne({ email: normalizedEmail })
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email already registered"
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user',
            authProvider: 'local'
        })
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {   // unique index on email
            return res.status(409).json({
                success: false,
                message: "This email is already registered"
            });
        }
        console.error("Signup error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter correct email and password"
            });
        }
        // Add this check before .toLowerCase():
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ success: false, message: "Invalid email or password format" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        if (!user.password && user.authProvider === "google") {
            return res.status(401).json({
                success: false,
                message: "This account uses Google Sign-In. Please continue with Google."
            });
        }
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        return sendTokenResponse(user, 200, res);
    } catch (error) {
        console.error("Signin error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

// GOOGLE SIGNIN
const googleSignIn = async (req, res) => {
    try {
        const { credential } = req.body

        if (!credential || typeof credential !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Google credential is required'
            })
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })

        const payload = ticket.getPayload()

        if (
            !payload ||
            !payload.sub ||
            !payload.email ||
            payload.email_verified !== true
        ) {
            return res.status(401).json({
                success: false,
                message: 'Google account verification failed'
            })
        }

        const googleId = payload.sub
        const normalizedEmail = payload.email.toLowerCase().trim()

        // First, find user by Google ID
        let user = await User.findOne({ googleId })

        // If not found, check whether this email already exists
        if (!user) {
            user = await User.findOne({
                email: normalizedEmail
            })

            if (user) {
                // Link verified Google account to existing user
                user.googleId = googleId
                await user.save()
            } else {
                // Create a new Google user
                user = await User.create({
                    name: payload.name || normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    googleId,
                    authProvider: 'google',
                    role: 'user'
                })
            }
        }

        // Use the same JWT and cookie system as normal signin
        return sendTokenResponse(user, 200, res)

    } catch (error) {
        console.error('Google signin error:', error)

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'This Google account is already linked to another user'
            })
        }

        return res.status(401).json({
            success: false,
            message: 'Google authentication failed'
        })
    }
}

const logOut = async (req, res) => {
    return res
        .clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/"
        })
        .status(200)
        .json({
            success: true,
            message: "Logged out successfully"
        });
};


const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if ID is valid
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        // Find user by ID
        const user = await User.findById(id)
        .select("name email createdAt")
        .lean();

        // Check if user exists
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Get user error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { signUp, signIn, googleSignIn, logOut, getUserById }
