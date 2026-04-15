const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const testDb = async () => {
  console.log("🔍 [DB TEST] Checking connection to MongoDB Atlas...");
  console.log("📡 URI:", process.env.DATABASE_URL ? "Exists (Sensitive)" : "MISSING");

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ [DB TEST] Connected successfully!");

    // Try a simple write
    const TestSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', TestSchema);
    
    console.log("⏳ [DB TEST] Attempting to write a test record...");
    const testRecord = new TestModel({ name: "Connectivity Test " + new Date().toISOString() });
    await testRecord.save();
    console.log("✅ [DB TEST] Write successful! _id:", testRecord._id);

    // Clean up
    await TestModel.deleteOne({ _id: testRecord._id });
    console.log("✅ [DB TEST] Cleanup successful!");

    await mongoose.disconnect();
    console.log("🏁 [DB TEST] Test completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [DB TEST] FAILED:", err.message);
    process.exit(1);
  }
};

testDb();
