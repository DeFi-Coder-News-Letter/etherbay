pragma solidity ^0.4.13;
import "./ERC20Token.sol";

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Mooncat {
        function giveCat(bytes5 catId, address to) public;
        function catOwners(bytes5 catId) constant returns (address catOwner);

}
contract MooncatListing is Ownable {
    struct Listing {
        address seller;
        uint256 price;
        uint256 dateStarts;
        uint256 dateEnds;
    }
    Mooncat public sourceContract;
    uint256 public ownerPercentage;
    mapping (bytes5 => Listing) public tokenIdToListing;

    string constant public VERSION = "1.0.0";
    event ListingCreated(bytes5 indexed tokenId, uint256 price, uint256 dateStarts, uint256 dateEnds, address indexed seller);
    event ListingCancelled(bytes5 indexed tokenId, uint256 dateCancelled);
    event ListingBought(bytes5 indexed tokenId, uint256 price, uint256 dateBought, address buyer);

    function MooncatListing(address targetContract, uint256 percentage) public {
        ownerPercentage = percentage;
        Mooncat contractPassed = Mooncat(targetContract);
        sourceContract = contractPassed;
    }

    function updateOwnerPercentage(uint256 percentage) external onlyOwner {
        ownerPercentage = percentage;
    }

    function withdrawBalance() onlyOwner external {
        assert(owner.send(this.balance));
    }
    function approveToken(address token, uint256 amount) onlyOwner external {
        assert(Token(token).approve(owner, amount));
    }

    function() external payable { }

    function createListing(bytes5 tokenId, uint256 price, uint256 dateEnds) external {
        require(price > 0);
        tokenIdToListing[tokenId] = Listing(msg.sender, price, now, dateEnds);
        ListingCreated(tokenId, price, now, dateEnds, msg.sender);
    }

    function getListing(bytes5 tokenId) external view returns (address seller, uint256 price, uint256 dateStarts, uint256 dateEnds) {
        Listing storage listing = tokenIdToListing[tokenId];
        return (listing.seller, listing.price, listing.dateStarts, listing.dateEnds);
    }

    function buyListing(bytes5 tokenId) external payable {
        Listing storage listing = tokenIdToListing[tokenId];
        require(msg.value == listing.price);
        require(now <= listing.dateEnds);
        address seller = listing.seller;
        uint256 currentPrice = listing.price;
        delete tokenIdToListing[tokenId];
        sourceContract.giveCat(tokenId, msg.sender);
        seller.transfer(currentPrice - (currentPrice * ownerPercentage / 10000));
        ListingBought(tokenId, listing.price, now, msg.sender);

    }

    function cancelListing(bytes5 tokenId) external {
        Listing storage listing = tokenIdToListing[tokenId];
        require(msg.sender == listing.seller || msg.sender == owner);
        sourceContract.giveCat(tokenId, listing.seller);
        delete tokenIdToListing[tokenId];
        ListingCancelled(tokenId, now);
    }
}


