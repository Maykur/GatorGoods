import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import ProductCard from "../components/HomePage/ProductCard.js"

export function HomePage() {
	const { isLoaded, isSignedIn, user } = useUser();

	if (isLoaded) return (
    <div>
      <h2 class="mb-2">Electronics</h2>
      <div class="flex bg-black w-full mb-4 h-[300px] p-3 justify-between rounded-lg">
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
      </div>

      <h2 class="mb-2">Video Games</h2>
      <div class="flex bg-black w-full h-[300px] p-3 justify-between rounded-lg">
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
        <ProductCard/>
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
