import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, rtdb } from "../firebase";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const userRef = ref(rtdb, `users/${u.uid}`);
          const snap = await get(userRef);
          if (!snap.exists()) {
            const defaultName =
              u.displayName || (u.email ? u.email.split("@")[0] : "Pengguna");
            await set(userRef, {
              uid: u.uid,
              email: u.email,
              name: defaultName,
              phone: "",
              address: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              cart: [], // pastikan cart ada
            });
          } else {
            // update timestamp dan pastikan cart ada
            const data = snap.val();
            const updates = { updatedAt: new Date().toISOString() };
            if (!("cart" in data)) updates.cart = [];
            await update(userRef, updates);
          }
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    return res.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = { user, loading, signInWithGoogle, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
