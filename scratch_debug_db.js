const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Prescription = require('./models/Prescription');

async function debug() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to MongoDB");
  
  const last = await Prescription.findOne().sort({ createdAt: -1 });
  console.log("Last Prescription Record:");
  console.log(JSON.stringify(last, null, 2));
  
  await mongoose.disconnect();
}

debug().catch(console.error);
