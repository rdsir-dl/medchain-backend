import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
  slipHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
    type: String,
    index: true
  },
  issuedBy: {
    type: String,
    index: true
  },
  prescriptionId: {
    type: String,
    default: ""
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  mobileNo: {
    type: String,
    required: false
  },
  aadharNo: {
    type: String,
    required: false
  },
  medications: [{
    drugId: { type: Number, required: true },
    name: { type: String, required: true },
    totalQty: { type: Number, required: true },
    remainingQty: { type: Number, required: true }
  }],
  expiry: {
    type: Number, // Unix timestamp 
    required: true
  },
  txHash: {
    type: String,
    default: ""
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Prescription = mongoose.model('Prescription', PrescriptionSchema, 'Prescription');
export default Prescription;
