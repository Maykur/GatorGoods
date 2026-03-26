import Iphone from "../../assets/Iphone.jpg";
import ConditionIndicator from "./ConditionIndicator";

function ProductCard() {
	return (
		<div class="w-[200px] bg-gray-700 rounded-lg">
            <hr class="border-white mt-2"></hr>
			<img src={Iphone} class="max-h-[125px] w-full object-contain bg-white" alt="" />
            <hr class="border-white"></hr>
			<div class="flex flex-col ml-1.5 mt-1 gap-y-1">
				<p class="text-2xl">399$</p>
				<p>Iphone 11, charger not included</p>
				<div class="flex justify-between h-[20px]">
					<p class="-mt-0.5">Condition: </p>
                    <ConditionIndicator/>
				</div>
				<p>Gainesville, FL</p>
			</div>
		</div>
	);
}

export default ProductCard;
