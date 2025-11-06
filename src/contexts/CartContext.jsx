import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import {
  ref,
  get,
  push,
  set,
  update,
  remove,
  onValue,
} from "firebase/database";
import { rtdb } from "../firebase";
import { useAuth } from "./AuthContext";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// backward-compatible hooks (untuk code lama)
export const useCartState = () => {
  const ctx = useContext(CartContext);
  return { items: ctx?.cart || [] };
};
export const useCartDispatch = () => {
  const ctx = useContext(CartContext);
  // return a dispatch-like function for compatibility
  return (action) => {
    if (!action || typeof action !== "object") return;
    const { type, payload } = action;
    switch (type) {
      case "ADD_ITEM":
        return ctx.addToCart(payload);
      case "REMOVE_ITEM":
        return ctx.removeFromCart(payload);
      case "CLEAR_CART":
        return ctx.clearCart();
      case "UPDATE_QTY":
        return ctx.updateItemQty(payload);
      default:
        console.warn("useCartDispatch unknown action:", action);
    }
  };
};

const initialState = { items: [] };
const GUEST_KEY = "guest_cart_v1";

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_CART":
      return { ...state, items: action.payload || [] };
    case "ADD_LOCAL": {
      const payload = action.payload;
      const exists = state.items.find(
        (i) =>
          i.id === payload.id &&
          (i.variant ?? null) === (payload.variant ?? null)
      );
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === payload.id &&
            (i.variant ?? null) === (payload.variant ?? null)
              ? { ...i, qty: (i.qty || 0) + (payload.qty || 1) }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...payload, qty: payload.qty || 1 }],
      };
    }
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const remoteListenerRef = useRef(null);

  const readGuest = () => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("readGuest error:", e);
      return [];
    }
  };

  const writeGuest = (items) => {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(items || []));
    } catch (e) {
      console.error("writeGuest error:", e);
    }
  };

  const snapshotToArray = (snapVal) => {
    if (!snapVal) return [];
    if (Array.isArray(snapVal)) {
      return snapVal.map((it) => ({ ...it }));
    }
    if (typeof snapVal === "object") {
      return Object.entries(snapVal).map(([key, val]) => ({
        _cid: key,
        ...val,
      }));
    }
    return [];
  };

  // listen realtime when user logged in; otherwise load guest local
  useEffect(() => {
    if (remoteListenerRef.current) {
      try {
        remoteListenerRef.current();
      } catch {}
      remoteListenerRef.current = null;
    }

    if (user && user.uid) {
      const userCartRef = ref(rtdb, `users/${user.uid}/cart`);
      const off = onValue(
        userCartRef,
        (snapshot) => {
          const val = snapshot.val();
          const items = snapshotToArray(val).map((it) => ({
            ...it,
            qty: Number(it.qty || 0),
            price: Number(it.price || 0),
          }));
          dispatch({ type: "SET_CART", payload: items });
        },
        (err) => {
          console.error("onValue cart error:", err);
        }
      );
      remoteListenerRef.current = () => off();
    } else {
      const guestCart = readGuest();
      dispatch({ type: "SET_CART", payload: guestCart });
    }

    return () => {
      if (remoteListenerRef.current) {
        try {
          remoteListenerRef.current();
        } catch {}
        remoteListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ACTIONS
  const addToCart = async (payload) => {
    if (!payload) return;
    try {
      if (user && user.uid) {
        const existing = state.items.find(
          (i) =>
            i.id === payload.id &&
            (i.variant ?? null) === (payload.variant ?? null)
        );
        if (existing && existing._cid) {
          const newQty = (existing.qty || 0) + (payload.qty || 1);
          const itemRef = ref(rtdb, `users/${user.uid}/cart/${existing._cid}`);
          await update(itemRef, { ...existing, qty: newQty });
        } else {
          const cartRef = ref(rtdb, `users/${user.uid}/cart`);
          const newRef = push(cartRef);
          const itemToSave = {
            id: payload.id,
            name: payload.name,
            price: payload.price ?? 0,
            qty: payload.qty ?? 1,
            variant: payload.variant ?? null,
            size: payload.size ?? null,
            image: payload.image ?? null,
          };
          await set(newRef, itemToSave);
        }
      } else {
        dispatch({ type: "ADD_LOCAL", payload });
        const cur = readGuest();
        const exists = cur.find(
          (i) =>
            i.id === payload.id &&
            (i.variant ?? null) === (payload.variant ?? null)
        );
        let newItems;
        if (exists) {
          newItems = cur.map((i) =>
            i.id === payload.id &&
            (i.variant ?? null) === (payload.variant ?? null)
              ? { ...i, qty: (i.qty || 0) + (payload.qty || 1) }
              : i
          );
        } else {
          newItems = [...cur, { ...payload, qty: payload.qty ?? 1 }];
        }
        writeGuest(newItems);
      }
    } catch (err) {
      console.error("addToCart error:", err);
    }
  };

  const updateItemQty = async (payload) => {
    // payload: { _cid?, id, variant?, qty }
    if (!payload) return;
    try {
      if (user && user.uid) {
        if (payload._cid) {
          const itemRef = ref(rtdb, `users/${user.uid}/cart/${payload._cid}`);
          await update(itemRef, { qty: payload.qty });
        } else {
          const existing = state.items.find(
            (i) =>
              i.id === payload.id &&
              (i.variant ?? null) === (payload.variant ?? null)
          );
          if (existing && existing._cid) {
            const itemRef = ref(
              rtdb,
              `users/${user.uid}/cart/${existing._cid}`
            );
            await update(itemRef, { qty: payload.qty });
          } else {
            // fallback: read array and rewrite
            const userCartRef = ref(rtdb, `users/${user.uid}/cart`);
            const snap = await get(userCartRef);
            if (snap.exists()) {
              const val = snap.val();
              if (Array.isArray(val)) {
                const updated = val.map((it) =>
                  it.id === payload.id &&
                  (it.variant ?? null) === (payload.variant ?? null)
                    ? { ...it, qty: payload.qty }
                    : it
                );
                await set(userCartRef, updated);
              }
            }
          }
        }
        // remote listener updates local state
      } else {
        const cur = readGuest();
        const updated = cur.map((i) =>
          i.id === payload.id &&
          (i.variant ?? null) === (payload.variant ?? null)
            ? { ...i, qty: payload.qty }
            : i
        );
        writeGuest(updated);
        dispatch({ type: "SET_CART", payload: updated });
      }
    } catch (err) {
      console.error("updateItemQty error:", err);
    }
  };

  const removeFromCart = async (payload) => {
    // payload may be id string or { id, variant, _cid }
    if (!payload) return;
    try {
      if (user && user.uid) {
        let _cid = null;
        if (typeof payload === "string") {
          // treat as id (no variant)
          const existing = state.items.find((i) => i.id === payload);
          if (existing) _cid = existing._cid;
        } else if (payload._cid) {
          _cid = payload._cid;
        } else {
          const existing = state.items.find(
            (i) =>
              i.id === payload.id &&
              (i.variant ?? null) === (payload.variant ?? null)
          );
          if (existing) _cid = existing._cid;
        }

        if (_cid) {
          const itemRef = ref(rtdb, `users/${user.uid}/cart/${_cid}`);
          await remove(itemRef);
        } else {
          const userCartRef = ref(rtdb, `users/${user.uid}/cart`);
          const snap = await get(userCartRef);
          if (snap.exists()) {
            const val = snap.val();
            if (Array.isArray(val)) {
              const filtered = val.filter(
                (it) =>
                  !(
                    it.id === (payload.id ?? payload) &&
                    (it.variant ?? null) === (payload.variant ?? null)
                  )
              );
              await set(userCartRef, filtered);
            }
          }
        }
      } else {
        const cur = readGuest();
        const filtered = cur.filter(
          (i) =>
            !(
              i.id === (payload.id ?? payload) &&
              (i.variant ?? null) === (payload.variant ?? null)
            )
        );
        writeGuest(filtered);
        dispatch({ type: "SET_CART", payload: filtered });
      }
    } catch (err) {
      console.error("removeFromCart error:", err);
    }
  };

  const clearCart = async () => {
    try {
      if (user && user.uid) {
        const userCartRef = ref(rtdb, `users/${user.uid}/cart`);
        await set(userCartRef, []);
      } else {
        writeGuest([]);
        dispatch({ type: "SET_CART", payload: [] });
      }
    } catch (err) {
      console.error("clearCart error:", err);
    }
  };

  const getCartTotal = () =>
    state.items.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
      0
    );
  const getCartCount = () =>
    state.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart: state.items,
        addToCart,
        updateItemQty,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
