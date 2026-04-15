// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PrescChainAccess.sol";
import "./PrescriptionRegistry.sol";

/**
 * @title DrugUnitToken
 * @notice Manages drug inventory and distribution with prescription validation.
 * @dev Manufacturers mint drugs to Dealers. Dealers supply drugs to medical stores.
 *      Medical stores dispense to patients only against valid prescriptions verified via slip hash.
 *      All transactions create an immutable audit trail.
 */
contract DrugUnitToken {
    PrescChainAccess public accessControl;
    PrescriptionRegistry public prescriptionRegistry;

    // Store Inventory: storeAddress => drugId => quantity
    mapping(address => mapping(uint256 => uint256)) public inventory;

    // Dealer Inventory: dealerAddress => drugId => quantity
    mapping(address => mapping(uint256 => uint256)) public dealerInventory;

    // Manufacturer Limits (set by Regulator): manufacturer => drugId => maxMintable
    mapping(address => mapping(uint256 => uint256)) public manufacturerMintLimit;

    // Manufacturer Minted Totals: manufacturer => drugId => totalMinted
    mapping(address => mapping(uint256 => uint256)) public manufacturerMintedTotal;

    // Audit trail for sales
    struct SaleRecord {
        bytes32 prescriptionId;
        address store;
        uint256 drugId;
        uint256 quantity;
        bytes32 patientHash;
        uint256 timestamp;
    }

    SaleRecord[] public saleRecords;

    // Supply trail (Dealer -> Store)
    struct SupplyRecord {
        address dealer;
        address store;
        uint256 drugId;
        uint256 quantity;
        uint256 timestamp;
    }

    SupplyRecord[] public supplyRecords;

    // Manufacturer Supply trail (Manufacturer -> Dealer)
    struct ManufacturerSupplyRecord {
        address manufacturer;
        address dealer;
        uint256 drugId;
        uint256 quantity;
        uint256 timestamp;
    }

    ManufacturerSupplyRecord[] public manufacturerSupplyRecords;

    // Events
    event SupplyRecorded(
        address indexed dealer,
        address indexed store,
        uint256 drugId,
        uint256 quantity,
        uint256 timestamp
    );
    event SaleRecorded(
        bytes32 indexed prescriptionId,
        address indexed store,
        uint256 drugId,
        uint256 quantity,
        bytes32 patientHash,
        uint256 timestamp
    );
    event ManufacturerSupplied(
        address indexed manufacturer,
        address indexed dealer,
        uint256 drugId,
        uint256 quantity,
        uint256 timestamp
    );
    event LimitUpdated(
        address indexed manufacturer,
        uint256 drugId,
        uint256 newLimit
    );

    modifier onlyManufacturer() {
        require(
            accessControl.hasRole(accessControl.MANUFACTURER_ROLE(), msg.sender),
            "Caller is not a manufacturer"
        );
        _;
    }

    modifier onlyDealer() {
        require(
            accessControl.hasRole(accessControl.DEALER_ROLE(), msg.sender),
            "Caller is not a dealer"
        );
        _;
    }

    modifier onlyMedicalStore() {
        require(
            accessControl.hasRole(accessControl.MEDICAL_STORE_ROLE(), msg.sender),
            "Caller is not a medical store"
        );
        _;
    }

    modifier onlyRegulator() {
        require(
            accessControl.hasRole(accessControl.REGULATOR_ROLE(), msg.sender),
            "Caller is not a regulator"
        );
        _;
    }

    constructor(address _accessControl, address _prescriptionRegistry) {
        accessControl = PrescChainAccess(_accessControl);
        prescriptionRegistry = PrescriptionRegistry(_prescriptionRegistry);
    }

    // ---------- Regulator: Set Manufacturing Limits ----------

    /**
     * @notice Regulator sets the maximum manufacturing limit for a manufacturer per drug.
     */
    function setManufacturerLimit(address manufacturer, uint256 drugId, uint256 maxAmount) external onlyRegulator {
        require(
            accessControl.hasRole(accessControl.MANUFACTURER_ROLE(), manufacturer),
            "Target is not a manufacturer"
        );
        require(maxAmount > 0, "Limit must be > 0");
        manufacturerMintLimit[manufacturer][drugId] = maxAmount;
        emit LimitUpdated(manufacturer, drugId, maxAmount);
    }

    // ---------- Manufacturer: Mint drugs to Dealer ----------

    /**
     * @notice Manufacturer mints drug supply to a registered dealer.
     */
    function mintSupplyToDealer(address dealer, uint256 drugId, uint256 quantity) external onlyManufacturer {
        require(
            accessControl.hasRole(accessControl.DEALER_ROLE(), dealer),
            "Dealer not registered"
        );
        require(quantity > 0, "Quantity zero");
        require(
            manufacturerMintedTotal[msg.sender][drugId] + quantity <= manufacturerMintLimit[msg.sender][drugId],
            "Exceeds manufacturing limit"
        );

        manufacturerMintedTotal[msg.sender][drugId] += quantity;
        dealerInventory[dealer][drugId] += quantity;

        manufacturerSupplyRecords.push(ManufacturerSupplyRecord({
            manufacturer: msg.sender,
            dealer: dealer,
            drugId: drugId,
            quantity: quantity,
            timestamp: block.timestamp
        }));

        emit ManufacturerSupplied(msg.sender, dealer, drugId, quantity, block.timestamp);
    }

    // ---------- Dealer: Supply drugs to Medical Store ----------

    /**
     * @notice Dealer supplies drugs to a registered medical store from their own inventory.
     */
    function recordSupply(address store, uint256 drugId, uint256 quantity) external onlyDealer {
        require(
            accessControl.hasRole(accessControl.MEDICAL_STORE_ROLE(), store),
            "Store not registered"
        );
        require(quantity > 0, "Quantity zero");
        require(dealerInventory[msg.sender][drugId] >= quantity, "Insufficient dealer inventory");

        dealerInventory[msg.sender][drugId] -= quantity;
        inventory[store][drugId] += quantity;

        supplyRecords.push(SupplyRecord({
            dealer: msg.sender,
            store: store,
            drugId: drugId,
            quantity: quantity,
            timestamp: block.timestamp
        }));

        emit SupplyRecorded(msg.sender, store, drugId, quantity, block.timestamp);
    }

    // ---------- Medical Store: Sell to Patient ----------

    /**
     * @notice Medical store sells drugs to a patient using their slip hash and item index.
     */
    function sellWithSlip(
        bytes32 slipHash,
        bytes32 patientHash,
        uint256 itemIndex,
        uint256 quantity
    ) external onlyMedicalStore {
        (bool valid, bytes32 prescriptionId, uint256[] memory drugIds, uint256[] memory remainingQtys, ) =
            prescriptionRegistry.verifyBySlip(slipHash);

        require(valid, "Invalid or expired prescription");
        require(itemIndex < drugIds.length, "Invalid item index");
        
        uint256 drugId = drugIds[itemIndex];
        uint256 remainingQty = remainingQtys[itemIndex];

        require(remainingQty >= quantity, "Insufficient prescription remaining");
        require(inventory[msg.sender][drugId] >= quantity, "Insufficient store inventory");

        prescriptionRegistry.deductPrescription(prescriptionId, itemIndex, quantity);
        inventory[msg.sender][drugId] -= quantity;

        saleRecords.push(SaleRecord({
            prescriptionId: prescriptionId,
            store: msg.sender,
            drugId: drugId,
            quantity: quantity,
            patientHash: patientHash,
            timestamp: block.timestamp
        }));

        emit SaleRecorded(prescriptionId, msg.sender, drugId, quantity, patientHash, block.timestamp);
    }

    // ---------- View / Audit Functions ----------

    function getStoreInventory(address store, uint256 drugId) external view returns (uint256) {
        return inventory[store][drugId];
    }

    function getDealerInventory(address dealer, uint256 drugId) external view returns (uint256) {
        return dealerInventory[dealer][drugId];
    }

    function getSaleCount() external view returns (uint256) {
        return saleRecords.length;
    }

    function getSupplyCount() external view returns (uint256) {
        return supplyRecords.length;
    }

    function getManufacturerSupplyCount() external view returns (uint256) {
        return manufacturerSupplyRecords.length;
    }

    function getSaleRecord(uint256 index) external view returns (SaleRecord memory) {
        return saleRecords[index];
    }

    function getSupplyRecord(uint256 index) external view returns (SupplyRecord memory) {
        return supplyRecords[index];
    }

    function getManufacturerSupplyRecord(uint256 index) external view returns (ManufacturerSupplyRecord memory) {
        return manufacturerSupplyRecords[index];
    }
}
