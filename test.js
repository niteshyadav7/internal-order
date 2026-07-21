const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
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
const db = require('../config/db');

// GET all products
router.get('/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE is_active = 1');
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single product
router.get('/products/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create product
router.post('/products', async (req, res) => {
    try {
        const { name, price, stock, category } = req.body;
        const [result] = await db.execute(
            'INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)',
            [name, price, stock, category]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// PUT update product
router.put('/products/:id', async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        await db.execute(
            'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
            [name, price, stock, req.params.id]
        );
        res.json({ success: true, message: 'Product updated' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
    try {
        await db.execute('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

const cacheMiddleware = (duration = 300) => {
    return (req, res, next) => {
        const key = req.originalUrl;
        const cached = cache.get(key);

        if (cached) {
            return res.json(cached);
        }

        res.sendResponse = res.json;
        res.json = (body) => {
            cache.set(key, body, duration);
            res.sendResponse(body);
        };

        next();
    };
};

const clearCache = (key) => {
    cache.del(key);
};

module.exports = { cacheMiddleware, clearCache };
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
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all products
router.get('/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE is_active = 1');
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single product
router.get('/products/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create product
router.post('/products', async (req, res) => {
    try {
        const { name, price, stock, category } = req.body;
        const [result] = await db.execute(
            'INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)',
            [name, price, stock, category]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// PUT update product
router.put('/products/:id', async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        await db.execute(
            'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
            [name, price, stock, req.params.id]
        );
        res.json({ success: true, message: 'Product updated' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
    try {
        await db.execute('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Resource not found';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };
// Async error wrapper  try/catch har jagah likhne ki zaroorat nahi
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
                                                                                                                                                                                        
                                                                                                                                                                                        }
                                                                                                                                                                                          })
                                                                                                                                                                                        }
                                                                                                                                                                                    }
                                                                                                                                                                                }
                                                                                                                                                                    }
                                                                                                                                                                    })
                                                                                                                                                                      }
                                                                                                                                                                      }
                                                                                                                                                                })
                                                                                                                                                                    }
                                                                                                                                                                        )
                                                                                                                                                              }
                                                                                                                                                        })
                                                                                                                                                            }
                                                                                                                                                                )
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
                                                    })
                                                        }
                                                            )
                                                  }
                                            })
                                                }
                                                    )
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
})
})