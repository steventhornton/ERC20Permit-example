const { ethers } = require("hardhat");
const hre = require("hardhat");


function getTimestampInSeconds () {
    return Math.floor(Date.now() / 1000)
}

async function main() {

    // Chain ID. Needed for signing the message to ensure it can't be replayed on another chain
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Chain ID: ${chainId}`);
    console.log('');

    // deployer:
    //   - Deploy the contract
    //   - Will receieve initial supply of tokens
    // relayer:
    //   - Will execute the transaction on behalf of deployer
    // other
    //   - Will receieve the tokens from deployer
    const [deployer, relayer, other] = await ethers.getSigners();
    console.log('Addresses:');
    console.log(`  deployer address: ${deployer.address}`);
    console.log(`  relayer address: ${relayer.address}`);
    console.log(`  other address: ${other.address}`);
    console.log('');

    // Deploy the token contract
    const Token = await ethers.getContractFactory("Token");
    const tkn = await Token.connect(deployer).deploy(ethers.utils.parseEther("10"));
    await tkn.deployed();
    console.log(`Token deployed at ${tkn.address}`);
    console.log(`   symbol: ${await tkn.symbol()}`);
    console.log(`   name: ${await tkn.name()}`);
    console.log(`   decimals: ${await tkn.decimals()}`);
    console.log(`   totalSupply: ${await tkn.totalSupply()}`);
    console.log('');

    console.log("ETH Balances:");
    console.log(`  deployer: ${await ethers.provider.getBalance(deployer.address)}`);
    console.log(`  relayer: ${await ethers.provider.getBalance(relayer.address)}`);
    console.log(`  other: ${await ethers.provider.getBalance(other.address)}`);
    console.log('');

    console.log("Token Balances:");
    console.log(`  deployer: ${await tkn.balanceOf(deployer.address)}`);
    console.log(`  relayer: ${await tkn.balanceOf(relayer.address)}`);
    console.log(`  other: ${await tkn.balanceOf(other.address)}`);
    console.log('');
    
    // Input values

    // The amount of tokens that we want to transfer
    let value = ethers.utils.parseEther("1");
    
    // Unix timestamp deadline after which the approval will no longer be valid. Set here as 1 hour after the script is run.
    let deadline = getTimestampInSeconds() + 3600;

    // Required to ensure the approval can't be re-used.
    let nonces = await tkn.nonces(deployer.address);

    // Signature
    const domain = {
        name: await tkn.name(),
        version: "1",
        chainId: chainId,
        verifyingContract: tkn.address
    }

    const types = {
        Permit: [
            {name: "owner", type: "address"},
            {name: "spender", type: "address"},
            {name: "value", type: "uint256"},
            {name: "nonce", type: "uint256"},
            {name: "deadline", type: "uint256"},
        ]
    }

    const values = {
        owner: deployer.address,
        spender: other.address,
        value: value,
        nonce: nonces,
        deadline: deadline
    }
    
    // Sign the data as the deployer
    const signature = await deployer._signTypedData(domain, types, values);

    let sig = ethers.utils.splitSignature(signature);

    // Check that signature is correct. The recovered address should match the deployer address
    let recovered = ethers.utils.verifyTypedData(
        domain,
        types,
        values,
        sig
    )
    if (recovered == deployer.address) {
        console.log("Public address correctly recovered");
    } else {
        console.log("Something went wrong...");
    }
    console.log('');

    // Build a meta transaction
    console.log('Calling permit...');
    console.log('');
    let tx = await tkn.connect(relayer).permit(deployer.address, other.address, value, deadline, sig.v, sig.r, sig.s);

    // Check allowances
    console.log(`SET Token Allowance for other to spend from deployer: ${await tkn.allowance(deployer.address, other.address)}`);
    console.log('');

    // other can no call transferFrom
    tx = await tkn.connect(other).transferFrom(deployer.address, other.address, value);

    // Verfiy new balances:
    // - ETH balance of deployer shouldn't have changed since they didn't create any transactions
    // - ETH balance of relayer should have decreased as they created the permit transaction
    // - ETH balance of other should have decreased as they created the transferFrom transaction
    // - SET token balance of deployer should have decreased
    // - SET token balance of relayer should have increased by `value`
    console.log("ETH Balances:");
    console.log(`  deployer: ${await ethers.provider.getBalance(deployer.address)}`);
    console.log(`  relayer: ${await ethers.provider.getBalance(relayer.address)}`);
    console.log(`  other: ${await ethers.provider.getBalance(other.address)}`);
    console.log('');

    console.log("Token Balances:");
    console.log(`  deployer: ${await tkn.balanceOf(deployer.address)}`);
    console.log(`  relayer: ${await tkn.balanceOf(relayer.address)}`);
    console.log(`  other: ${await tkn.balanceOf(other.address)}`);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
