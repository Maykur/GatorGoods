// REFERENCES: https://daily.dev/blog/js-create-array-of-objects-simplified
// REFERENCES: https://medium.com/@finnkumar6/array-grouping-in-javascript-a-quick-and-efficient-guide-771a974fa4d4

import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import ProductCard from "../components/HomePage/ProductCard.js";
import { useState, useEffect } from "react";

export function HomePage() {
	const { isLoaded, isSignedIn, user } = useUser();
	const [animationState, setAnimationState] = useState("");
	const [items, setItems] = useState([]);
	const [currentDataIndex, setCurrentDataIndex] = useState({});
	const [activeTimeout, setActiveTimeout] = useState(null);
	const [error, setError] = useState("");
	const itemsPerPage = 5;
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
				const indexInit = data.reduce((group, item) => {
					group[item.itemCat] = 0;
					return group;
				}, {});
				setCurrentDataIndex(indexInit);
			} catch (err){
				setError(err);
			}
		};
    	itemFetch();
  	}, []);
	const categories = items.reduce((group, item) => {
		if (!group[item.itemCat]) {
			group[item.itemCat] = [];
		}
		group[item.itemCat].push(item);
		return group;
	}, {});
  //Object class that maps the names of different animation variables with tailwind names
  //This is used to dynamically set the animation on the card div element
	const animationClasses = {
		"slide-out-left": "animate-slide-out-left",
		"slide-out-right": "animate-slide-out-right",
		"slide-in-from-right": "animate-slide-in-from-right",
		"slide-in-from-left": "animate-slide-in-from-left",
	};

  //These comments are for both startLeftAnimation and startRightAnimation
  // The functionality of these functions is as follows:
  //      1) Slide out the existing cards in the direction of the arrow button clicked
  //      2) Change the data of the slide cards off-screen
  //      3) Slide in the new cards from the other side of the screen
  /*
	const startLeftAnimation = () => {
		// Clear any existing timeout
		if (activeTimeout) clearTimeout(activeTimeout);
		
		// Start slide-out animation
		setAnimationState("slide-out-left");
		
		// Schedule data change and slide-in
    // Outer Timer scheduled to run after the slide-out-left animation ends
    //    it sets the animation state to slide-in-from right and changes the card data

    // Inner Timer scheduled to run after slide-in-from-right animation finishes
    // It cleans the timer and setAnimationState for the next use
		const timer = setTimeout(() => {
			setCurrentDataIndex((prev) => (prev - 1 + totalPages) % totalPages);
			setAnimationState("slide-in-from-right");
			
			// Schedule reset after slide-in completes
			const resetTimer = setTimeout(() => {
				setAnimationState("");
				setActiveTimeout(null);
			}, 800);
			
			setActiveTimeout(resetTimer);
		}, 800);
		
		setActiveTimeout(timer);
	};

	const startRightAnimation = () => {
		// Clear any existing timeout
		if (activeTimeout) clearTimeout(activeTimeout);
		
		// Start slide-out animation
		setAnimationState("slide-out-right");
		
    // Schedule data change and slide-in
    // Outer Timer scheduled to run after the slide-out-right animation ends
    //    it sets the animation state to slide-in-from-left and changes the card data

    // Inner Timer scheduled to run after slide-in-from-left animation finishes
    // It cleans the timer and setAnimationState for the next use
		const timer = setTimeout(() => {
			setCurrentDataIndex((prev) => (prev + 1) % totalPages);
			setAnimationState("slide-in-from-left");
			
			// Schedule reset after slide-in completes
			const resetTimer = setTimeout(() => {
				setAnimationState("");
				setActiveTimeout(null);
			}, 800);
			
			setActiveTimeout(resetTimer);
		}, 800);
		
		setActiveTimeout(timer);
	};
	*/
	if (error){
		return <p style={{color: "red"}}>{error}</p>;
	}
  	//If the user is signedIn then display the products else display the place holder homescreen
	if (isSignedIn){
		return (
			<div>
				{Object.entries(categories).map(([group, catItem]) => {
					const totalPages = Math.ceil(catItem.length / itemsPerPage);
					const index = currentDataIndex[group] || 0;
					const currItems = catItem.slice(index * itemsPerPage, (index + 1) * itemsPerPage);
				return(
      				//Outer div for the product screen
					<div key={group}>
						{/* Category 1 */}
						<h2 class="mb-2">{group}</h2>
						{/* Outer Div that styles the borders and backgrounds of the card elements */}
						<div class="flex relative bg-gatorShade rounded-lg mb-2 flex-nonwrap">
							{/* Left arrow button */}
							<p
								class="bg-gatorBlue h-12 w-12 pt-1 rounded-full text-center text-3xl absolute mt-[140px] -ml-[50px] cursor-pointer hover:bg-gatorOrange/80 transition-colors"
								onClick={() => setCurrentDataIndex((prev) => ({
									...prev, [group]: (index - 1 + totalPages) % totalPages,
								}))}
							>
							&lt;
							</p>
          					{/* Inner Div that contains the cards */}
							<div
								class={`flex w-full h-[300px] p-3 justify-start gap-5 overflow-hidden ${
									animationClasses[animationState] || ""
								}`}
							>
							{currItems.map((item) => (
								<ProductCard
									key={item._id}
									data={item}
								/>
							))}
						</div>
          				{/* Right arrow button */}
						<p
							class="bg-gatorBlue h-12 w-12 pt-1 rounded-full text-center text-3xl absolute right-0 mt-[140px] -mr-[50px] cursor-pointer hover:bg-gatorOrange/80 transition-colors"
							onClick={() => setCurrentDataIndex((prev) => ({
								...prev, [group]: (index + 1) % totalPages,
							}))}
						>
							&gt;
						</p>
					</div>
					{/* Dots to show page #s */}
					<div class="flex justify-center mt-2 gap-2">
							{Array.from({length: totalPages}).map((x, index) => 
								<div
									key={index}
									onClick={() => setCurrentDataIndex((prev) => ({
										...prev, [group]:index,
									}))}
									class={`h-2 w-2 rounded-full cursor-pointer hover:bg-gatorOrange/80 transition-all
									${index === currentDataIndex[group] ? "bg-gatorOrange scale-125" : "bg-gatorBlue"}`}
								/>
							)}
					</div>
				</div>);
			})}
			</div>
		);
	}
	else {
    // Code to return the placeholder Home screen if not logged in
		return (
			<section className="space-y-8">
				<div className="rounded-3xl border border-slate-800 bg-slate-950/60 px-6 py-10 shadow-lg shadow-black/20 sm:px-8">
					<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
						A UF Marketplace
					</p>
					<h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
						Buy, sell, and trade around campus without the usual chaos.
					</h1>
					<p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
						Browse the latest listings, make structured offers, and keep
						transactions centered around the UF community.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Show when="signed-out">
							<SignUpButton mode="modal">
								<button
									type="button"
									className="rounded-full bg-gatorOrange px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
								>
									Create account
								</button>
							</SignUpButton>
							<SignInButton mode="modal">
								<button
									type="button"
									className="rounded-full border border-white/20 px-5 py-3 font-semibold text-slate-100 transition-colors hover:border-gatorOrange hover:text-gatorOrange"
								>
									Log in
								</button>
							</SignInButton>
						</Show>
						<Show when="signed-in">
							<Link
								to="/create"
								className="rounded-full bg-gatorOrange px-5 py-3 font-semibold text-white no-underline transition-colors hover:bg-orange-500"
							>
								Post a listing
							</Link>
						</Show>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
						<h2 className="text-lg font-semibold text-white">
							Trusted Network
						</h2>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							Built around a campus community where meetup coordination and
							trust matter.
						</p>
					</article>
					<article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
						<h2 className="text-lg font-semibold text-white">
							Offer-First Flow
						</h2>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							A cleaner negotiation path for buyers and sellers than general-use
							classified services.
						</p>
					</article>
					<article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
						<h2 className="text-lg font-semibold text-white">
							Upcoming Features
						</h2>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							Listing feed, search, messaging, and profile trust signals will
							live here.
						</p>
					</article>
				</div>
			</section>
		);
	}
}
