// REFERENCES: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import Profile from '../assets/profile.jpg';
import VerifiedBadge from '../assets/verified-badge.png';
import Star from '../assets/Star.png';

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


  const [orderState, setOrderState] = useState("past");

  return (
    <main>
      {/* Profile picture and name with verified badge and rating */}
      <img src={Profile} alt="An anime character with a shocked face" class="rounded-full w-32 h-32"/>
      <span class="flex mt-2">
      <h1 class="text-3xl font-bold mt-0.5">Shashank Gutta</h1>
      <img src={VerifiedBadge} alt="Verified badge" class="mt-0.5 ml-1 w-10 h-10"/>
      <h1 class="text-3xl font-bold mt-0.5 ml-1">4.9</h1>
      <img src={Star} alt="Star" class="mt-[6px] ml-1 w-7 h-7"/>
      </span>

      {/* Listing Stats */}
      <div class="flex">
      <p>5 active listings</p>
      <p class="ml-9">30 total listings</p>
      </div>
      
      
      <div class="h-screen max-h-[500px] bg-[#0033A0]/60 mt-4 rounded-3xl">
      <div class="flex flex-row justify-between">
        <span class='flex flex-row'>
          {/* {orderState === "active" ? "bg-gray-500" : "bg-[#0033A0]/60"} */}
        <div class={`cursor-pointer ${orderState === "active" ? "bg-gray-500  rounded-tl-2xl" : ""}`} onClick={() => setOrderState("active")}>
          <div class="text-white text-2xl m-5 ml-5">Active Orders</div>
        </div>
        <div class={`cursor-pointer ${orderState === "past" ? "bg-gray-500" : ""}`} onClick={() => setOrderState("past")}>
          <div class="text-white text-2xl m-5 ml-5 pl-5 pr-5">Past Orders</div>
        </div>
        </span>
        <span class="flex flex-row">
           <div onClick={() => {console.log("Buyer clicked")}} class="p-5 hover:bg-gatorOrange mr-3 cursor-pointer">
            <div class="text-white text-2xl">Buyer</div>
          </div>
          <div onClick={() => {console.log("Seller clicked")}} class="p-5 hover:bg-gatorOrange rounded-tr-2xl -ml-3 cursor-pointer">
            <div class="text-white text-2xl">Seller</div>
          </div>
        </span>

      </div>
      {orderState === "active"||"past" ? 
        (<div class="bg-gray-500 h-full rounded-b-3xl">

        </div>) 
        : (<p>Loading orders...</p>)}
      </div>



      {/* {info ? (
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
      {error && <p style={{ color: 'red' }}>{error}</p>} */}
    </main>
  );
}