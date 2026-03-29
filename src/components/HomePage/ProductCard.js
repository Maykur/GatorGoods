import Iphone from "../../assets/Iphone.jpg";
import ConditionIndicator from "./ConditionIndicator";
import { useNavigate } from "react-router-dom";

function ProductCard({ data }) {
    // constant that stores the data from the prop or reverts to placeholder text
	const displayData = data || { itemCost: "399$", itemName: "iPhone 11, charger not included", itemLocation: "Gainesville, FL" };
	const navigate = useNavigate();
	return (
		<div onClick={() => navigate(`/items/${data._id}`)} class="group w-[200px] bg-gatorBlue rounded-lg hover:bg-gatorOrange/80 transition-colors">
            <hr class="border-gatorBlue mt-2 group-hover:border-gatorOrange/0 transition-colors"></hr>
            {/* Change the below line to change the image size */}
			<img src={displayData.itemPicture} class="max-h-[125px] w-full object-contain bg-gatorBlue group-hover:bg-gatorOrange/0 transition-colors" alt="" />
            <hr class="border-gatorBlue group-hover:border-gatorOrange/0 transition-colors"></hr>
			<div class="flex flex-col ml-1.5 mt-1 gap-y-1">
                {/* This line displays the price of the item */}
				<p class="text-2xl">${displayData.itemCost}</p>
                {/* This line displays the name of the item */}
				<p>Name: {displayData.itemName}</p>
                {/* This line shows what conditon the item is in */}
				<div class="flex justify-between h-[20px]">
					<p class="-mt-0.5">Condition: </p>
                    <ConditionIndicator
						key={displayData._id}
						data={displayData.itemCondition}
					/>
				</div>
                {/* This item shows the location of the item */}
				<p>Location: {displayData.itemLocation}</p>
			</div>
		</div>
	);
}

export default ProductCard;
