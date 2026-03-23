import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function ItemPage() {
    const {id} = useParams();
    const [item, setItem] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
    const itemFetch = async () => {
      try {
        const res = await fetch(`http://localhost:5000/items/${id}`);
        if (!res.ok){
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setItem(data);
        setError("");
      } catch (err){
        setError(err.message);
      }
    };
    itemFetch();
  }, [id]);
  if (error){
    return <p style={{color: "red"}}>{error}</p>;
  }
  if (!item) {
    return <p>Loading</p>;
  }
  return (
    <main style={{padding: "15px"}}>
        <h1>Name: {item.itemName}</h1>
        <h1>Price: ${item.itemCost}</h1>
        <h1>Condition: {item.itemCondition}</h1>
        <h1>Location: {item.itemLocation}</h1>
        {item.itemPicture && (
                <img
                  src={item.itemPicture}
                  alt={item.itemName}
                  style={{width: "20%", borderRadius: "5px", marginBottom: "10px"}}
                />
              )}
        <h1>Description: {item.itemDescription}</h1>
        <h1>Details: {item.itemDetails}</h1>
        <h1>Published by: {item.userPublishingName}</h1>
    </main>
  );
}