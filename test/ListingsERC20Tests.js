
var ListingsERC20 = artifacts.require("./efolio/ListingsERC20.sol");
var DemoCoin = artifacts.require("./efolio/DemoCoin.sol");
var DemoCoinNoDecimals = artifacts.require("./efolio/DemoCoinNoDecimals.sol");
const EthUnit = require('ethjs-unit');
const Eth = require('ethjs');
const eth = new Eth(new Eth.HttpProvider('http://localhost:8545'));
const BN = require('bn.js');
var BigNumber = require('bignumber.js');
var listingInstance;
let demoCoinInstance;
let listingAddress;
let demoCoinAddress;
let contractDecimals;
let demoCoinInstanceNoDecimals;
let demoCoinAddressNoDecimals;
let contractDecimalsNoDecimals;

const ETHEREUM_DECIMALS = 18;
contract('ListingsERC20Test', function (accounts) {
  beforeEach(async function () {
    listingInstance = await ListingsERC20.new(200);
    listingAddress = listingInstance.address;
    demoCoinInstance = await DemoCoin.new();
    demoCoinAddress = demoCoinInstance.address;
    let d = await demoCoinInstance.decimals.call();
    contractDecimals = d.toString();
    demoCoinInstanceNoDecimals = await DemoCoinNoDecimals.new();
    demoCoinAddressNoDecimals = demoCoinInstanceNoDecimals.address;
    let d2 = await demoCoinInstanceNoDecimals.decimals.call();
    contractDecimalsNoDecimals = d2.toString();
  });

  it("can create listing with matching hash and cancel it", async function () {
    const price = .011;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    const allowance = 100;
    const allowanceNew = convertBasedOnDecimals(allowance,contractDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowanceNew.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowanceNew.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    const listing = await listingInstance.listings.call(listingId);
    assert.equal(listing[0], accounts[0]);
    assert.equal(listing[1], demoCoinAddress);
    assert.equal(listing[2], priceWei.toString());
    assert.equal(listing[3], allowanceNew.toString());
    assert.equal(listing[5], dateValueForSolidity);
    await listingInstance.cancelListing(listingId);
    const listingCancelled = await listingInstance.listings.call(listingId);
    assert.equal(listingCancelled[0], "0x0000000000000000000000000000000000000000");
    assert.equal(listingCancelled[1], "0x0000000000000000000000000000000000000000");
    assert.equal(listingCancelled[2], "0");
    assert.equal(listingCancelled[3], "0");
    assert.equal(listingCancelled[5], "0");
  });
    it("cannot create listing if invalid balance", async function () {
    const price = .011;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    const allowance = 100;
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    try {
      await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[1] });
      assert.fail();
    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }
  });
  it("can create listing and buy from it decimals", async function () {
    const price = .1;//eth
    const salt = Date.now().valueOf() / 1000;
    const allowance = 1000;//tokens
    const allowanceConverted = convertBasedOnDecimals(allowance,contractDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress,EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowanceConverted.toString());

    await listingInstance.createListing(demoCoinAddress, EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    let seller_eth_balance_before = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_before = await eth.getBalance(accounts[1]);
    let contract_eth_balance_before = await eth.getBalance(listingAddress);
    let seller_token_balance_before = await demoCoinInstance.balanceOf(accounts[0]);
    let seller_token_balance_beforeBigNumber = new BigNumber(seller_token_balance_before);
    let buyer_token_balance_before = await demoCoinInstance.balanceOf(accounts[1]);
    let buyer_token_balance_beforeBigNumber = await new BigNumber(buyer_token_balance_before);
    let amount = .2;
    const amountConvertedBigNumber = convertBasedOnDecimals(amount,contractDecimals);
    const priceConvertedBigNumber = convertBasedOnDecimals(price,ETHEREUM_DECIMALS);
    const costWei = calculatePrice(amountConvertedBigNumber,contractDecimals,priceConvertedBigNumber);
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });

    let seller_eth_balance_after = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_after = await eth.getBalance(accounts[1]);
    let contract_eth_balance_after = await eth.getBalance(listingAddress);
    let seller_token_balance_after = await demoCoinInstance.balanceOf(accounts[0]);
    let buyer_token_balance_after = await demoCoinInstance.balanceOf(accounts[1]);
    let seller_token_balance_afterBigNumber = new BigNumber(seller_token_balance_after);
    let buyer_token_balance_afterBigNumber = new BigNumber(buyer_token_balance_after);

    //assert token transfer successful
    assert.equal(buyer_token_balance_afterBigNumber.toFixed(), buyer_token_balance_beforeBigNumber.plus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed());
    assert.equal(seller_token_balance_afterBigNumber.toFixed(), seller_token_balance_beforeBigNumber.minus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed() );
    //assert listing sold was updated
    let sold = await listingInstance.sold.call(listingId);
    assert.equal(sold, amountConvertedBigNumber.toFixed());

    //assert fee sent to contract
    let percentage = await listingInstance.ownerPercentage.call();
    let percentageBigNumber = new BigNumber(percentage);
    let cut = costWei.times(percentage).dividedBy(10000);
    assert.equal(new BN(contract_eth_balance_after).toString(), cut.toFixed());
    let costConverted = new BN(costWei.toFixed());
    //assert seller received correct eth
    assert.equal(new BN(seller_eth_balance_after).toString(), costConverted.sub(new BN(cut.toFixed())).add(seller_eth_balance_before).toString());
    //buy some more and check that sold was updated
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value: costWei.toFixed() });
    sold = await listingInstance.sold.call(listingId);
    assert.equal(sold, amountConvertedBigNumber.times(2).toFixed() );


  });
  it("can change percentage of cut to zero", async function () {
    const price = .1;//eth
    const salt = Date.now().valueOf() / 1000;
    const allowance = 1000;//tokens
    const allowanceConverted = convertBasedOnDecimals(allowance,contractDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress,EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowanceConverted.toString());

    await listingInstance.createListing(demoCoinAddress, EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await listingInstance.updateOwnerPercentage(0, { from: accounts[0] });

    let seller_eth_balance_before = await eth.getBalance(accounts[0]);
    let amount = .2;
    const amountConvertedBigNumber = convertBasedOnDecimals(amount,contractDecimals);
    const priceConvertedBigNumber = convertBasedOnDecimals(price,ETHEREUM_DECIMALS);
    const costWei = calculatePrice(amountConvertedBigNumber,contractDecimals,priceConvertedBigNumber);
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });

    let seller_eth_balance_after = await eth.getBalance(accounts[0]);

    let costConverted = new BN(costWei.toFixed());
    //assert seller received correct eth and no cut was taken
    assert.equal(new BN(seller_eth_balance_after).toString(), costConverted.add(seller_eth_balance_before).toString());


  });
  it("can create listing and buy from it no decimals", async function () {
    const price = 1;//eth
    const salt = Date.now().valueOf() / 1000;
    const allowance = 1000;//tokens
    const allowanceConverted = convertBasedOnDecimals(allowance,contractDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress,EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowanceConverted.toString());

    await listingInstance.createListing(demoCoinAddress, EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    let seller_eth_balance_before = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_before = await eth.getBalance(accounts[1]);
    let contract_eth_balance_before = await eth.getBalance(listingAddress);
    let seller_token_balance_before = await demoCoinInstance.balanceOf(accounts[0]);
    let seller_token_balance_beforeBigNumber = new BigNumber(seller_token_balance_before);
    let buyer_token_balance_before = await demoCoinInstance.balanceOf(accounts[1]);
    let buyer_token_balance_beforeBigNumber = await new BigNumber(buyer_token_balance_before);
    let amount = 1;
    const amountConvertedBigNumber = convertBasedOnDecimals(amount,contractDecimals);
    const priceConvertedBigNumber = convertBasedOnDecimals(price,ETHEREUM_DECIMALS);
    const costWei = calculatePrice(amountConvertedBigNumber,contractDecimals,priceConvertedBigNumber);
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });

    let seller_eth_balance_after = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_after = await eth.getBalance(accounts[1]);
    let contract_eth_balance_after = await eth.getBalance(listingAddress);
    let seller_token_balance_after = await demoCoinInstance.balanceOf(accounts[0]);
    let buyer_token_balance_after = await demoCoinInstance.balanceOf(accounts[1]);
    let seller_token_balance_afterBigNumber = new BigNumber(seller_token_balance_after);
    let buyer_token_balance_afterBigNumber = new BigNumber(buyer_token_balance_after);

    //assert token transfer successful
    assert.equal(buyer_token_balance_afterBigNumber.toFixed(), buyer_token_balance_beforeBigNumber.plus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed());
    assert.equal(seller_token_balance_afterBigNumber.toFixed(), seller_token_balance_beforeBigNumber.minus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed() );
    //assert listing sold was updated
    let sold = await listingInstance.sold.call(listingId);
    assert.equal(sold, amountConvertedBigNumber.toFixed());

    //assert fee sent to contract
    let percentage = await listingInstance.ownerPercentage.call();
    let percentageBigNumber = new BigNumber(percentage);
    let cut = costWei.times(percentage).dividedBy(10000);
    assert.equal(new BN(contract_eth_balance_after).toString(), cut.toFixed());
    let costConverted = new BN(costWei.toFixed());
    //assert seller received correct eth
    assert.equal(new BN(seller_eth_balance_after).toString(), costConverted.sub(new BN(cut.toFixed())).add(seller_eth_balance_before).toString());
    //buy some more and check that sold was updated
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value: costWei.toFixed() });
    sold = await listingInstance.sold.call(listingId);
    assert.equal(sold, amountConvertedBigNumber.times(2).toFixed() );


  });
  it("can create and buy listing from token with no decimals", async function () {
    const price = .0001;//eth
    const salt = Date.now().valueOf() / 1000;
    const allowance = 10;//tokens
    const allowanceConverted = convertBasedOnDecimals(allowance,contractDecimalsNoDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddressNoDecimals,EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstanceNoDecimals.approve(listingAddress, allowanceConverted.toString());

    await listingInstance.createListing(demoCoinAddressNoDecimals, EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    let seller_eth_balance_before = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_before = await eth.getBalance(accounts[1]);
    let contract_eth_balance_before = await eth.getBalance(listingAddress);
    let seller_token_balance_before = await demoCoinInstanceNoDecimals.balanceOf(accounts[0]);
    let seller_token_balance_beforeBigNumber = new BigNumber(seller_token_balance_before);
    let buyer_token_balance_before = await demoCoinInstanceNoDecimals.balanceOf(accounts[1]);
    let buyer_token_balance_beforeBigNumber = await new BigNumber(buyer_token_balance_before);
    let amount = 1;
    const amountConvertedBigNumber = convertBasedOnDecimals(amount,contractDecimalsNoDecimals);
    const priceConvertedBigNumber = convertBasedOnDecimals(price,ETHEREUM_DECIMALS);

    const costWei = calculatePrice(amountConvertedBigNumber,contractDecimalsNoDecimals,priceConvertedBigNumber);
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });

    let seller_eth_balance_after = await eth.getBalance(accounts[0]);
    let buyer_eth_balance_after = await eth.getBalance(accounts[1]);
    let contract_eth_balance_after = await eth.getBalance(listingAddress);
    let seller_token_balance_after = await demoCoinInstanceNoDecimals.balanceOf(accounts[0]);
    let buyer_token_balance_after = await demoCoinInstanceNoDecimals.balanceOf(accounts[1]);
    let seller_token_balance_afterBigNumber = new BigNumber(seller_token_balance_after);
    let buyer_token_balance_afterBigNumber = new BigNumber(buyer_token_balance_after);

    //assert token transfer successful
    assert.equal(buyer_token_balance_afterBigNumber.toFixed(), buyer_token_balance_beforeBigNumber.plus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed());
    assert.equal(seller_token_balance_afterBigNumber.toFixed(), seller_token_balance_beforeBigNumber.minus(new BigNumber(amountConvertedBigNumber.toFixed())).toFixed() );
    //assert listing sold was updated
    let sold = await listingInstance.sold.call(listingId);
    assert.equal(sold, amountConvertedBigNumber.toFixed());


  });

  it("cannot buy from listing if asking for more than available", async function () {
    const price = .011;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    const allowance = 100;
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowance);

    await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    let amount = 101;
    let cost = priceWei.mul(new BN(amount));

    try {
      await listingInstance.buyListing(listingId, amount, { from: accounts[1], value: cost.toString() });
      assert.fail();

    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }



  });
  it("cannot buy from listing if already sold", async function () {
    const price = .1;//eth
    const salt = Date.now().valueOf() / 1000;
    const allowance = 10;//tokens
    const allowanceConverted = convertBasedOnDecimals(allowance,contractDecimals);
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress,EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowanceConverted.toString());

    await listingInstance.createListing(demoCoinAddress, EthUnit.toWei(price,'ether').toString(), allowanceConverted.toString(), dateValueForSolidity, salt, { from: accounts[0] });
    let amount = 7;
    const amountConvertedBigNumber = convertBasedOnDecimals(amount,contractDecimals);
    const priceConvertedBigNumber = convertBasedOnDecimals(price,ETHEREUM_DECIMALS);
    const costWei = calculatePrice(amountConvertedBigNumber,contractDecimals,priceConvertedBigNumber);
    await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });

    try {
      await listingInstance.buyListing(listingId, amountConvertedBigNumber.toFixed(), { from: accounts[1], value:costWei.toFixed()  });
      assert.fail();
    } catch (exception) {
      assert.isAbove(exception.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }
    

  });
  it("cannot buy from listing if expired", async function () {
    const price = .011;
    const allowance = 10;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() - 100);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowance);

    await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    let amount = 10;
    let cost = priceWei.mul(new BN(amount));
    //should fail
    try {
      await listingInstance.buyListing(listingId, amount, { from: accounts[1], value: cost.toString() });
      assert.fail();

    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }



  });
  it("cannot buy from listing if invalid token balance", async function () {
    const price = .011;
    const allowance = 10;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowance);

    await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
   
    //transfer token balance to account 2
    let seller_token_balance = await demoCoinInstance.balanceOf(accounts[0]);
    await demoCoinInstance.transfer(accounts[2],seller_token_balance, { from: accounts[0] });
    seller_token_balance = await demoCoinInstance.balanceOf(accounts[0]);
    let amount = 10;
    let cost = priceWei.mul(new BN(amount));


    // should fail
    try {
      await listingInstance.buyListing(listingId, amount, { from: accounts[1], value: cost.toString() });
      assert.fail();

    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }



  });
  it("cannot buy from listing if invalid sale amount", async function () {
    const price = .011;
    const allowance = 10;
    const priceWei = EthUnit.toWei(price, 'ether');
    const salt = Date.now().valueOf() / 1000;
    let dateEnds = new Date(Date.now());
    dateEnds = dateEnds.setDate(dateEnds.getDate() + 30);
    let dateValueForSolidity = Math.floor(dateEnds.valueOf() / 1000);
    const listingId = await listingInstance.getHash(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
    await demoCoinInstance.approve(listingAddress, allowance);

    await listingInstance.createListing(demoCoinAddress, priceWei.toString(), allowance, dateValueForSolidity, salt, { from: accounts[0] });
   
    let amount = 10;
    let cost = priceWei.mul(new BN(amount));
    cost = cost.add(new BN(100));

    // should fail
    try {
      await listingInstance.buyListing(listingId, amount, { from: accounts[1], value: cost.toString() });
      assert.fail();

    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }



  });

  it('should have an owner', async function () {
    let owner = await listingInstance.owner();
    assert.isTrue(owner !== 0);
  });

  it('changes owner after transfer', async function () {
    let other = accounts[1];
    await listingInstance.transferOwnership(other);
    let owner = await listingInstance.owner();

    assert.isTrue(owner === other);
  });

  it('should prevent non-owners from transfering', async function () {
    const other = accounts[2];
    const owner = await listingInstance.owner.call();
    assert.isTrue(owner !== other);
    try {
      await listingInstance.transferOwnership(other, { from: other });
      assert.fail('should have thrown before');
    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');
    }
  });

  it('should guard ownership against stuck state', async function () {
    let originalOwner = await listingInstance.owner();
    try {
      await listingInstance.transferOwnership(null, { from: originalOwner });
      assert.fail();
    } catch (error) {
      assert.isAbove(error.message.search('invalid opcode'), -1, 'Invalid opcode error must be returned');

    }
  });

  function convertBasedOnDecimals(amount,decimals) {
    let quantity = new BigNumber(amount.toString());
    if (decimals == 0) {
      return quantity;  
    }

    let base10 = new BigNumber(10);
    let factor = base10.exponentiatedBy(+decimals);
    let newQuantity = quantity.times(factor);
    return newQuantity;
    //return new BN(newQuantity.toFixed());
  }
  function calculatePrice(amountConvertedBigNumber,decimals, priceConvertedBigNumber) {

    if (decimals == 0) {
      return priceConvertedBigNumber.times(amountConvertedBigNumber);  
    }
    let base10 = new BigNumber(10);
    let factor = base10.exponentiatedBy(+decimals);
    return priceConvertedBigNumber.times(amountConvertedBigNumber).dividedBy(factor);
  }

});


