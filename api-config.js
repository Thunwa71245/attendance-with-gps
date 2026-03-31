const DEFAULT_GAS_API_URL = "https://script.google.com/macros/s/AKfycbxkthm6Kmq61oSckBHv6wGerL2bdgvn-k1yTWbrqOjeSlcjwgV3JEjoOhq3i8933YRS1w/exec";

function getConfiguredGasApiUrl() {
  const storedUrl = typeof localStorage !== "undefined" ? localStorage.getItem("gas_url") : "";
  return (storedUrl && storedUrl.trim()) || DEFAULT_GAS_API_URL;
}

const GAS_API_URL = getConfiguredGasApiUrl();
