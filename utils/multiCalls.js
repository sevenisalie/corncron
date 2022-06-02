const {ethers} = require("ethers")
const {Provider, Contract}= require("ethers-multicall")

const {addresses} = require("./addresses")
const {pools} = require("./pools")
const {ERC20Abi} = require("./abi")
const MASTERCHEF = require("./build/contracts/MasterChefV2.json")
require('dotenv').config()

const PROVIDER = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);



// 

const resolveCalls = async (calls) => {
    const callProvider = new Provider(PROVIDER, 137)
    const returnData = await callProvider.all(calls)
    console.log("resolved multicalls")
    console.log(returnData)
    return returnData
}




module.exports = {
    resolveCalls
}