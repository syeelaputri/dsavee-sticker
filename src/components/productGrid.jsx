import React from "react";
import ProductCard from "./productCard";

const sampleProducts = [
  {
    id: "p1",
    name: "Sunstar Fresh Melon Juice",
    price: 18.0,
    image: "/images/thumb-bananas.png",
    badge: "-30%",
  },
  {
    id: "p2",
    name: "Biscuits",
    price: 18.0,
    image: "/images/thumb-biscuits.png",
    badge: "-30%",
  },
  {
    id: "p3",
    name: "Cucumber",
    price: 18.0,
    image: "/images/thumb-cucumber.png",
  },
  { id: "p4", name: "Milk", price: 18.0, image: "/images/thumb-milk.png" },
  // ... tambah sesuai kebutuhan
];

export default function ProductGrid({ products = sampleProducts }) {
  return (
    <div className="product-grid row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
      {products.map((p) => (
        <div className="col" key={p.id}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
