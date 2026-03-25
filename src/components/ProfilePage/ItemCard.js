import Iphone from "../../assets/Iphone.jpg"

function ItemCard(){
    return(
        <div class="flex flex-row justify-between bg-black/40 h-[187px]">
							<div class="flex flex-row">
								<img
									src={Iphone}
									class="w-[180px] p-5 h-full object-contain"
								></img>

								<p class="text-2xl ml-10 mt-1.5">
									Iphone 11, charger not included
								</p>
							</div>
							<div class="flex flex-col gap-y-3 mr-3">
								<a
									href=""
									class="bg-gatorOrange rounded-full text-center p-1 mt-3"
								>
									Contact Seller
								</a>
								<a href="" class="bg-gatorOrange rounded-full text-center p-1">
									Cancel Order
								</a>
								<a href="" class="bg-gatorOrange rounded-full text-center p-1">
									Write a Review
								</a>
								<a
									href=""
									class="bg-gatorOrange rounded-full text-center p-1 mb-3"
								>
									Change Details
								</a>
							</div>
						</div>
    )
}

export default ItemCard;