import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import multer from "multer";
import mongoose from "mongoose";
import Prescription from "./models/Prescription.js";
import Patient from "./models/Patient.js";
import Entity from "./models/Entity.js";
import { accessContract, registryContract, tokenContract, ethers, provider } from "./blockchain.js";

console.log("📡 Attempting to connect to MongoDB...");
if (!process.env.DATABASE_URL) {
    console.error("❌ CRITICAL: DATABASE_URL is missing in .env");
}

mongoose.connect(process.env.DATABASE_URL)
    .then(async () => {
        console.log("🍃 MongoDB Atlas connected successfully");
        if (process.env.WIPE_DB_ON_START === "true") {
            const collections = await mongoose.connection.db.collections();
            for (let collection of collections) {
                await collection.deleteMany({});
            }
        }
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1); 
    });

const app = express();
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const allowedOrigins = ["http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        callback(new Error('CORS policy violation'), false);
    },
    credentials: true
}));
app.use(express.json());

function generateShortCode() {
    return `PC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function generatePatientId() {
    return `PID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

app.post("/api/prescription", upload.single('prescriptionPdf'), async (req, res) => {
    try {
        let { patientName, fatherName, address, medications, expiry, mobileNo, aadharNo, issuedBy } = req.body;
        if (typeof medications === 'string') medications = JSON.parse(medications);

        const slipHash = ethers.hexlify(ethers.randomBytes(32));
        const shortCode = generateShortCode();
        const identityString = `${patientName.trim().toLowerCase()}-${fatherName.trim().toLowerCase()}-${address.trim().toLowerCase()}`;
        const patientHash = ethers.keccak256(ethers.toUtf8Bytes(identityString));
        const expiryVal = parseInt(expiry) || Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

        let patient = await Patient.findOne({ $or: [{ aadharNo }, { mobileNo }] });
        if (!patient) {
            patient = new Patient({ patientId: await generatePatientId(), name: patientName, fatherName, address, mobileNo, aadharNo });
            await patient.save();
        }

        const dbPrescription = new Prescription({
            slipHash, shortCode, patientId: patient.patientId, issuedBy, patientName, fatherName, address, mobileNo, aadharNo,
            medications: medications.map(m => ({ drugId: parseInt(m.id || m.drugId), name: m.name, totalQty: parseInt(m.totalQty), remainingQty: parseInt(m.totalQty) })),
            expiry: expiryVal
        });
        await dbPrescription.save();

        const tx = await registryContract.issuePrescription(patientHash, medications.map(m => parseInt(m.id || m.drugId)), medications.map(m => parseInt(m.totalQty)), expiryVal, slipHash);
        const receipt = await tx.wait();
        
        dbPrescription.txHash = tx.hash;
        await dbPrescription.save();
        res.json({ status: "success", txHash: tx.hash, slipHash, metadata: dbPrescription });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/sell", async (req, res) => {
    try {
        let { slipHash, itemIndex, quantity } = req.body;
        const pMod = await Prescription.findOne({ $or: [{ slipHash }, { shortCode: slipHash }] });
        const identityString = `${pMod.patientName.trim().toLowerCase()}-${pMod.fatherName.trim().toLowerCase()}-${pMod.address.trim().toLowerCase()}`;
        const patientHash = ethers.keccak256(ethers.toUtf8Bytes(identityString));

        const tx = await tokenContract.sellWithSlip(pMod.slipHash, patientHash, parseInt(itemIndex), parseInt(quantity));
        await tx.wait();

        pMod.medications[itemIndex].remainingQty -= parseInt(quantity);
        await pMod.save();
        res.json({ status: "success", txHash: tx.hash });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/prescriptions", async (req, res) => {
    const prescriptions = await Prescription.find(req.query.patientId ? { patientId: req.query.patientId } : {}).sort({ createdAt: -1 });
    res.json(prescriptions);
});

app.get("/api/accounts/available", async (req, res) => {
    const allAccounts = await provider.listAccounts();
    res.json(allAccounts.map(a => a.address));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Hub running on port ${PORT}`));