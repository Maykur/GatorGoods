import Iphone from "../../assets/Iphone.jpg";
import ConditionIndicator from "./ConditionIndicator";

function ProductCard({ data }) {
    // constant that stores the data from the prop or reverts to placeholder text
	const displayData = data || { price: "399$", title: "iPhone 11, charger not included", location: "Gainesville, FL" };
	
	return (
		<div class="w-[200px] bg-gray-700 rounded-lg">
            <hr class="border-white mt-2"></hr>
            {/* Change the below line to change the image size */}
			<img src={Iphone} class="max-h-[125px] w-full object-contain bg-white" alt="" />
            <hr class="border-white"></hr>
			<div class="flex flex-col ml-1.5 mt-1 gap-y-1">
                {/* This line displays the price of the item */}
				<p class="text-2xl">{displayData.price}</p>
                {/* This line displays the name of the item */}
				<p>{displayData.title}</p>
                {/* This line shows what conditon the item is in */}
				<div class="flex justify-between h-[20px]">
					<p class="-mt-0.5">Condition: </p>
                    <ConditionIndicator/>
				</div>
                {/* This item shows the location of the item */}
				<p>{displayData.location}</p>
			</div>
		</div>
	);
}

export default ProductCard;
