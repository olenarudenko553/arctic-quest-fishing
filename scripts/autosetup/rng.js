function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mix32(n) {
  let x = n >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(key) {
  return mulberry32(mix32(hashSeed(key)));
}

function randomSeedString(length = 24) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = require("node:crypto").randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function identFromRng(rng, minLen = 3, maxLen = 6) {
  const consonants = "bcdfghjklmnpqrstvwxz";
  const vowels = "aeiou";
  const len = minLen + Math.floor(rng() * (maxLen - minLen + 1));
  let s = "";
  for (let i = 0; i < len; i++) {
    const set = i % 2 === 0 ? consonants : vowels;
    s += set[Math.floor(rng() * set.length)];
  }
  return s;
}

module.exports = {
  hashSeed,
  mix32,
  mulberry32,
  rngFor,
  randomSeedString,
  identFromRng,
};
