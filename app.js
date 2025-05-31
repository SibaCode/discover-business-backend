require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const multer = require("multer");
const upload = multer(); // memory storage by default

const app = express();
const corsOptions = {
  origin: 'https://discover-business.vercel.app', // 👈 your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));


// your routes...

// Firebase setup
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// CREATE - Add new business without image upload
// app.post("/api/businesses", async (req, res) => {
//   try {
//     const newBusiness = req.body;
//     newBusiness.imageUrl = "SibaTest";
//     newBusiness.productImages = ["SibaTest"];

//     const docRef = await db.collection("businesses").add(newBusiness);
//     res.status(201).json({ message: "Business created successfully", id: docRef.id, ...newBusiness });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to create business", details: error.message });
//   }
// });
const multer = require('multer');

app.post("/api/businesses", upload.none(), async (req, res) => {
  try {
    const newBusiness = {
      name: req.body.name,
      industry: req.body.industry,
      description: req.body.description,
      location: req.body.location,
      contactPerson: req.body.contactPerson,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      facebook: req.body.facebook,
      products: req.body.products,
      imageUrl: req.body.imageUrl || "https://via.placeholder.com/150",
      productImages: JSON.parse(req.body.productImages || "[]")
    };

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

// READ SINGLE
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

// READ EVENTS
app.get("/api/events", async (req, res) => {
  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// UPDATE
app.put("/api/businesses/:id", async (req, res) => {
  try {
    const businessRef = db.collection("businesses").doc(req.params.id);
    const doc = await businessRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updateData = req.body;
    updateData.imageUrl = "SibaTest";
    updateData.productImages = ["SibaTest"];

    await businessRef.update(updateData);
    const updatedDoc = await businessRef.get();
    res.status(200).json({ message: "Business updated successfully", id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update business", details: error.message });
  }
});

// DELETE
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
app.use(express.json());

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
