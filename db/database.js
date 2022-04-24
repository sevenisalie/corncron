const mongoose = require("mongoose")
const axios = require("axios")
mongoose.connect(`mongodb://localhost:27017/test`)



const tickSchema = new mongoose.Schema({
    ts: {type: Number, required: true, unique: true},
    price: { type: Number, required: true },
    oracleid: { type: Number, required: true}
})

const symbolSchema = new mongoose.Schema({
    symbol: {type: String, uppercase: true, unique: true, dropDups: true},
    ticks: [tickSchema]



})

//model
const Symbol = mongoose.model("Symbol", symbolSchema)



const createSymbol = async (symbol) => {

    try {
        const Symbol = mongoose.model("Symbol", symbolSchema)


        const newsym = new Symbol(
            {
                symbol: "ETH",
                ticks: []
            }
        )
    
        await newsym.save()
        console.log(`new symbol: ${symbol} saved`)
    } catch (err) {console.log(err)}


}
const getToday = async () => {
    let today = new Date()
    today = today.toLocaleDateString()
    return today
}

const getTimeStamp = async (timestamp) => {
    let now = new Date(timestamp)
    now = now.getTime()/1000
    return now
}

const getParsedOracleId = async (oracleId) => {
    let newId = parseInt(oracleId)
    return newId
}

const getParsedPrice = async (price) => {
    let newPrice = parseFloat(price)
    return newPrice
}


const deleteSym = async (sym) => {
         
    try {
        await Symbol.deleteMany({ symbol: sym })
        console.log("successfully deleted")
        } catch (err) {console.log(err)}
}

const getAllSyms = async () => {
    const Symbol = mongoose.model("Symbol", symbolSchema)

    const syms = await Symbol.find()
    return syms
}

const getAllTicks = async (sym) => {
    const justSym = await Symbol.findOne({ symbol: sym})
    const ticks = justSym.ticks
    return ticks
}

const reset = async () => {
    await deleteSym("ETH")
}


//getting data

const pollOracle = async (sym) => {
    try {
        const response = await axios.get(`https://cornoracleapi.herokuapp.com/${sym}`)
        const data = response.data
        return data
    } catch (err) {console.log(err)}
}

const cleanTick = async (oracleResponse) => {
    try {
        const _time = await getTimeStamp(oracleResponse["time"])
        const _price = await getParsedPrice(oracleResponse["price"])
        const _id = await getParsedOracleId(oracleResponse["ID"])
        return {
            ts: _time,
            price: _price,
            oracleid: _id,
        }
    } catch (err) {console.log(err)}
}

const createTick = async (cleanedTick) => {
    try {
        const token = await Symbol.findOne({ symbol: "ETH" })
        const push = await token.ticks.push( cleanedTick )
        console.log("Tick Pushed")
        await token.save()
    } catch (err) {console.log(err)}
}

const loopTick = async () => {
    try {
        const polledPrice = await pollOracle("ETH")
        const cleaned = await cleanTick(polledPrice)
        const pushTick = await createTick(cleaned)
        console.log("added tick")
        const allticks = await getAllTicks("ETH")
        console.log(allticks)
    } catch (err) {console.log(err)}
}

const main = async () => {

    // await reset()
    // const makeSymbol = await createSymbol("ETH")
    // console.log("all good baabby")
    // const sym = await getAllSyms()
    // const symbol = await Symbol.find({ symbol: `ETH` })


    // console.log(symbol) //hpefully only ever will be 1  document per ticker, but is scalable


    const justEth = await Symbol.findOne({ symbol: "ETH" })

    console.log("$$$$$$$$$$$$")
    console.log(justEth)

    const loopback = setInterval(await loopTick, 10000)
    const symmie = await getAllSyms()
    console.log(symmie)

    const allticks = await getAllTicks("ETH")
    console.log(allticks)
}


main()
