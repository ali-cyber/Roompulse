import { v4 as uuidv4 } from "uuid";

const KEY = "roompulse_client_hash";

export function getClientHash() {
  if (typeof window === "undefined") return "server";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = uuidv4();
    localStorage.setItem(KEY, v);
  }
  return v;
}
