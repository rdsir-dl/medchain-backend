import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
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
    index: true
  },
  aadharNo: {
    type: String,
    index: true
  },
  age: {
    type: String
  },
  gender: {
    type: String
  },
  department: {
    type: String
  },
  hospitalName: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Patient = mongoose.model('Patient', PatientSchema, 'Patient');
export default Patient;
