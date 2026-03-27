// REFERENCES: https://stackoverflow.com/questions/70203488/how-can-i-fetch-data-from-mongodb-and-display-it-on-react-front-end

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import Profile from "../assets/profile.jpg";
import VerifiedBadge from "../assets/verified-badge.png";
import Star from "../assets/Star.png";
import ItemCard from "../components/ProfilePage/ItemCard";
import FavCard from "../components/ProfilePage/FavCard";

// Page to display user profiles
export function ProfilePage() {
	const { user } = useUser();
	const { id } = useParams();
	const [info, setInfo] = useState(null);
	const [error, setError] = useState("");
	const [reviewScore, setScore] = useState("");
	const handleOnSubmit = async (e) => {
		e.preventDefault();
		if (!reviewScore.trim()) {
			setError("Review Score Required");
			return;
		}
		setError("");
		try {
			const result = await fetch(`http://localhost:5000/update_score/${id}`, {
				method: "POST",
				body: JSON.stringify({
					reviewScore: Number(reviewScore),
				}),
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!result.ok) {
				setError(
					"Unable to submit score review. Check the form and try again.",
				);
				return;
			}
			const data = await result.json();
			setInfo({
				profile: data,
				listings: info.listings || [],
			});
			alert("Review Submitted");
			setScore("");
		} catch (err) {
			setError("Unable to reach the server. Check your connection and retry.");
		}
	};
	useEffect(() => {
		const itemFetch = async () => {
			try {
				const res = await fetch(`http://localhost:5000/profile/${id}`);
				if (!res.ok) {
					throw new Error("Failed to fetch");
				}
				const data = await res.json();
				setInfo(data);
				setError("");
			} catch (err) {
				setError(err.message);
			}
		};
		itemFetch();
	}, [id]);

	const [orderState, setOrderState] = useState("active");

	return (
		<main>
			{/* {console.log(id)} */}
			{/* Profile picture and name with verified badge and rating */}
			{info
			? (
			<div>
				<div>
					<img src={info.profile.profilePicture}/>
					<span class="flex mt-2">
						<h1 class="text-3xl font-bold mt-0.5">{info.profile.profileName}</h1>
						<img
							src={VerifiedBadge}
							alt="Verified badge"
							class="mt-0.5 ml-1 w-10 h-10"
						/>
						<h1 class="text-3xl font-bold mt-0.5 ml-1">{info.profile.profileRating?.toFixed(1)}/5</h1>
						<img src={Star} alt="Star" class="mt-[6px] ml-1 w-7 h-7" />
					</span>

					{/* Listing Stats */}
					<div class="flex gap-x-4">
						<p>{info.listings.length} active listing(s) </p>
						{user.id === info.profile.profileID
						? <p>{info.profile.profileFavorites.length} listing(s) favorited</p>
						: []}
					</div>
				</div>

				{/* A scren that shows active and favorite orders made by the user */}
				<div class="flex flex-col mt-4 rounded-3xl bg-gatorBlue">
					<div class="flex flex-row justify-between">
						<div class="flex flex-row">
							<div
								class={`cursor-pointer ${orderState === "active" ? "bg-gatorOrange rounded-tl-2xl" : "hover:bg-gatorOrange/80 transition-colors rounded-tl-2xl"}`}
								onClick={() => setOrderState("active")}
							>
								<p class="text-white text-2xl m-5 ml-5">Personal Orders</p>
							</div>
							<div
								class={`cursor-pointer ${orderState === "past" ? "bg-gatorOrange" : "hover:bg-gatorOrange/80 transition-colors"}`}
								onClick={() => setOrderState("past")}
							>
								{user.id === info.profile.profileID
								? <p class="text-white text-2xl m-5 ml-5 pl-5 pr-5">Favorited Orders</p>
								: []}
							</div>
						</div>
					</div>
					<div class="flex-1 overflow-y-auto bg-gatorShade rounded-b-3xl">
    					{orderState === "active" ? <ItemCard /> : <FavCard />}
				  	</div>
				</div>
				{user.id != info.profile.profileID 
          		? <form onSubmit={handleOnSubmit} style={{ padding: '15px', display: 'flex', flexDirection: 'Column', gap: '10px', maxWidth: '400px' }}>
				<div>
					<label class={'mb-2'}>Review Rating: </label>
					<select
						value={reviewScore}
						onChange={(e) => setScore(e.target.value)}
						class={'bg-gatorShade rounded-xl py-1 px-2 focus:ring-2 focus:ring-gatorOrange'}>
						<option value="">Select Review Score</option>
						<option value="0">0</option>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
						<option value="4">4</option>
						<option value="5">5</option>
					</select>
				</div>
					<button
						type="submit"
						class={'bg-gatorBlue hover:bg-gatorOrange/80 rounded-2xl transition-colors py-1.5 px-3'}>
						Submit Review Score
					</button>
				</form>
          		: <></>}
			</div>)
			: (!error && <p>Loading profile</p>)}
      		{error && <p style={{ color: 'red' }}>{error}</p>}
		</main>
	);
}
