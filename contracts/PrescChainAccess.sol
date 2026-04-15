// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PrescChainAccess
 * @notice Role-based access control for the PrescChain pharmaceutical supply chain.
 * @dev Defines five roles: Manufacturer, Hospital, Dealer, MedicalStore, Regulator.
 *      The deployer is granted DEFAULT_ADMIN_ROLE and REGULATOR_ROLE.
 */
contract PrescChainAccess is AccessControl {
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR");
    bytes32 public constant HOSPITAL_ROLE = keccak256("HOSPITAL");
    bytes32 public constant DEALER_ROLE = keccak256("DEALER");
    bytes32 public constant MEDICAL_STORE_ROLE = keccak256("MEDICAL_STORE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER");

    event EntityRegistered(address indexed entity, bytes32 indexed role, string name);
    event EntityRevoked(address indexed entity, bytes32 indexed role);

    struct Entity {
        string name;
        bytes32 role;
        bool active;
    }

    mapping(address => Entity) public entities;
    address[] public entityList;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGULATOR_ROLE, msg.sender);
        entities[msg.sender] = Entity("System Admin", REGULATOR_ROLE, true);
        entityList.push(msg.sender);
    }

    function addRegulator(address account, string calldata name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(REGULATOR_ROLE, account);
        entities[account] = Entity(name, REGULATOR_ROLE, true);
        entityList.push(account);
        emit EntityRegistered(account, REGULATOR_ROLE, name);
    }

    function addHospital(address account, string calldata name) external onlyRole(REGULATOR_ROLE) {
        grantRole(HOSPITAL_ROLE, account);
        entities[account] = Entity(name, HOSPITAL_ROLE, true);
        entityList.push(account);
        emit EntityRegistered(account, HOSPITAL_ROLE, name);
    }

    function addDealer(address account, string calldata name) external onlyRole(REGULATOR_ROLE) {
        grantRole(DEALER_ROLE, account);
        entities[account] = Entity(name, DEALER_ROLE, true);
        entityList.push(account);
        emit EntityRegistered(account, DEALER_ROLE, name);
    }

    function addMedicalStore(address account, string calldata name) external onlyRole(REGULATOR_ROLE) {
        grantRole(MEDICAL_STORE_ROLE, account);
        entities[account] = Entity(name, MEDICAL_STORE_ROLE, true);
        entityList.push(account);
        emit EntityRegistered(account, MEDICAL_STORE_ROLE, name);
    }

    function addManufacturer(address account, string calldata name) external onlyRole(REGULATOR_ROLE) {
        grantRole(MANUFACTURER_ROLE, account);
        entities[account] = Entity(name, MANUFACTURER_ROLE, true);
        entityList.push(account);
        emit EntityRegistered(account, MANUFACTURER_ROLE, name);
    }

    function revokeEntity(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(entities[account].active, "Entity not active");
        revokeRole(entities[account].role, account);
        entities[account].active = false;
        emit EntityRevoked(account, entities[account].role);
    }

    function getEntityCount() external view returns (uint256) {
        return entityList.length;
    }

    function isActiveEntity(address account, bytes32 role) external view returns (bool) {
        return entities[account].active && hasRole(role, account);
    }
}
