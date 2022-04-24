const express = require("express");
const mongoose = require("mongoose")
const ethers = require("ethers");
const cron = require('node-cron');

const { writeAllPoolData, readLatestPoolData } = require("./db/apy");


//init app
const app = express()

//db
const URI = process.env.MONGODB_URI
mongoose.connect(URI)
const db = mongoose.connection


db.once( 'open', () => {
    console.log("Connected to Remote Database")
})


//cron task


const task = cron.schedule('*/1 * * * *', async () => {
    await writeAllPoolData()
    console.log("")
    const entry = await readLatestPoolData()
    console.log(entry)
})
task.start()