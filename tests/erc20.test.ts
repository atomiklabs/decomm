import { expect } from "chai";
import { artifacts, network, patract } from "redspot";


const { getContractFactory, getRandomSigner } = patract;

const { api, getAddresses, getSigners } = network;

describe("ERC20", () => {
  after(() => {
    return api.disconnect();
  });

  async function setup({
                         tokenName = 'Atomikoin',
                         tokenSymbol = 'ATK',
                         tokenInitialSupply = 1000
                       } = {}) {
    await api.isReady;
    const signerAddresses = await getAddresses();
    const Alice = signerAddresses[0];
    const sender = await getRandomSigner(Alice, "10000 UNIT");
    const contractFactory = await getContractFactory("erc20", sender.address);
    const contract = await contractFactory.deploy("new", tokenName, tokenSymbol, tokenInitialSupply);
    const abi = artifacts.readArtifact("erc20");
    const receiver = await getRandomSigner();

    return { sender, contractFactory, contract, abi, receiver, Alice };
  }

  async function setupLockdrop() {
    await api.isReady;
    const signerAddresses = await getAddresses();
    const Alice = signerAddresses[0];
    const sender = await getRandomSigner(Alice, "100000 UNIT");
    const contractFactoryLock = await getContractFactory("lock", sender.address);
    const contractFactory = await getContractFactory("lockdrop", sender.address);
    const contract = await contractFactory.deploy("new", contractFactoryLock.abi.project.source.wasmHash);
    const abi = artifacts.readArtifact("lockdrop");
    const receiver = await getRandomSigner();

    return { sender, contractFactory, contract, abi, receiver, Alice };
  }


// @ts-ignore
  async function setupTradingPair({
                         tokenA,
                         tokenB,
                         tokenInitialSupply = 1000
                       } = {}) {
    await api.isReady;
    const signerAddresses = await getAddresses();
    const Alice = signerAddresses[0];
    const sender = await getRandomSigner(Alice, "10000 UNIT");
    const contractFactory = await getContractFactory("trading_pair", sender.address);
    const contract = await contractFactory.deploy("new", tokenA, tokenB);
    const abi = artifacts.readArtifact("trading_pair");
    const receiver = await getRandomSigner();

    return { sender, contractFactory, contract, abi, receiver, Alice };
  }

  it("Assigns initial balance", async () => {
    const { contract, sender } = await setup();
    const result = await contract.query.balanceOf(sender.address);
    expect(result.output).to.equal(1000);
  });

  it("Transfer adds amount to destination account", async () => {
    const { contract, receiver } = await setup();

    await expect(() =>
      contract.tx.transfer(receiver.address, 7)
    ).to.changeTokenBalance(contract, receiver, 7);

    await expect(() =>
      contract.tx.transfer(receiver.address, 7)
    ).to.changeTokenBalances(contract, [contract.signer, receiver], [-7, 7]);
  });

  it("Transfer emits event", async () => {
    const { contract, sender, receiver } = await setup();

    await expect(contract.tx.transfer(receiver.address, 7))
      .to.emit(contract, "Transfer")
      .withArgs(sender.address, receiver.address, 7);
  });

  it("Can not transfer above the amount", async () => {
    const { contract, receiver } = await setup();

    await expect(contract.tx.transfer(receiver.address, 1007)).to.not.emit(
      contract,
      "Transfer"
    );
  });

  it("Can not transfer from empty account", async () => {
    const { contract, Alice, sender } = await setup();

    const emptyAccount = await getRandomSigner(Alice, "10 UNIT");

    await expect(
      contract.connect(emptyAccount).tx.transfer(sender.address, 7)
    ).to.not.emit(contract, "Transfer");
  });

  it("Assigns metadata", async () => {
    const tokenName = 'tko coin';
    const tokenSymbol = 'WATCH';
    const tokenInitialSupply = 12345;
    const { contract, sender } = await setup({ tokenName, tokenSymbol, tokenInitialSupply });

    const decimalsResult = await contract.query.decimals();
    expect(decimalsResult.output).to.equal(18);

    const symbolResult = await contract.query.symbol();
    expect(symbolResult.output?.toHuman()).to.equal(tokenSymbol);

    const nameResult = await contract.query.name();
    expect(nameResult.output?.toHuman()).to.equal(tokenName);

    const balanceOfResult = await contract.query.balanceOf(sender.address);
    expect(balanceOfResult.output).to.equal(tokenInitialSupply)
  });

  it("Trading pair", async () => {
    const tokenAParams = { tokenName: 'token a', tokenSymbol: 'TKA', tokenInitialSupply: 1234 };
    const tokenA = await setup(tokenAParams);

    const tokenBParams = { tokenName: 'token b', tokenSymbol: 'TKB', tokenInitialSupply: 9876 };
    const tokenB = await setup(tokenBParams);

    const tradingPair = await setupTradingPair({
      tokenA: tokenA.contract.address,
      tokenB: tokenB.contract.address,
    })

    const symbolResult = await tradingPair.contract.query.getInfo();
    const [tokenASymbol, tokenBSymbol] = symbolResult.output?.toHuman() as Array<String>;
    expect(tokenASymbol).to.equal(tokenAParams.tokenSymbol);
    expect(tokenBSymbol).to.equal(tokenBParams.tokenSymbol);
  });

  it.only("Lockdrop", async () => {
    const { contract: lockdropContract, Alice, sender } = await setupLockdrop();
    const gasLimit = 3000 * 1000000;
    const balanceResultsPre = await network.api.queryMulti([
      [api.query.system.account, sender.address],
      [api.query.system.account, lockdropContract.address.toHuman()],
    ]);

    console.log("Pre-balances:", balanceResultsPre.map(r => r.toHuman()));

    // fund LockDrop contract so it has the value to pass to the Lock after creating its instance
    // await api.tx.balances.transfer(lockdropContract.address.toHuman(), 39_000).signAndSend(sender.address);

    // const balanceResultsPost = await network.api.queryMulti([
    //   [api.query.system.account, sender.address],
    //   [api.query.system.account, lockdropContract.address.toHuman()],
    // ]);

    // console.log("Post-balances:", balanceResultsPost.map(r => r.toHuman()), { sender: sender.address, ld: lockdropContract.address.toHuman()});
    await lockdropContract.tx.lock({
      gasLimit: 1_000_000_000,
      value: 7,
    });



    //
    //
    // const balanceResultsPostLock = await network.api.queryMulti([
    //   [network.api.query.system.account, sender.address],
    //   [network.api.query.system.account, lockdropContract.address],
    // ]);
    //
    // console.log("Post-lock-balances:", balanceResultsPostLock.map(r => r.toHuman()));

  });
});
