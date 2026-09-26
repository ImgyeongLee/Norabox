"use client";

// Anonymous identity for visitors without an account. The client id is a
// secret kept in localStorage; the server uses it to recognise a room's admin.

const CLIENT_ID_KEY = "norabox:clientId";
const NICKNAME_KEY = "norabox:nickname";

export function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name.trim().slice(0, 24));
}

// Rooms this tab has joined. sessionStorage survives a page refresh but not a
// new tab, so an accidental refresh rejoins automatically without the join screen.

const joinedKey = (code: string) => `norabox:joined:${code.toLowerCase()}`;

export function getJoinedName(code: string) {
  try {
    return sessionStorage.getItem(joinedKey(code));
  } catch {
    return null;
  }
}

export function rememberJoin(code: string, name: string) {
  try {
    sessionStorage.setItem(joinedKey(code), name);
  } catch {}
}

export function forgetJoin(code: string) {
  try {
    sessionStorage.removeItem(joinedKey(code));
  } catch {}
}
