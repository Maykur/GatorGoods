function ConditionIndicator(){
    return(
        <div class="flex bg-white rounded-m pl-1 pr-1 mr-9 h-full">
            {/* Change the color here to change the color of the circle */}
            <div class="mt-1 w-3 h-3 rounded-full bg-green-500"/>
            {/* Paragraph to change the text of the condition */}
            <p class="text-black ml-1 text-sm">Perfect</p>
        </div>
    )

}

export default ConditionIndicator;