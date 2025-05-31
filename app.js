require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer-Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'discover-business',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  },
});
const upload = multer({ storage });

const app = express();
app.options('*', cors());

// Firebase setup
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // storageBucket: process.env.FIREBASE_STORAGE_BUCKET // add your bucket name here in env var
  });
}

const db = admin.firestore();
// const bucket = admin.storage().bucket();

app.use(cors({
  origin: 'https://discover-business.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Multer memory storage (buffer)
// Multer fields for file uploads
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'productImages', maxCount: 10 }
]);

// Helper: upload file buffer to Firebase Storage
// async function uploadFileToFirebase(file) {
//   const blob = bucket.file(Date.now() + '-' + file.originalname);
//   const blobStream = blob.createWriteStream({
//     metadata: {
//       contentType: file.mimetype
//     }
//   });

//   return new Promise((resolve, reject) => {
//     blobStream.on('error', (err) => reject(err));
//     blobStream.on('finish', () => {
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//       resolve(publicUrl);
//     });
//     blobStream.end(file.buffer);
//   });
// }

// CREATE
app.post("/api/businesses", uploadFields, async (req, res) => {
  try {
    const newBusiness = req.body;

    if (req.files['image']) {
      newBusiness.imageUrl = await uploadFileToFirebase(req.files['image'][0]);
    }

    if (req.files['productImages']) {
      newBusiness.productImages = [];
      for (const file of req.files['productImages']) {
        const url = await uploadFileToFirebase(file);
        newBusiness.productImages.push(url);
      }
    }

    const docRef = await db.collection("businesses").add(newBusiness);
    res.status(201).json({ message: "Business created successfully", id: docRef.id, ...newBusiness });
  } catch (error) {
    res.status(500).json({ error: "Failed to create business", details: error.message });
  }
});

// READ ALL
app.get("/api/businesses", async (req, res) => {
  try {
    const snapshot = await db.collection("businesses").get();
    const businesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(businesses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch businesses", details: error.message });
  }
});

// READ ONE
app.get("/api/businesses/:id", async (req, res) => {
  try {
    const businessRef = db.collection("businesses").doc(req.params.id);
    const doc = await businessRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch business", details: error.message });
  }
});

// UPDATE
app.put("/api/businesses/:id", uploadFields, async (req, res) => {
  try {
    const businessRef = db.collection("businesses").doc(req.params.id);
    const doc = await businessRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updateData = req.body;

    if (req.files['image']) {
      updateData.imageUrl = await uploadFileToFirebase(req.files['image'][0]);
    }

    if (req.files['productImages']) {
      updateData.productImages = [];
      for (const file of req.files['productImages']) {
        const url = await uploadFileToFirebase(file);
        updateData.productImages.push(url);
      }
    }

    await businessRef.update(updateData);
    const updatedDoc = await businessRef.get();
    res.status(200).json({ message: "Business updated successfully", id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update business", details: error.message });
  }
});
app.get('/', (req, res) => {
  res.send('API is up and running!');
});

//// DELETE
app.delete("/api/businesses/:id", async (req, res) => {
  try {
    const businessRef = db.collection("businesses").doc(req.params.id);
    const doc = await businessRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    await businessRef.delete();
    res.status(200).json({ message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete business", details: error.message });
  }
});

// EVENTS GET example
app.get("/api/events", async (req, res) => {
  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// EXPORT app for Vercel serverless
module.exports = app;
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
