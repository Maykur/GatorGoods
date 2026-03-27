import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import ProductCard from "../components/HomePage/ProductCard.js";
import { useState, useEffect } from "react";

// Sample card data sets
const cardDataSets = [
	[
		{ id: 1, price: "399$", title: "iPhone 11", location: "Gainesville, FL" },
		{ id: 2, price: "299$", title: "MacBook Air", location: "Orlando, FL" },
		{ id: 3, price: "199$", title: "iPad Pro", location: "Tampa, FL" },
		{ id: 4, price: "149$", title: "AirPods Pro", location: "Miami, FL" },
		{ id: 5, price: "599$", title: "iPhone 13", location: "Jacksonville, FL" },
	],
	[
		{
			id: 6,
			price: "249$",
			title: "Sony Headphones",
			location: "Gainesville, FL",
		},
		{ id: 7, price: "189$", title: "Nintendo Switch", location: "Orlando, FL" },
		{ id: 8, price: "329$", title: "Dell Laptop", location: "Tampa, FL" },
		{ id: 9, price: "79$", title: "Bluetooth Speaker", location: "Miami, FL" },
		{ id: 10, price: "449$", title: "iPad Air", location: "Jacksonville, FL" },
	],
	[
		{
			id: 11,
			price: "129$",
			title: "Wireless Mouse",
			location: "Gainesville, FL",
		},
		{ id: 12, price: "89$", title: "Phone Case", location: "Orlando, FL" },
		{ id: 13, price: "299$", title: "Gaming Monitor", location: "Tampa, FL" },
		{ id: 14, price: "59$", title: "USB Cable", location: "Miami, FL" },
		{
			id: 15,
			price: "699$",
			title: "MacBook Pro",
			location: "Jacksonville, FL",
		},
	],
];

export function HomePage() {
	const { isLoaded, isSignedIn, user } = useUser();
	const [animationState, setAnimationState] = useState("");
	const [currentDataIndex, setCurrentDataIndex] = useState(0);

	const animationClasses = {
		"slide-out-left": "animate-slide-out-left",
		"slide-out-right": "animate-slide-out-right",
		"slide-in-from-right": "animate-slide-in-from-right",
		"slide-in-from-left": "animate-slide-in-from-left",
	};

	const leftHandler = () => {
		setAnimationState("slide-out-left");
	};

	const rightHandler = () => {
		setAnimationState("slide-out-right");
	};

	useEffect(() => {
		if (animationState === "slide-out-left") {
			// After slide-out animation completes, switch to slide-in with new data
			const timer = setTimeout(() => {
				setCurrentDataIndex((prev) => (prev + 1) % cardDataSets.length);
				setAnimationState("slide-in-from-right");
			}, 800); // Match slide-out duration

			return () => clearTimeout(timer);
		} else if (animationState === "slide-out-right") {
			// After slide-out animation completes, switch to slide-in with previous data
			const timer = setTimeout(() => {
				setCurrentDataIndex(
					(prev) => (prev - 1 + cardDataSets.length) % cardDataSets.length,
				);
				setAnimationState("slide-in-from-left");
			}, 800); // Match slide-out duration

			return () => clearTimeout(timer);
		} else if (
			animationState === "slide-in-from-right" ||
			animationState === "slide-in-from-left"
		) {
			// After slide-in animation completes, reset state
			const timer = setTimeout(() => {
				setAnimationState("");
			}, 800); // Match slide-in duration

			return () => clearTimeout(timer);
		}
	}, [animationState]);

	if (isSignedIn)
		return (
			<div>
				<h2 class="mb-2">Electronics</h2>
				<div class="flex relative bg-black rounded-lg mb-2 flex-nonwrap">
					<p
						class="bg-slate-700 h-12 w-12 pt-1 rounded-full text-center text-3xl absolute mt-[140px] -ml-[50px] cursor-pointer hover:bg-slate-600 transition-colors"
						onClick={leftHandler}
					>
						&lt;
					</p>
					<div
						class={`flex w-full h-[300px] p-3 justify-between rounded-lg overflow-hidden ${
							animationClasses[animationState] || ""
						}`}
					>
						{cardDataSets[currentDataIndex].map((cardData, index) => (
							<ProductCard
								key={`${currentDataIndex}-${index}`}
								data={cardData}
							/>
						))}
					</div>
					<p
						class="bg-slate-700 h-12 w-12 pt-1 rounded-full text-center text-3xl absolute right-0 mt-[140px] -mr-[50px] cursor-pointer hover:bg-slate-600 transition-colors"
						onClick={rightHandler}
					>
						&gt;
					</p>
				</div>

				<h2 class="mb-2">Video Games</h2>
				<div class="flex bg-black w-full h-[300px] p-3 justify-between rounded-lg">
					<ProductCard />
					<ProductCard />
					<ProductCard />
					<ProductCard />
					<ProductCard />
				</div>
			</div>
		);
	else
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
