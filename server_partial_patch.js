// Changes needed for /api/prescription endpoint:

// LINE 68: Add issuedBy to destructuring
let { patientName, fatherName, address, medications, expiry, mobileNo, aadharNo, issuedBy } = req.body;

// LINE 142-158: Add issuedBy to Prescription creation
const dbPrescription = new Prescription({
    slipHash,
    shortCode,
    patientId,
    issuedBy, // ADD THIS LINE
    patientName,
    fatherName,
    address,
    mobileNo,
    aadharNo,
    medications: medications.map(m => ({
        drugId: parseInt(m.id || m.drugId),
        name: m.name,
        totalQty: parseInt(m.totalQty),
        remainingQty: parseInt(m.totalQty)
    })),
    expiry: expiryVal
});