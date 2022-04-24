const {addresses} = require("../utils/addresses.js")
const {pools} = require("../utils/pools")
const {ethers} = require("ethers")


const BigNumber = require("bignumber.js");
const { ERC20Abi, UniPairAbi, quickSwapFactoryAbi } = require("../utils/abi.js")
const masterchef = require("../artifacts/contracts/MasterChefV2.sol/MasterChefV2.json")
const MasterchefAbi = masterchef.abi

require('dotenv').config()
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$ BASE $$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

const fetchSigner = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    
    const signer = wallet.connect(provider);
    console.log(`connected to ${signer.address}`);
    
    return signer;
};



const fetchContract = async (address, abi) => {
    const contract = new ethers.Contract(address, abi, provider);
    // console.log(`loaded contract ${contract.address}`);
    return contract;
};

// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$ HELPERS $$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

const fetchBestLP = async (_token) => {
    try {
        const data = await fetchTokenLiquidityInfo(_token)
        console.log("DARATA")
        console.log(data)
        const nativeTokenLiquidity = data.map( (pool) => {
        const token0 = pool.token0
        const token1 = pool.token1
        if (token1.address.toLowerCase() == _token.toLowerCase()) {
            return token1.reserves
        }
        if (token0.address.toLowerCase() == _token.toLowerCase()) {
            return token0.reserves
        }
    
    })

    const nums = nativeTokenLiquidity.map( (item) => {
        const data = parseFloat(item)
        return data
    })
    const max = Math.max.apply(null, nums)

    const maxLP = data.filter( (pool) => {
        return parseFloat(pool.token0.reserves) == max || parseFloat(pool.token1.reserves) == max
    })

    
    return maxLP[0]
    } catch (err) {
        console.log(err)
        return 1
    }
    
}

const fetchTokenLiquidityInfo = async (_token) => {

    const WHITELIST = [
        addresses.tokens.MATIC, // MATIC
        addresses.tokens.DAI, // DAI
        addresses.tokens.USDT, // USDT
        addresses.tokens.USDC, // USDC
        addresses.tokens.MiMATIC, // MAI
        addresses.tokens.BTC, // BTC
        addresses.tokens.ETH, // WETH
      ]

      const factoryctr = await fetchContract(addresses.FACTORY, quickSwapFactoryAbi)

      
  
      const quoteToken = addresses.tokens.MATIC
      
    //   if (_token.toLowerCase() == quoteToken.toLowerCase()) {
    //       console.log("both token and quote token are the same")
    //       return 1
    //   }
  
      //work it
      const quoteTokenMap = WHITELIST.map( async (quoteToken) => {
          const pairAddress = await factoryctr.getPair(_token, quoteToken)
  
          if (pairAddress.toLowerCase() !== addresses.ZERO_ADDRESS.toLowerCase()) {
              const pairctr = await fetchContract(pairAddress, UniPairAbi)
              const token0 = await pairctr.token0()
              const token1 = await pairctr.token1()
  
    
              if (_token.toLowerCase() == token0.toLowerCase()) {
                const pairInfo = await fetchLPInfo(pairAddress)
                const token1To_tokenPrice = new BigNumber(pairInfo.token1.priceRatio)
                const MaticToToken1Price = await getUSDPriceRatio(token1)
                const derived = token1To_tokenPrice.multipliedBy(MaticToToken1Price)

                return {
                    ...pairInfo,
                    DerivedMaticPrice: derived.toPrecision()
                }

              }
              if (_token.toLowerCase() == token1.toLowerCase()){
                const pairInfo = await fetchLPInfo(pairAddress)

                const token0To_tokenPrice = new BigNumber(pairInfo.token0.priceRatio)
                const MaticToToken0Price = await getUSDPriceRatio(token0)
                const derived = token0To_tokenPrice.multipliedBy(MaticToToken0Price)
                    
                  // token0/_token * MATIC/token0 //derived rpice
         
                return {
                    ...pairInfo,
                    DerivedMaticPrice: derived.toPrecision()
                }

              }
          }
      })
  
  
      const raw = await Promise.all(quoteTokenMap)
      const data = raw.filter( (item) => {
          return item !== undefined
      })
  
      console.log("DARTA")
      console.log(data)
      return data
}

const fetchLPInfo = async (LPTokenAddress) => {
    const lpctr = await fetchContract(LPTokenAddress, UniPairAbi)
    

    const _token0 =  lpctr.token0()
    const _token1 =  lpctr.token1()
    const _reserves =  lpctr.getReserves()
    const _totalSupply = lpctr.totalSupply()

    const batch1 = [_token0, _token1, _reserves, _totalSupply]
    const [
        token0,
        token1,
        reserves,
        totalSupply
    ] = await Promise.all(batch1)

    const _token0ctr = await fetchContract(token0, ERC20Abi)
    const _token1ctr = await fetchContract(token1, ERC20Abi)

    const _token0Decimals =  _token0ctr.decimals()
    const _token0Symbol =  _token0ctr.symbol()

    const _token1Decimals =  _token1ctr.decimals()
    const _token1Symbol =  _token1ctr.symbol()

    const batch2 = [_token0Decimals, _token0Symbol, _token1Decimals, _token1Symbol]
    const [
        token0Decimals,
        token0Symbol,
        token1Decimals,
        token1Symbol

    ] = await Promise.all(batch2)



    const token0Reserves = ethers.utils.formatUnits(reserves._reserve0, token0Decimals)
    const token1Reserves = ethers.utils.formatUnits(reserves._reserve1, token1Decimals)
    const bnToken0Reserves = new BigNumber(token0Reserves)
    const bnToken1Reserves = new BigNumber(token1Reserves)

    const token0Price = bnToken0Reserves.div(bnToken1Reserves).toPrecision()
    const token1Price = bnToken1Reserves.div(bnToken0Reserves).toPrecision()
    const formattedTotalSupply = ethers.utils.formatUnits(totalSupply, 18)
    


    const data = {
        LPTotalSupply: formattedTotalSupply,
        token0: {
            address: token0,
            symbol: token0Symbol,
            reserves: token0Reserves,
            decimals: token0Decimals,
            priceRatio: token0Price,

        },
        token1: {
            address: token1,
            symbol: token1Symbol,
            reserves: token1Reserves,
            decimals: token1Decimals,
            priceRatio: token1Price,


        }
    }

    return data
}

const getUSDPriceRatio = async (_token) => {
    const DAI = addresses.tokens.DAI
    if (_token.toLowerCase() == DAI.toLowerCase()) {
        console.log("both token and quote token are the same")
        return 1
    }

    const factory = await fetchContract(addresses.FACTORY, quickSwapFactoryAbi)

    
    const pairAddress = await factory.getPair(_token, DAI)
    const lpctr = await fetchContract(pairAddress, UniPairAbi)
    const tokens = [_token, DAI]
    

    const _token0 =  lpctr.token0()
    const _token1 =  lpctr.token1()
    const _reserves =  lpctr.getReserves()

    const batch1 = [_token0, _token1, _reserves]
    const [
        token0,
        token1,
        reserves
    ] = await Promise.all(batch1)

    const _token0ctr = await fetchContract(token0, ERC20Abi)
    const _token1ctr = await fetchContract(token1, ERC20Abi)

    const _token0Decimals =  _token0ctr.decimals()
    const _token0Symbol =  _token0ctr.symbol()

    const _token1Decimals =  _token1ctr.decimals()
    const _token1Symbol =  _token1ctr.symbol()

    const batch2 = [_token0Decimals, _token0Symbol, _token1Decimals, _token1Symbol]
    const [
        token0Decimals,
        token0Symbol,
        token1Decimals,
        token1Symbol

    ] = await Promise.all(batch2)
    

    const token0Reserves = ethers.utils.formatUnits(reserves._reserve0, token0Decimals)
    const token1Reserves = ethers.utils.formatUnits(reserves._reserve1, token1Decimals)
    const bnToken0Reserves = new BigNumber(token0Reserves)
    const bnToken1Reserves = new BigNumber(token1Reserves)

    if (token0.toLowerCase() == _token.toLowerCase()) {
        const token1Price = bnToken1Reserves.div(bnToken0Reserves)
        return token1Price
    }
    if (token1.toLowerCase() == _token.toLowerCase()) {
        const token0Price = bnToken0Reserves.div(bnToken1Reserves)
        return token0Price
    }


}

const getAPY = async (_poolTVL, _tokenPerBlock) => {

    const reward = await fetchBestLP(addresses.tokens.COB) 
    const rwrd = reward.DerivedMaticPrice
    const TVL = new BigNumber(_poolTVL)
    const rewardPrice = new BigNumber(rwrd)
    const tokenPB = new BigNumber(_tokenPerBlock)
    const BPY = new BigNumber(15768000) //2s avg

    const rewardPerYear = rewardPrice.multipliedBy(tokenPB).multipliedBy(BPY)
    const APY = rewardPerYear.dividedBy(TVL).multipliedBy(100)
    return APY.toPrecision()
}



// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$ CORE $$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

const fetchLPData = async (_token) => {
    const POOL = pools.filter( (pool) => {
        return pool.tokenStakeAddress.toLowerCase() == _token.toLowerCase()
    }) //imported from ../utils/pools

    let _poolId;
    if (POOL[0] !== undefined) {
        _poolId = POOL[0].pid
    } else {
        _poolId = 1 //just return a ppol for calcs sake
    }

    const _rewardTokenPerBlock = POOL[0].cobPerBlock
    const pairctr = await fetchContract(_token, UniPairAbi)


    const pairInfo = await pairctr.totalSupply()
    const token0 = await pairctr.token0()
    const token1 = await pairctr.token1()


    const token0ctr = await fetchContract(token0, ERC20Abi)
    const token1ctr = await fetchContract(token1, ERC20Abi)

    const LPBalance0 = await token0ctr.balanceOf(_token)
    const LPBalance1 = await token1ctr.balanceOf(_token)

    const sym0 = await token0ctr.symbol()
    const dec0 = await token0ctr.decimals()

    const sym1 = await token1ctr.symbol()
    const dec1 = await token1ctr.decimals()

    const _symbol = `${sym0} - ${sym1}`


    const bestLP0 = await fetchBestLP(token0)
    const bestLP1 = await fetchBestLP(token1)
    const rawTVL = await pairctr.balanceOf(addresses.CHEF.masterChef)
    const poolTotalStaked = ethers.utils.formatUnits(rawTVL, 18)



    //incoming Math
    const formattedLPB0 = ethers.utils.formatUnits(LPBalance0, dec0)
    const formattedLPB1 = ethers.utils.formatUnits(LPBalance1, dec1)

    
    const totalSupply = ethers.utils.formatUnits(pairInfo, 18)


    //lpuseramounts
    const d = new BigNumber(formattedLPB0)
    const e = new BigNumber(formattedLPB1)

    //getmaticprices
    const rawPrice0 = bestLP0 ? bestLP0.DerivedMaticPrice : 0
    const rawPrice1 = bestLP1 ? bestLP1.DerivedMaticPrice : 0
    const maticPrice0 = rawPrice0 == undefined ? 1 : rawPrice0
    const maticPrice1 = rawPrice1 == undefined ? 1 : rawPrice1

    const f = new BigNumber(maticPrice0)
    const g = new BigNumber(maticPrice1)



    //pool tvl
    const j = new BigNumber(poolTotalStaked)
    const k = new BigNumber(totalSupply)
    const poolLPRatio = j.dividedBy(k).toPrecision()

    const l = new BigNumber(poolLPRatio)
    const poolAmount0 = l.multipliedBy(d).toPrecision()
    const poolAmount1 = l.multipliedBy(e).toPrecision()
    const m = new BigNumber(poolAmount0)
    const n = new BigNumber(poolAmount1)
    const poolValue0 = f.multipliedBy(m).toPrecision()
    const poolValue1 = g.multipliedBy(n).toPrecision()

    const o = new BigNumber(poolValue0)
    const p = new BigNumber(poolValue1)
    const poolTVL = o.plus(p).toPrecision()

    const APY = await getAPY(poolTVL, _rewardTokenPerBlock)

    const data = {
        POOL: {
            pid: _poolId,
            symbol: _symbol,
            poolStakedAmount: poolTotalStaked,
            poolTVL: poolTVL,
            APY: APY
        },

        LP: {
            totalSupply: totalSupply,
            token0: {
                balance: formattedLPB0,
                token: sym0,
                usdPrice0: maticPrice0,

            },
            token1: {
                balance: formattedLPB1,
                token: sym1,
                usdPrice1: maticPrice1,

            }

        }
    }

    return data

}

const fetchTokenData = async (_token) => {

    

    try {
        const POOL = pools.filter( (pool) => {
            return pool.tokenStakeAddress.toLowerCase() == _token.toLowerCase()
        }) //imported from ../utils/pools
        let _rewardTokenPerBlock;
        let _poolId;
        if (POOL[0] !== undefined) {
            _poolId = POOL[0].pid
            _rewardTokenPerBlock = POOL[0].cobPerBlock
        } else {
            _poolId = 1 //just return a ppol for calcs sake
            _rewardTokenPerBlock = 0
        }
        
        // Act I the token
        const tokenctr = await fetchContract(_token, ERC20Abi)
        const tokenPriceData = await fetchBestLP(_token)

        const decimals = await tokenctr.decimals()
        const symbol = await tokenctr.symbol()
        const totalSupply = await tokenctr.totalSupply()
        const formattedTotalSupply = ethers.utils.formatUnits(totalSupply, decimals)
        const rawTVL = await tokenctr.balanceOf(addresses.CHEF.masterChef)
        const poolTotalStaked = ethers.utils.formatUnits(rawTVL, decimals)



        let singleToken;
        console.log(tokenPriceData)
        if (tokenPriceData.token0.address.toLowerCase() == _token.toLowerCase()) {
            BigNumber.config({ EXPONENTIAL_AT: 10 })
            const maticPrice = tokenPriceData.DerivedMaticPrice
            const price = new BigNumber(maticPrice)
            singleToken = {
                address: tokenPriceData.token0.address,
                symbol: tokenPriceData.token0.symbol,
                decimals: tokenPriceData.token0.decimals,
                derivedUsdPrice: price.toPrecision(),
                totalSupply: formattedTotalSupply

            }
        } else if (tokenPriceData.token1.address.toLowerCase() == _token.toLowerCase()) {
            BigNumber.config({ EXPONENTIAL_AT: 10 })
            const maticPrice = tokenPriceData.DerivedMaticPrice
            const price = new BigNumber(maticPrice)
            singleToken = {
                address: tokenPriceData.token1.address,
                symbol: tokenPriceData.token1.symbol,
                decimals: tokenPriceData.token1.decimals,
                derivedUsdPrice: price.toPrecision(),
                totalSupply: formattedTotalSupply
            }
        }

        //act II masterchef cooks some nums

        //incoming Math lolz
        BigNumber.config({ EXPONENTIAL_AT: 10 })

            //token ratio
        const b = new BigNumber(formattedTotalSupply)

            //token value
        const d = new BigNumber(singleToken.derivedUsdPrice)


            //pool TVL in Matic
        const f = new BigNumber(poolTotalStaked)
        const g = f.multipliedBy(d)
        const _poolTVL = g.toPrecision()

        const APY = await getAPY(_poolTVL, _rewardTokenPerBlock)



        const data = {
            POOL: {
            pid: _poolId,
            symbol: singleToken.symbol,
            poolStakedAmount: poolTotalStaked,
            poolTVL: _poolTVL,
            APY: APY
            },
            Token: {
            ...singleToken
            }
        }

        return data 

    } catch (err) {
        console.log(err)
    }
    
    
}

const fetchAllPoolApyData = async () => {

    try {
        const poolAPYPromises = pools.map( (pool) => {
            if (pool.LP === true) {
                const call = fetchLPData(pool.tokenStakeAddress)
                return call
            }
            if (pool.LP !== true)  {
                const call = fetchTokenData(pool.tokenStakeAddress)
                return call
            }
        })
    
        const data = await Promise.all(poolAPYPromises)
       
        return data

        
    } catch (err) {
        console.log(err)
    }
    

}





module.exports = {
    fetchAllPoolApyData,
}

