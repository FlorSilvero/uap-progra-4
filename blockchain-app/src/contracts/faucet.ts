export const faucetAddress = import.meta.env
  .VITE_FAUCET_CONTRACT_ADDRESS as `0x${string}`;

export const faucetAbi = [
  { type: "event", name: "TokensClaimed", inputs: [
    { name: "recipient", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ], anonymous: false },

  { type: "function", stateMutability: "nonpayable", name: "claimTokens", inputs: [], outputs: [] },
  { type: "function", stateMutability: "view", name: "hasAddressClaimed", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", stateMutability: "pure", name: "getFaucetAmount", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "getFaucetUsers", inputs: [], outputs: [{ type: "address[]" }] },

  { type: "function", stateMutability: "nonpayable", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", stateMutability: "nonpayable", name: "resetClaimStatus", inputs: [{ name: "account", type: "address" }], outputs: [] },

  { type: "function", stateMutability: "view", name: "owner", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", stateMutability: "nonpayable", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address" }], outputs: [] },
  { type: "function", stateMutability: "nonpayable", name: "renounceOwnership", inputs: [], outputs: [] },

  { type: "function", stateMutability: "view", name: "name", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", stateMutability: "view", name: "symbol", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", stateMutability: "view", name: "decimals", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", stateMutability: "view", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", stateMutability: "nonpayable", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", stateMutability: "view", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", stateMutability: "nonpayable", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", stateMutability: "nonpayable", name: "transferFrom", inputs: [
    { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }
  ], outputs: [{ type: "bool" }] },

  { type: "function", stateMutability: "view", name: "hasClaimed", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", stateMutability: "view", name: "FAUCET_AMOUNT", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
