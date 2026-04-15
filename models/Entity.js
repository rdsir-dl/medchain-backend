import mongoose from 'mongoose';

const EntitySchema = new mongoose.Schema({
  blockchainAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['hospital', 'manufacturer', 'dealer', 'medical-store']
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    default: ""
  },
  city: {
    type: String,
    default: ""
  },
  state: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  licenseNumber: {
    type: String,
    default: ""
  },
  // Hospital-specific
  headDoctor: {
    type: String,
    default: ""
  },
  hospitalType: {
    type: String,
    default: ""
  },
  // Manufacturer-specific
  gstNumber: {
    type: String,
    default: ""
  },
  manufacturingCategory: {
    type: String,
    default: ""
  },
  // Dealer-specific
  distributionRegion: {
    type: String,
    default: ""
  },
  // Medical Store-specific
  pharmacistName: {
    type: String,
    default: ""
  },
  txHash: {
    type: String,
    default: ""
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

const Entity = mongoose.model('Entity', EntitySchema, 'Entity');
export default Entity;
