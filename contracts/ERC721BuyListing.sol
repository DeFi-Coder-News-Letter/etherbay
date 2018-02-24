pragma solidity ^0.4.18;

import "./ERC721Draft.sol";
import "./ERC20Token.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract ERC721BuyListing is Ownable {
    struct Listing {
        address seller;
        uint256 price;
        uint256 dateStarts;
        uint256 dateEnds;
    }
    ERC721 public sourceContract;
    uint256 public ownerPercentage;
    mapping (uint256 => Listing) tokenIdToListing;

    string constant public version = "1.0.0";
    event ListingCreated(uint256 indexed tokenId, uint256 price, uint256 dateStarts, uint256 dateEnds, address indexed seller);
    event ListingCancelled(uint256 indexed tokenId, uint256 dateCancelled);
    event ListingBought(uint256 indexed tokenId, uint256 price, uint256 dateBought, address buyer);

    function ERC721BuyListing(address targetContract, uint256 percentage) public {
        ownerPercentage = percentage;
        ERC721 contractPassed = ERC721(targetContract);
        sourceContract = contractPassed;
    }
    function owns(address claimant, uint256 tokenId) internal view returns (bool) {
        return (sourceContract.ownerOf(tokenId) == claimant);
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

    function createListing(uint256 tokenId, uint256 price, uint256 dateEnds) external {
        require(owns(msg.sender, tokenId));
        require(price > 0);
        Listing memory listing = Listing(msg.sender, price, now, dateEnds);
        tokenIdToListing[tokenId] = listing;
        ListingCreated(tokenId, listing.price, now, dateEnds, listing.seller);
    }

    function buyListing(uint256 tokenId) external payable {
        Listing storage listing = tokenIdToListing[tokenId];
        require(msg.value == listing.price);
        require(now <= listing.dateEnds);
        address seller = listing.seller;
        uint256 currentPrice = listing.price;
        delete tokenIdToListing[tokenId];
        sourceContract.transferFrom(seller, msg.sender, tokenId);
        seller.transfer(currentPrice - (currentPrice * ownerPercentage / 10000));
        ListingBought(tokenId, listing.price, now, msg.sender);

    }

    function cancelListing(uint256 tokenId) external {
        Listing storage listing = tokenIdToListing[tokenId];
        require(msg.sender == listing.seller || msg.sender == owner);
        delete tokenIdToListing[tokenId];
        ListingCancelled(tokenId, now);
    }
}


