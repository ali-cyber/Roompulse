import crypto from "node:crypto";

export function makeJoinCode(len = Number(process.env.ROOM_JOIN_CODE_LENGTH ?? 5)) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function makeSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
