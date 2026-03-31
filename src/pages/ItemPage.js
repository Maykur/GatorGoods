// REFERENCES: https://stackoverflow.com/questions/52034868/confirm-window-in-react
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/react";
import { createConversation } from "../lib/messagesApi";

// Page to display whatever item is clicked on by id
export function ItemPage() {
    const { user, isSignedIn } = useUser();
    const {id} = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [favorite, setFav] = useState(false);
    const [isStartingConversation, setIsStartingConversation] = useState(false);
    const [error, setError] = useState("");
    const isOwner = Boolean(user?.id && item?.userPublishingID === user.id);

    const toggleFavorite = async (e) => {
      e.preventDefault();

      if (!user?.id) {
        navigate("/login");
        return;
      }

      try{
        const favStatus = favorite ? "DELETE" : "POST";
        const res = await fetch(`http://localhost:5000/user/${user.id}/fav/${id}`, {
          method: favStatus,
        });
        if (!res.ok){
          throw new Error("Couldn't fav");
        }
        setFav(!favorite);
      } catch (e) {
        alert("Update Favorites Failed.");
      }
    }
    const handleOnSubmit = async (e, id) => {
      e.preventDefault();
      const verif = window.confirm("This action will delete this item. Are you sure?");
        if (!verif) {
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/item/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              setError('Error during delete');
              return;
            }

            alert('Item Deleted');
            navigate('/');
        } catch (e) {
            setError('Error during delete');
        }
    };
    const handleStartConversation = async () => {
      if (!user?.id) {
        navigate("/login");
        return;
      }

      try {
        setIsStartingConversation(true);
        const conversation = await createConversation({
          participantIds: [user.id, item.userPublishingID],
          activeListingId: item._id,
        });
        navigate(`/messages/${conversation._id}`);
      } catch (e) {
        setError("Unable to start conversation");
      } finally {
        setIsStartingConversation(false);
      }
    };
    useEffect(() => {
      const itemFetch = async () => {
        try {
          const itemResp = await fetch(`http://localhost:5000/items/${id}`);
          if (!itemResp.ok){
            throw new Error("Failed to fetch");
          }

          const data = await itemResp.json();
          setItem(data);
          setError("");
        } catch (err){
          setError(err.message);
        }
      };

      itemFetch();
    }, [id]);

    useEffect(() => {
      const loadFavoriteState = async () => {
        if (!isSignedIn || !user?.id) {
          setFav(false);
          return;
        }

        try {
          const userResp = await fetch(`http://localhost:5000/profile/${user.id}`);
          if (!userResp.ok) {
            throw new Error("Failed to fetch");
          }

          const favData = await userResp.json();
          setFav(Boolean(favData.profile.profileFavorites?.includes(id)));
        } catch (err) {
          setFav(false);
        }
      };

      loadFavoriteState();
    }, [id, isSignedIn, user?.id]);

  if (!item) {
    if (error) {
      return <p style={{color: "red"}}>{error}</p>;
    }

    return <p>Loading</p>;
  }
  return (
    <main style={{padding: "15px"}}>
        {error ? <p style={{color: "red"}}>{error}</p> : null}
        {!isOwner && isSignedIn
        ? (
            <div style={{display: "flex", gap: "10px", marginBottom: "15px"}}>
                <button
                    onClick={toggleFavorite}
                    style={{
                        backgroundColor: favorite ? 'gold' : 'grey',
                        color: favorite ? 'black' : 'white',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                    }}
                    >
                    {favorite ? "Favorited" : "Favorite"}
                </button>
                <button
                    onClick={handleStartConversation}
                    disabled={isStartingConversation}
                    style={{
                        backgroundColor: '#1d4ed8',
                        color: 'white',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        cursor: isStartingConversation ? 'wait' : 'pointer',
                        opacity: isStartingConversation ? 0.7 : 1,
                    }}
                    >
                    {isStartingConversation ? "Opening chat..." : "Message Seller"}
                </button>
            </div>
        ) : null}
        {!isSignedIn && !isOwner ? (
          <div style={{display: "flex", gap: "10px", marginBottom: "15px"}}>
            <button
              onClick={handleStartConversation}
              style={{
                backgroundColor: '#1d4ed8',
                color: 'white',
                padding: '10px',
                border: 'none',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Log in to message seller
            </button>
          </div>
        ) : null}
        <p>Name: {item.itemName}</p>
        <p>Price: ${item.itemCost}</p>
        <p>Condition: {item.itemCondition}</p>
        <p>Location: {item.itemLocation}</p>
        {item.itemPicture && (<img src={item.itemPicture} alt={item.itemName} />)}
        <p>Description: {item.itemDescription}</p>
        <p>Details: {item.itemDetails}</p>
        <Link to={`/profile/${item.userPublishingID}`}>
            <p>Published by: {item.userPublishingName}</p>
        </Link>
        {isOwner
        ? (
            <button
                onClick={(e) => handleOnSubmit(e, item._id)}
                style={{
                    backgroundColor: 'red',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                }}
                >
                Delete Listing
            </button>
        ) : null}
    </main>
  );
}
