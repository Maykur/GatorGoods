//import Iphone from "../../assets/Iphone.jpg"
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/react";

function ItemCard(){
	const { user } = useUser();
	const { id } = useParams();
	const [info, setInfo] = useState(null);
	const navigate = useNavigate();
	const [error, setError] = useState("");
	const isOwner = Boolean(user?.id && user.id === id);
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
			setInfo(data);
			setError("");
		} catch (err) {
			setError(err.message);
		}
	};
	const handleOnSubmit = async (e, inf) => {
        e.preventDefault();
        const verif = window.confirm("This action will delete this item. Are you sure?");
        if (!verif) {
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/item/${inf}`, {
                method: 'DELETE',
            });
			if (!res.ok) {
				throw new Error("Failed to delete");
			}
            alert('Item Deleted');
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
				info.listings.length > 0 
				? (info.listings.map((item) => (
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
					{isOwner
					? ( <div class="flex flex-col gap-y-3 mr-2">
							<a href="" 
								class="bg-gatorBlue rounded-full text-center p-1 mt-12 hover:bg-gatorOrange/80 transition-colors"
								onClick={(e) => handleOnSubmit(e, item._id)}>
								Delete Listing
							</a>
							<a href=""
								class="bg-gatorBlue rounded-full text-center p-1 mb-2 hover:bg-gatorOrange/80 transition-colors"
								onClick={(e) => handleNav(e, item._id)}>
								View Details
							</a>
						</div>)
					: (	<div class="flex flex-col items-center gap-y-2 mr-2">
							<a href=""
								class="bg-gatorBlue rounded-full text-center p-1 mt-16 hover:bg-gatorOrange/80 transition-colors"
								onClick={(e) => handleNav(e, item._id)}>
								View Details
							</a>
						</div>)
					}
				</div>
				)))
				: (<p>Nothing to see here</p>))
			: <p>loading...</p>}
		</div>
    )
}

export default ItemCard;
