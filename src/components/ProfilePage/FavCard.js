//import Iphone from "../../assets/Iphone.jpg"
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

function FavCard(){
	const { id } = useParams();
	const [info, setInfo] = useState(null);
	const navigate = useNavigate();
	const [error, setError] = useState("");
	const handleNav = async (e, inf) => {
		e.preventDefault();
		navigate(`/items/${inf}`);
	}
	const itemFetch = async () => {
		try {
			const res = await fetch(`http://localhost:5000/profile/${id}`);
			if (!res.ok) {
				throw new Error("Failed to fetch");
			}
			const data = await res.json();
			const favItems = await Promise.all(
				data.profile.profileFavorites.map(async (itemID) => {
					const itemResp = await fetch(`http://localhost:5000/items/${itemID}`);
					if (!itemResp.ok) {
						throw new Error("Failed to fetch.");
					}
					const itemData = await itemResp.json();
					const profileID = itemData.userPublishingID;
					return {...itemData, profileID};
				})
			)
			setInfo({...data, favItems});
			setError("");
		} catch (err) {
			setError(err.message);
		}
	};
	const handleOnSubmit = async (e, user, inf) => {
        e.preventDefault();
        const verif = window.confirm("This action will remove this item from favorites. Are you sure?");
        if (!verif) {
            return;
        }
        try {
			const res = await fetch(`http://localhost:5000/user/${user}/fav/${inf}`, {
				method: 'DELETE',
			});
			if (!res.ok){
			throw new Error("Couldn't fav");
			}
            alert('Item Unfavorited');
			itemFetch();
        } catch (e) {
            setError('Error during delete');
        }
    };
	useEffect(() => {
			itemFetch();
		}, [id]);
    return(
		<div class="flex flex-col gap-y-1">
			{info
			? (
				info.favItems.length > 0 
				? (info.favItems.map((item) => (
				<div key={item._id} class="flex flex-row justify-between bg-black/40 h-[187px] rounded-xl">
					<div class="flex flex-row items-center">
									<img
										src={item.itemPicture}
										class="w-[180px] p-5 h-full object-contain"
									></img>
									<p class="text-2xl ml-10 mt-1.5">
										{item.itemName}
									</p>
					</div>
					<div class="flex flex-col gap-y-3 mr-2">
									<a href="" class="bg-gatorBlue rounded-full text-center p-1 mt-8 hover:bg-gatorOrange/80 transition-colors" 
										onClick={(e) => handleOnSubmit(e, id, item._id)}>
										Unfavorite
									</a>
									<a href={`/profile/${item.profileID}`} class="bg-gatorBlue rounded-full text-center p-1 hover:bg-gatorOrange/80 transition-colors">
										View Seller Profile
									</a>
									<a	
										href=""
										class="bg-gatorBlue rounded-full text-center p-1 mb-2 hover:bg-gatorOrange/80 transition-colors"
										onClick={(e) => handleNav(e, item._id)}
									>
										View Details
									</a>
					</div>
				</div>
				)))
				: (<p>Nothing to see here</p>))
			: <p>loading...</p>}
		</div>
    )
}

export default FavCard;