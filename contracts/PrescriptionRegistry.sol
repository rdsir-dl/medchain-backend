// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PrescChainAccess.sol";

/**
 * @title PrescriptionRegistry
 * @notice Manages digital prescriptions with cryptographic Slip IDs.
 * @dev Hospitals issue prescriptions and generate a separate slipHash
 *      for patients. Pharmacies use the slipHash to look up and fulfill
 *      prescriptions. The prescriptionId is never exposed to the patient.
 */
contract PrescriptionRegistry {
    PrescChainAccess public accessControl;

    // Prescription data
    struct Prescription {
        bytes32 prescriptionId;
        bytes32 slipHash;
        bytes32 patientHash;
        uint256[] drugIds;
        uint256[] totalQtys;
        uint256[] remainingQtys;
        uint256 expiry;
        address hospital;
        bool active;
        uint256 issuedAt;
    }

    mapping(bytes32 => Prescription) public prescriptions;      // prescriptionId -> Prescription
    mapping(bytes32 => bytes32) private slipToPrescription;     // slipHash -> prescriptionId
    bytes32[] public prescriptionIds;

    // Events
    event PrescriptionIssued(
        bytes32 indexed prescriptionId,
        bytes32 indexed slipHash,
        uint256[] drugIds,
        uint256[] totalQtys,
        uint256 expiry,
        bytes32 patientHash
    );
    event PrescriptionFulfilled(bytes32 indexed prescriptionId, address indexed store, uint256 itemIndex, uint256 quantity);
    event PrescriptionCancelled(bytes32 indexed prescriptionId, address indexed hospital);

    modifier onlyHospital() {
        require(
            accessControl.hasRole(accessControl.HOSPITAL_ROLE(), msg.sender),
            "Caller is not a hospital"
        );
        _;
    }

    address public tokenContract;

    modifier onlyMedicalStoreOrToken() {
        require(
            accessControl.hasRole(accessControl.MEDICAL_STORE_ROLE(), msg.sender) || msg.sender == tokenContract,
            "Caller not authorized"
        );
        _;
    }

    function setTokenContract(address _tokenContract) external {
        require(
            accessControl.hasRole(accessControl.REGULATOR_ROLE(), msg.sender) || 
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Only admin/regulator"
        );
        tokenContract = _tokenContract;
    }

    constructor(address _accessControl) {
        accessControl = PrescChainAccess(_accessControl);
    }

    /**
     * @notice Hospital issues a prescription with multiple drugs.
     */
    function issuePrescription(
        bytes32 patientHash,
        uint256[] memory drugIds,
        uint256[] memory quantities,
        uint256 expiry,
        bytes32 _slipHash
    ) external onlyHospital returns (bytes32 prescriptionId, bytes32 slipHash) {
        require(drugIds.length > 0, "No drugs provided");
        require(drugIds.length == quantities.length, "Array length mismatch");
        require(expiry > block.timestamp, "Expiry in past");

        prescriptionId = keccak256(
            abi.encodePacked(msg.sender, patientHash, drugIds[0], quantities[0], expiry, block.timestamp, block.number)
        );
        require(prescriptions[prescriptionId].issuedAt == 0, "Duplicate prescription");

        slipHash = _slipHash;

        prescriptions[prescriptionId] = Prescription({
            prescriptionId: prescriptionId,
            slipHash: slipHash,
            patientHash: patientHash,
            drugIds: drugIds,
            totalQtys: quantities,
            remainingQtys: quantities,
            expiry: expiry,
            hospital: msg.sender,
            active: true,
            issuedAt: block.timestamp
        });

        slipToPrescription[slipHash] = prescriptionId;
        prescriptionIds.push(prescriptionId);

        emit PrescriptionIssued(prescriptionId, slipHash, drugIds, quantities, expiry, patientHash);
    }

    /**
     * @notice Verify a prescription and get all associated drugs.
     */
    function verifyBySlip(bytes32 slipHash) external view returns (
        bool valid,
        bytes32 prescriptionId,
        uint256[] memory drugIds,
        uint256[] memory remainingQtys,
        uint256 expiry
    ) {
        prescriptionId = slipToPrescription[slipHash];
        if (prescriptionId == bytes32(0)) return (false, bytes32(0), new uint256[](0), new uint256[](0), 0);

        Prescription storage p = prescriptions[prescriptionId];
        valid = p.active && block.timestamp <= p.expiry;
        return (valid, prescriptionId, p.drugIds, p.remainingQtys, p.expiry);
    }

    /**
     * @notice Deduct quantity for a specific drug in the prescription.
     */
    function deductPrescription(bytes32 prescriptionId, uint256 itemIndex, uint256 quantity) external onlyMedicalStoreOrToken {
        Prescription storage p = prescriptions[prescriptionId];
        require(p.active, "Prescription inactive");
        require(itemIndex < p.drugIds.length, "Invalid item index");
        require(p.remainingQtys[itemIndex] >= quantity, "Insufficient remaining");
        require(block.timestamp <= p.expiry, "Prescription expired");

        p.remainingQtys[itemIndex] -= quantity;
        
        // Check if all items are fulfilled
        bool allFulfilled = true;
        for (uint256 i = 0; i < p.remainingQtys.length; i++) {
            if (p.remainingQtys[i] > 0) {
                allFulfilled = false;
                break;
            }
        }
        if (allFulfilled) p.active = false;

        emit PrescriptionFulfilled(prescriptionId, msg.sender, itemIndex, quantity);
    }

    /**
     * @notice Hospital cancels an active prescription.
     */
    function cancelPrescription(bytes32 prescriptionId) external onlyHospital {
        Prescription storage p = prescriptions[prescriptionId];
        require(p.hospital == msg.sender, "Not your prescription");
        require(p.active, "Already inactive");
        p.active = false;
        emit PrescriptionCancelled(prescriptionId, msg.sender);
    }

    function getPrescriptionCount() external view returns (uint256) {
        return prescriptionIds.length;
    }

    function getPrescription(bytes32 prescriptionId) external view returns (Prescription memory) {
        return prescriptions[prescriptionId];
    }

    function getPrescriptionRemaining(bytes32 prescriptionId) external view returns (uint256[] memory) {
        return prescriptions[prescriptionId].remainingQtys;
    }
}
