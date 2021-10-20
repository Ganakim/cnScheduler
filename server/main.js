import { Meteor } from 'meteor/meteor'

import '/lib/collections'

Meteor.startup(()=>{
  const { exec } = require("child_process")
  exec('chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\selenum\ChromeProfile"', (err, res)=>{
    if(err){
      console.log(err)
    }else{
      console.log(res)
    }
  })
})

Meteor.methods({
  async ScheduleWeek(week){

    const {Browser, Builder, By, Key, until} = require('selenium-webdriver')
    const {Options, ServiceBuilder} = require('selenium-webdriver/chrome')

    let options = new Options()
    // options.addArguments("--headless")
    // options.addArguments("--disable-gpu")
    // options.addArguments("--no-sandbox")
    options.options_["debuggerAddress"] = '127.0.0.1:9222';
    let browser = new Builder().forBrowser(Browser.CHROME, '92').setChromeOptions(options).build()
    browser.get('dojo.code.ninja')
  }
})