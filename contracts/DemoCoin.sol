pragma solidity 0.4.18;
import "zeppelin-solidity/contracts/token/StandardToken.sol";

contract DemoCoin is StandardToken {

    uint8 constant public decimals = 18;
    uint public totalSupply = 50000000 * 10**18; 
    string constant public NAME = "Demo Coin";
    string constant public SYMBOL = "DEMO";
    function DemoCoin() public {
        balances[msg.sender] = totalSupply;
    }
}