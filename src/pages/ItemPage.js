import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

// Page to display whatever item is clicked on by id
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
        <p>Name: {item.itemName}</p>
        <p>Price: ${item.itemCost}</p>
        <p>Condition: {item.itemCondition}</p>
        <p>Location: {item.itemLocation}</p>
        {item.itemPicture && (<img src={item.itemPicture}/>)}
        <p>Description: {item.itemDescription}</p>
        <p>Details: {item.itemDetails}</p>
        <Link to={`/profile/${item.userPublishingID}`}>
            <p>Published by: {item.userPublishingName}</p>
        </Link>
    </main>
  );
}