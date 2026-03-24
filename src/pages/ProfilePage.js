// REFERENCES: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "@clerk/react";

// Page to display user profiles
export function ProfilePage() {
  const {user} = useUser();
  const {id} = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [reviewScore, setScore] = useState("");
  const handleOnSubmit = async (e) => {
    e.preventDefault();
    if (!reviewScore.trim()) {
      setError('Review Score Required');
      return;
    }
    setError('');
    try {
      const result = await fetch(`http://localhost:5000/update_score/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          reviewScore: Number(reviewScore)
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!result.ok) {
        setError('Unable to submit score review. Check the form and try again.');
        return;
      }
      const data = await result.json();
      setInfo({
        profile: data,
        listings: info.listings || []
      });
      alert('Review Submitted');
      setScore('');
    } catch (err) {
      setError('Unable to reach the server. Check your connection and retry.');
    }
  };
  useEffect(() => {
    const itemFetch = async () => {
      try {
        const res = await fetch(`http://localhost:5000/profile/${id}`);
        if (!res.ok){
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setInfo(data);
        setError("");
      } catch (err){
        setError(err.message);
      }
    };
    itemFetch();
  }, [id]);
  return (
    <main>
      <h1>User Profile</h1>
      {info
      ? (
        <div>
          <p>{info.profile.profileName}</p>
          <img src={info.profile.profilePicture}/>
          <p>Rating: {info.profile.profileRating?.toFixed(1)}/5 {'  '}
            <span style={{fontSize: '10px'}}>
              ({info.profile.profileTotalRating} Rating(s))
            </span>
          </p>
          <p>Listings:</p>
          {info.listings.length > 0 
          ? (info.listings.map((item) => (
            <Link key={item._id} to={`/items/${item._id}`}>
              <p>*{item.itemName}</p>
            </Link>))) 
          : (<p>Nothing to see here</p>)}
          {user.id != info.profile.profileID 
          ? <form onSubmit={handleOnSubmit} style={{ display: 'flex', flexDirection: 'Column', gap: '10px', maxWidth: '400px' }}>
              <div>
                <label>Review Rating: </label>
                <select
                  value={reviewScore}
                  onChange={(e) => setScore(e.target.value)}
                  style={{ color: 'black', backgroundColor: 'white' }}
                >
                  <option value="">Select Review Score</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'grey',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                  }}>
                  Submit Review Score
                </button>
              </div>
            </form>
          : <></>}
        </div>)
      : (!error && <p>Loading profile</p>)}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  );
}