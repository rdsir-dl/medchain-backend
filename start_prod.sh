#!/bin/bash
echo "----------------------------------------------------"
echo "💠 Starting MedChain Production Environment"
echo "----------------------------------------------------"

npx hardhat compile
npx hardhat node > hardhat_node.log 2>&1 &
NODE_PID=$!

echo "⏳ Waiting for node..."
sleep 5

echo "🚀 Deploying Contracts..."
npx hardhat run scripts/deploy.js --network localhost

echo "📡 Starting MedChain Hub API..."
npm start

trap "kill $NODE_PID" EXIT
