import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../user/User.js'

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required' })
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    })
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    })

    const token = signToken(user)

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('register error:', error)
    return res.status(500).json({ message: 'Registration failed' })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken(user)

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('login error:', error)
    return res.status(500).json({ message: 'Login failed' })
  }
}

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('me error:', error)
    return res.status(500).json({ message: 'Failed to get profile' })
  }
}
