pragma solidity 0.4.18;
import "zeppelin-solidity/contracts/token/StandardToken.sol";

contract DemoCoinNoDecimals is StandardToken {

    uint8 constant public decimals = 0;
    uint public totalSupply = 50000000; 
    string constant public NAME = "Demo Coin";
    string constant public SYMBOL = "DEMO";
    function DemoCoinNoDecimals() public {
        balances[msg.sender] = totalSupply;
    }
}