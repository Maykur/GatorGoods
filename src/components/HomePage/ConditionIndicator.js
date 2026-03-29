function ConditionIndicator({data}){
    return(
        <div class="flex bg-gatorShade rounded-full pl-2 pr-2 mr-9 h-full">
            {data === "Perfect" && (
            <>
                {/* Change the color here to change the color of the circle */}
                <div class="mt-1 w-3 h-3 rounded-full bg-green-500"/>
                {/* Paragraph to change the text of the condition */}
                <p class="text-green ml-1 text-sm">{data}</p>
            </> 
            )}
            {data === "Good" && (
            <>
                {/* Change the color here to change the color of the circle */}
                <div class="mt-1 w-3 h-3 rounded-full bg-yellow-500"/>
                {/* Paragraph to change the text of the condition */}
                <p class="text-yellow ml-1 text-sm">{data}</p>
            </>
            )}
            {data === "Fair" && (
            <>
                {/* Change the color here to change the color of the circle */}
                <div class="mt-1 w-3 h-3 rounded-full bg-orange-500"/>
                {/* Paragraph to change the text of the condition */}
                <p class="text-orange ml-1 text-sm">{data}</p>
            </>
            )}
            {data === "Poor" && (
            <>
                {/* Change the color here to change the color of the circle */}
                <div class="mt-1 w-3 h-3 rounded-full bg-red-500"/>
                {/* Paragraph to change the text of the condition */}
                <p class="text-red ml-1 text-sm">{data}</p>
            </>
            )}
        </div>
    )

}

export default ConditionIndicator;