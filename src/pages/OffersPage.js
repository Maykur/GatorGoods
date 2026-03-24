// REFERENCES: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function OffersPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const condColors = {
    Perfect: "lime",
    Good: "yellow",
    Fair: "orange",
    Poor: "red",
  };
  useEffect(() => {
    const itemFetch = async () => {
      try {
        const res = await fetch("http://localhost:5000/items");
        if (!res.ok){
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setItems(data);
        setError("");
      } catch (err){
        setError(err.message);
      }
    };
    itemFetch();
  }, []);
  if (error){
    return <p style={{color: "red"}}>{error}</p>;
  }
  return (
    <main style={{padding: "20px"}}>
      <h1 style={{marginBottom: "20px"}}>Offerings:</h1>
      <div style={{display: "flex", flexWrap: "wrap", gap: "20px"}}>
        {items.map((item) => (
          <Link key={item._id} to={`/items/${item._id}`} style={{textDecoration: "none"}}>
            <div key={item._id}
              style={{
                flex: "1 1 200px",
                border: "1px solid #FA4616",
                borderRadius: "8px",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: "250px",
                backgroundColor: "#0033A0",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              {item.itemPicture && (
                <img
                  src={item.itemPicture}
                  alt={item.itemName}
                  style={{width: "100%", borderRadius: "5px", marginBottom: "10px"}}
                />
              )}
              <h2 style={{fontSize: "16px", margin: "5px 0"}}>Name: {item.itemName}</h2>
              <p style={{fontSize: "14px", margin: "3px 0"}}>Price: ${item.itemCost}</p>
              <p style={{fontSize: "12px", color: condColors[item.itemCondition], margin: "3px 0"}}>
                Condition: {item.itemCondition}
              </p>
              <p>
                Location: {item.itemLocation}
              </p>
              <p style={{fontSize: "12px", color: "#777", marginTop: "5px"}}>
                Published by: {item.userPublishingName || "Unknown"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

