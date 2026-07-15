const express = require('express');
const router = express.Router();

// GET all users
router.get('/', async (requestAnimationFrame, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET user by ID
router.get('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findById(requestAnimationFrame.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create user
router.post('/', async (requestAnimationFrame, res) => {
    try {
        const { name, email, password } = requestAnimationFrame.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT update user
router.put('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            requestAnimationFrame.params.id,
            requestAnimationFrame.body,
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE user
router.delete('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findByIdAndDelete(requestAnimationFrame.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
const express = require('express');
const router = express.Router();

// GET all users
router.get('/', async (requestAnimationFrame, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET user by ID
router.get('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findById(requestAnimationFrame.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create user
router.post('/', async (requestAnimationFrame, res) => {
    try {
        const { name, email, password } = requestAnimationFrame.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT update user
router.put('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            requestAnimationFrame.params.id,
            requestAnimationFrame.body,
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE user
router.delete('/:id', async (requestAnimationFrame, res) => {
    try {
        const user = await User.findByIdAndDelete(requestAnimationFrame.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
    } catch (error) {
        console.error('MySQL connection failed:', error.message);
        process.exit(1);
    }
};

testConnection();

module.exports = pool;
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
    } catch (error) {
        console.error('MySQL connection failed:', error.message);
        process.exit(1);
    }
};

testConnection();

module.exports = pool;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (requestAnimationFrame, res, next) => {
    let token;

    if (requestAnimationFrame.headers.authorization && requestAnimationFrame.headers.authorization.startsWith('Bearer')) {
        token = requestAnimationFrame.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requestAnimationFrame.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

module.exports = { protect, adminOnly };
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ name, email, password: hashedPassword });

        res.status(201).json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    res.json({ success: true, data: req.user });
};

module.exports = { register, login, getMe };
                                                                                                                                                                    
                                                                                                                                                                    }
                                                                                                                                                                        }
                                                                                                                                                                            })
                                                                                                                                                                        }
                                                                                                                                                                }
                                                                                                                                                  }
                                                                                                                                            }
                                                                                                                                                }
                                                                                                                                                    })
                                                                                                                                    }
                                                                                                                      }
                                                                                                                }
                                                                                                                  })
                                                                                                            }
                                                                                                              }
                                                                                                              }
                                                                                                        }
                                                                                                            }
                                                                                                            }
                                                                                                          }
                                                                                                        }
                                                                                                }
                                                                                                  }
                                                                                                  }
                                                                                            }
                                                                                            })
                                                                                              }
                                                                                              }
                                                                                        }
                                                                                        })
                                                                                            }
                                                                                                }
                                                                                      }
                                                                                })
                                                                                    }
                                                                                        }
                                                                                    )
                                                                              }
                                                                        })
                                                                          }
                                                                          }
                                                                    })
                                                                        }
                                                                            }
                                                                  }
                                                            })
                                                              }
                                                              }
                                                        })
                                                        }
                                                          }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                      }
                                )
                                    }
                                        }
                              }
                        })
                            }
                                }
                            )
                      }
                })
                  }
                  }
            })
                }
                    }
          }
    })
      }
      }
})