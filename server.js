require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const MongoStore = require('connect-mongo');


// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://yuii-playcards.vercel.app',
    'http://localhost:3000' // for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Trust Vercel's proxy
app.set('trust proxy', 1);
// Add this before your routes
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    req.headers.origin = req.headers.origin || req.headers.host;
  }
  next();
});
// Add secure flag to all responses in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  next();
});
// Perbaikan session configuration
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SECRET_SESSION, // Wajib tanpa fallback di production
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // Sinkron dengan maxAge
  }),
  resave: false,
  saveUninitialized: false,
  proxy: true, // Penting untuk Vercel
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    // Jangan set domain kecuali pakai custom domain
  }
}));


// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://authentication-project-ef7ba-default-rtdb.firebaseio.com`
});
const auth = admin.auth();
const db = admin.database();

// Connect to MongoDB 
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


// Authentication Middleware
const authenticate = (req, res, next) => {
  if (!req.session.user) {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/');
  }
  next();
};

// Routes
// Google Login
app.post('/api/loginbygoogle', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Verify ID Token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    
    // Regenerate session to prevent fixation
    req.session.regenerate(async (err) => {
      if (err) throw err;
      
      // Set session
      req.session.user = {
        uid,
        email,
        name,
        picture,
        authenticated: true
      };
      
      // Save user info to Firebase Realtime Database
      const userRef = db.ref(`information-user/${uid}`);
      await userRef.set({
        email,
        name,
        picture,
        date: new Date().toISOString()
      });
      
      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) throw err;
        
        res.json({
          success: true,
          user: { uid, email, name, picture },
          sessionId: req.sessionID
        });
      });
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get user info
app.get('/api/user', authenticate, (req, res) => {
  res.json({ user: req.session.user });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session.user && req.session.user.authenticated) {
    res.json({ 
      isAuthenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// CRUD Flashcards
// Flashcard Schema and Model
// Di file express.js, tambahkan schema Deck
const deckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  uuid: { type: String, required: true }, // UUID dari Firebase user
  createdAt: { type: Date, default: Date.now }
});

const flashcardSchema = new mongoose.Schema({
  front: { type: String, required: true },
  back: { type: String, required: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  uuid: { type: String, required: true }, // UUID dari Firebase user
  createdAt: { type: Date, default: Date.now }
});

const Deck = mongoose.model('Deck', deckSchema);
const Flashcard = mongoose.model('Flashcard', flashcardSchema);
// Create new flashcard
// Deck CRUD
// Create new deck
app.post('/api/decks', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    const newDeck = new Deck({
      name,
      description,
      uuid: req.session.user.uid
    });
    await newDeck.save();
    res.status(201).json(newDeck);
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Get all user decks
app.get('/api/decks', authenticate, async (req, res) => {
  try {
    const decks = await Deck.find({ uuid: req.session.user.uid });
    res.json(decks);
  } catch (error) {
    console.error('Get decks error:', error);
    res.status(500).json({ error: 'Failed to get decks' });
  }
});

// Delete a deck
app.delete('/api/decks/:id', authenticate, async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    if (deck.uuid !== req.session.user.uid) {
      return res.status(403).json({ error: 'Not authorized to delete this deck' });
    }
    
    // Delete all flashcards in this deck first
    await Flashcard.deleteMany({ deckId: req.params.id });
    
    // Then delete the deck
    await Deck.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Deck and all its flashcards deleted successfully' });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Get all flashcards in a deck
app.get('/api/decks/:id/flashcards', authenticate, async (req, res) => {
  try {
    // First verify the deck belongs to the user
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    if (deck.uuid !== req.session.user.uid) {
      return res.status(403).json({ error: 'Not authorized to view this deck' });
    }
    
    // Then get the flashcards
    const flashcards = await Flashcard.find({ 
      deckId: req.params.id,
      uuid: req.session.user.uid
    });
    
    res.json(flashcards);
  } catch (error) {
    console.error('Get deck flashcards error:', error);
    res.status(500).json({ error: 'Failed to get deck flashcards' });
  }
});

// Update flashcard to include deckId check
app.put('/api/flashcards/:id', authenticate, async (req, res) => {
  try {
    const { front, back } = req.body;
    const flashcard = await Flashcard.findById(req.params.id);
    
    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    
    if (flashcard.uuid !== req.session.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this flashcard' });
    }
    
    flashcard.front = front;
    flashcard.back = back;
    await flashcard.save();
    
    res.json(flashcard);
  } catch (error) {
    console.error('Update flashcard error:', error);
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
});

// Create flashcard to include deckId
app.post('/api/flashcards', authenticate, async (req, res) => {
  try {
    const { front, back, deckId } = req.body;
    
    // Verify the deck belongs to the user
    const deck = await Deck.findById(deckId);
    if (!deck || deck.uuid !== req.session.user.uid) {
      return res.status(403).json({ error: 'Not authorized to add to this deck' });
    }
    
    const newFlashcard = new Flashcard({
      front,
      back,
      deckId,
      uuid: req.session.user.uid
    });
    
    await newFlashcard.save();
    res.status(201).json(newFlashcard);
  } catch (error) {
    console.error('Create flashcard error:', error);
    res.status(500).json({ error: 'Failed to create flashcard' });
  }
});
// Get all flashcards (for global quiz)
app.get('/api/flashcards', authenticate, async (req, res) => {
    try {
        const flashcards = await Flashcard.find({ uuid: req.session.user.uid });
        res.json(flashcards);
    } catch (error) {
        console.error('Get all flashcards error:', error);
        res.status(500).json({ error: 'Failed to get flashcards' });
    }
});
app.get('/api/stats/:uid', authenticate, async (req, res) => {
  try {
    const deckCount = await Deck.countDocuments({ uuid: req.session.user.uid });
    const cardCount = await Flashcard.countDocuments({ uuid: req.session.user.uid });

    res.json({ deckCount, cardCount });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});
// Delete a flashcard
app.delete('/api/flashcards/:id', authenticate, async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id);
    
    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    
    if (flashcard.uuid !== req.session.user.uid) {
      return res.status(403).json({ error: 'Not authorized to delete this flashcard' });
    }
    
    await Flashcard.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});
// Check if deck exists and is shareable
app.get('/api/decks/:id/check', authenticate, async (req, res) => {
  try {
    const deckId = req.params.id;
    
    // Check if deck exists
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // In a real app, you might want to add additional checks here
    // For example: is the deck marked as public/shareable?
    
    res.json({ 
      exists: true,
      deckName: deck.name
    });
    
  } catch (error) {
    console.error('Check deck error:', error);
    res.status(500).json({ error: 'Failed to check deck' });
  }
});

// Import deck
// Import deck - Perbaikan untuk hindari duplikasi
app.post('/api/decks/import', authenticate, async (req, res) => {
  try {
    const { deckId } = req.body;
    const userId = req.session.user.uid;
    
    // 1. Cek apakah deck sudah ada di user ini
    const existingDeck = await Deck.findOne({
      originalDeckId: deckId,
      uuid: userId
    });
    
    if (existingDeck) {
      return res.status(400).json({ 
        error: 'You already have a copy of this deck' 
      });
    }
    
    // 2. Get the deck to import
    const deckToImport = await Deck.findById(deckId);
    if (!deckToImport) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // 3. Create SINGLE new deck
    const newDeck = new Deck({
      name: deckToImport.name.includes('(Shared)') 
        ? deckToImport.name 
        : `${deckToImport.name} (Shared)`,
      description: deckToImport.description,
      uuid: userId,
      originalDeckId: deckId
    });
    
    await newDeck.save();
    
    // 4. Get all flashcards once
    const flashcards = await Flashcard.find({ deckId });
    
    // 5. Create flashcards in single batch
    const newFlashcards = flashcards.map(flashcard => ({
      front: flashcard.front,
      back: flashcard.back,
      deckId: newDeck._id,
      uuid: userId,
      originalFlashcardId: flashcard._id
    }));
    
    await Flashcard.insertMany(newFlashcards);
    
    res.json({ 
      success: true,
      deck: newDeck,
      flashcardCount: flashcards.length
    });
    
  } catch (error) {
    console.error('Import deck error:', error);
    res.status(500).json({ error: 'Failed to import deck' });
  }
});
// ROUTES
app.get('/dashboard', authenticate, (req, res) => {
  // Kirim data user ke frontend
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'), {
    user: req.session.user
  });
});
app.get('/quiz', authenticate, (req, res) => {
  // Kirim data user ke frontend
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'), {
    user: req.session.user
  });
});
app.get('/profile', authenticate, (req, res) => {
  // Kirim data user ke frontend
  res.sendFile(path.join(__dirname, 'public', 'profile.html'), {
    user: req.session.user
  });
});
// Home route explicitly defined
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Server listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});